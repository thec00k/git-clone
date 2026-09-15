"""Independent cabin, authored in measured web metres. Never writes source rooms."""
import bpy, bmesh, math, os, json, random
import numpy as np
from mathutils import Vector, Matrix, noise
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'public/room/snowy-mountain');os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/room/woodland/woodland.glb'))
random.seed(921)
def xyz(p):return (p[0],-p[2],p[1])
def mat(name,color,rough=.8,metal=0,emission=0):
    m=bpy.data.materials.new('Cabin | '+name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    for k,v in {'Base Color':(*color,1),'Roughness':rough,'Metallic':metal,'Emission Color':(*color,1),'Emission Strength':emission}.items():p.inputs[k].default_value=v
    return m
wood=mat('honey cedar',(.30,.135,.057));dark=mat('smoked timber',(.105,.049,.025))
iron=mat('blackened iron',(.025,.032,.035),.42,.65);brass=mat('antique bronze',(.37,.21,.065),.38,.72)
stone=[mat('granite '+str(i),c) for i,c in enumerate([(.26,.265,.25),(.34,.32,.28),(.22,.25,.265),(.40,.375,.32)])]
snow=mat('alpine snow',(.78,.87,.94));rock=mat('slate escarpment',(.13,.20,.24));pine=mat('winter spruce',(.042,.105,.082))
cream=mat('ivory wool',(.72,.68,.59),.98);charcoal=mat('charcoal wool',(.14,.16,.16),.98)
glass=mat('lantern glass',(.75,.82,.81),.13)
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=.16;glass.surface_render_method='DITHERED'
ember=mat('ember',(.9,.12,.012),.65,emission=2)
exec(open(os.path.join(os.path.dirname(__file__),'geometry.py')).read())

# Embedded, original directional textures. These export with the GLB; no Blender-only nodes.
def texture(m,name,kind):
    n=512;y,x=np.mgrid[0:n,0:n]/n;rng=np.random.default_rng(41)
    if kind=='wood':
        grain=.5+.15*np.sin(y*530+8*np.sin(x*12)+3*np.sin(x*41))+.08*np.sin(y*1710+8*np.sin(x*9))
        grain+=rng.normal(0,.022,(n,n));base=np.array([.57,.32,.16]);rgb=np.clip(base[None,None,:]*(.73+grain[:,:,None]*.48),0,1)
    else:
        warp=y+.025*np.sin(x*29)+.014*np.sin(y*19+x*24)
        marble=np.sin(x*19+4*np.sin(warp*11))+np.sin(warp*24+3*np.cos(x*14))*.5
        darkfield=np.clip((marble-.18)*1.5,0,.8)
        strands=.10*np.sin(x*1900+14*np.sin(warp*25)+4*np.sin(warp*170))+.07*np.sin(x*3500+warp*115)
        shade=np.clip(.88-darkfield*.65+strands+rng.normal(0,.025,(n,n)),.12,1)
        rgb=np.stack([shade,shade*.98,shade*.93],axis=2)
    img=bpy.data.images.new(name,n,n,alpha=True);rgba=np.concatenate([rgb,np.ones((n,n,1))],axis=2).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel());img.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
texture(wood,'Cedar grain', 'wood')
fur_image=bpy.data.images.load(os.path.join(ROOT,'art/snowy-mountain/marbled-fur.png'));fur_image.scale(1024,1024);fur_image.pack()
fur_node=cream.node_tree.nodes.new('ShaderNodeTexImage');fur_node.image=fur_image
cream.node_tree.links.new(fur_node.outputs['Color'],cream.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
# Small embedded mineral detail maps, unique tint for each granite course.
for i,m in enumerate(stone):
    n=256;yy,xx=np.mgrid[0:n,0:n]/n;rng=np.random.default_rng(61+i)
    freq=np.fft.fftfreq(n);fx,fy=np.meshgrid(freq,freq)
    field=np.fft.ifft2(np.fft.fft2(rng.normal(0,1,(n,n)))/(np.sqrt(fx*fx+fy*fy)+.02)**1.25).real
    grain=.93+field/field.std()*.12+rng.normal(0,.035,(n,n))
    base=np.array([.44+i*.024,.44+i*.020,.42+i*.017]);rgb=np.clip(base[None,None,:]*grain[:,:,None],0,1)
    img=bpy.data.images.new('Granite '+str(i),n,n,alpha=True);img.pixels.foreach_set(np.concatenate([rgb,np.ones((n,n,1))],axis=2).astype(np.float32).ravel());img.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
cream.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=.6

# Original names and all interaction roots survive in this independent imported copy.
remove=('Room_Wall_B_','Win_','Chair_','Cozy_Chair','Cozy_Cushion','Lamp_','Semantic_Curtain','Semantic_Rug','Semantic_WallDecor_','Woodland_Static','Woodland_Botanical','Cabinet_Flowers','Fern_Stems','Finish_Wood','Cozy_Woodland')
for o in list(bpy.data.objects):
    if o.type!='MESH':continue
    if o.name.startswith(remove) or o.name in ['Room_Ceiling','Outside_View']:
        bpy.data.objects.remove(o,do_unlink=True);continue
    if o.name.startswith(('Room_Wall','Trim_')):finish(o,dark)
    elif o.name.startswith(('Desk_','Archive_','Shelf_','Door_','Cozy_Guest')):finish(o,brass if any(s in o.name for s in ['Handle','Knob','Inlay']) else wood)
    elif o.name=='Beanbag':finish(o,charcoal)
    elif o.name=='Finish_Folded_Throw':finish(o,cream)

# UVs run along a board's longest edge, preserving believable grain direction.
def uv(o,axes=(0,2),scale=(1,1)):
    layer=o.data.uv_layers.new(name='Cabin UV')
    for p in o.data.polygons:
        for l in p.loop_indices:
            v=o.data.vertices[o.data.loops[l].vertex_index].co
            layer.data[l].uv=(v[axes[0]]*scale[0],v[axes[1]]*scale[1])
def board(name,p,s,m=wood,bevel=.014):
    if name=='Cabin_Logs':
        # Round horizontal timbers, with the grain running along their length.
        axis=0 if s[0]>s[2] else 2;cross=2 if axis==0 else 0
        verts=[];segments=16
        for end in [-1,1]:
            for i in range(segments):
                a=i*math.tau/segments;q=list(p)
                q[axis]+=end*s[axis]/2;q[1]+=.095*math.sin(a);q[cross]+=.084*math.cos(a)
                verts.append(q)
        faces=[tuple(reversed(range(segments))),tuple(range(segments,segments*2))]+[(i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments)]
        o=mesh(name,verts,faces,m);uv(o,(0,2) if axis==0 else (1,2),(.8,1.8))
        for face in o.data.polygons:face.use_smooth=len(face.vertices)==4
        backing=list(p);backing[cross]+=.070*(1 if p[cross]>0 else -1)
        size=list(s);size[1]=.196;size[cross]=.04
        box('Cabin_Chinking',backing,size,dark)
        return o
    o=box(name,p,s,m,bevel=bevel);uv(o,(0,2) if s[0]>s[2] else (1,2),(.8,1.8))
    if m in stone and name!='Cabin_Hearth':
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=2,use_grid_fill=True)
        for v in bm.verts:
            q=v.co;n=noise.noise_vector(q*37);v.co+=n*.009
        bm.to_mesh(o.data);bm.free()
        # Project each face onto its own plane so the granite never stretches into stripes.
        o.data.update();layer=o.data.uv_layers.active
        for face in o.data.polygons:
            axis=max(range(3),key=lambda k:abs(face.normal[k]));axes=[k for k in range(3) if k!=axis]
            for l in face.loop_indices:
                v=o.data.vertices[o.data.loops[l].vertex_index].co;layer.data[l].uv=(v[axes[0]]*2.4,v[axes[1]]*2.4)
    return o
for i in range(16):
    y=.105+i*.196
    for x in [-2.52,2.52]:board('Cabin_Logs',(x,y,0),(.16,.19,4.26))
    # Keep the entry door aperture intact.
    for a,b in [(-2.50,-.39),(.69,2.5)]:board('Cabin_Logs',((a+b)/2,y,2.14),(b-a,.19,.13))
    if y>2.26:board('Cabin_Logs',(.15,y,2.14),(1.06,.19,.13))

# Square lower opening, 1.90 x 1.90, with a triangular transom under a pitched roof.
cx=-.15;left=-1.10;right=.80;bottom=1.138;top=3.038;peak=3.69;wall=-2.155
for i in range(19):
    y=.103+i*.196
    if y<bottom-.04:board('Cabin_Logs',(0,y,wall),(5,.19,.13))
    else:
        half=.95 if y-.10<=top else max(0,.95*(peak-(y-.10))/(peak-top))
        if half>0:
            for a,b in [(-2.5,cx-half-.025),(cx+half+.025,2.5)]:board('Cabin_Logs',((a+b)/2,y,wall),(b-a,.19,.13))
        else:board('Cabin_Logs',(0,y,wall),(5,.19,.13))
window=bpy.data.objects['ks_window']
for name,p,s in [('Left',(left-.037,(top+bottom)/2,-2.10),(.075,top-bottom+.10,.16)),('Right',(right+.037,(top+bottom)/2,-2.10),(.075,top-bottom+.10,.16)),('Transom',(cx,top,-2.10),(2.05,.075,.16)),('Bottom',(cx,bottom-.032,-2.10),(2.05,.064,.16)),('Center',(cx,(top+bottom)/2,-2.15),(.025,top-bottom,.065))]:
    o=board('Cabin_Window_'+name,p,s,dark,.008);w=o.matrix_world.copy();o.parent=window;o.matrix_world=w
tube('Cabin_Window_Triangle',[(left-.035,top,-2.1),(cx,peak,-2.1),(right+.035,top,-2.1)],.041,dark,window)
tube('Cabin_Window_Upper_Mullion',[(cx,top,-2.15),(cx,peak-.045,-2.15)],.015,iron,window)
crossbar=board('Cabin_Window_Crossbar',(cx,(top+bottom)/2,-2.15),(right-left,.033,.065),dark,.004)
bpy.context.view_layer.update();crossbar.parent=window;crossbar.matrix_world=Matrix.Identity(4)
# Exact triangular infill hides the stepped ends of the log courses.
for side in [-1,1]:
    x=cx+side*1.03
    mesh('Cabin_Gable_Infill',[(x,top-.07,-2.16),(x,peak+.08,-2.16),(cx,peak+.08,-2.16),(cx,peak-.045,-2.16)],[(0,1,2,3)],wood)
mesh('Cabin_Window_Gable_Cap',[(x,y,-2.19) for x,y in [(-2.55,3.0),(left-.025,3.0),(cx,peak+.04),(right+.025,3.0),(2.55,3.0),(2.55,3.22),(0,3.96),(-2.55,3.22)]],[tuple(range(8))],wood)
board('Win_Sill',(cx,1.11,-2.07),(2.12,.056,.20),wood,.009)
# Thin inward-facing reveal follows both shapes, entirely behind the sill objects.
outline=[(left,bottom),(right,bottom),(right,top),(cx,peak),(left,top)]
v=[(x,y,z) for z in [-2.18,-2.40] for x,y in outline];n=len(outline)
mesh('Cabin_Window_Reveal',v,[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],dark,window)

# Pitched timber ceiling and rafters. No beam crosses the fan blades.
for side in [-1,1]:
    # Continuous roof sheathing keeps daylight out of the decorative plank joints.
    verts=[(0,3.94,-2.24),(side*2.57,3.94-2.57*.27,-2.24),(side*2.57,3.94-2.57*.27,2.24),(0,3.94,2.24)]
    mesh('Cabin_Roof_Sheathing',verts,[(0,1,2,3) if side>0 else (3,2,1,0)],dark)
    for i in range(14):
        x=side*(i+.5)*2.55/14;y=3.90-abs(x)*.27
        o=board('Cabin_Ceiling_Planks',(x,y,0),(2.55/14-.004,.07,4.42),wood,.004)
        t=Matrix.Translation(xyz((x,y,0)));o.matrix_world=t@Matrix.Rotation(side*.264,4,'Y')@t.inverted()
    for z in [-1.94,1.95]:tube('Cabin_Window_Rafters' if z<0 else 'Cabin_Rafters',[(side*2.49,3.17,z),(0,3.84,z)],.065,dark)
tube('Cabin_Ridge',[(0,3.85,-2.14),(0,3.85,2.14)],.075,dark)
tube('Cabin_Fan_Downrod',[(0,3.84,0),(0,3.10,0)],.013,iron)
# Close the taller front gable without touching the door.
mesh('Cabin_Front_Gable',[(-2.5,3.15,2.15),(2.5,3.15,2.15),(0,3.88,2.15)],[(0,1,2)],wood)

# Stacked stone corner quoins: uneven sizes, recessed mortar and rounded chips.
for x in [-2.39,2.39]:
    for z in [-2.02,2.02]:
        for row in range(19):
            y=.086+row*.165
            board('Cabin_Corner_Stone',(x,y,z),(.22+random.random()*.045,.153,.23+random.random()*.05),stone[(row+int(x>0))%4],.018)

# Small fireplace on the right of the map as viewed facing the left wall (negative Z).
# Map ends at Z=-.8725. Hearth ends at Z=-.995, leaving 12 cm of lateral clearance.
fx,fz=-2.29,-1.43
board('Cabin_Hearth',(fx,.062,fz),(.45,.124,.86),stone[0],.022)
board('Cabin_Fire_Back',(-2.415,.49,fz),(.065,.77,.72),iron,.006)
for row in range(5):
    for z in [fz-.34,fz+.34]:board('Cabin_Fire_Stone',(fx,.20+row*.148,z),(.35,.137,.155),stone[row%4],.016)
for row in range(3):
    for j in range(4):board('Cabin_Fire_Stone',(fx,.94+row*.143,fz-.30+j*.20),(.35,.134,.19),stone[(j+row)%4],.014)
board('Cabin_Mantel',(fx,1.34,fz),(.43,.08,.84),dark,.018)
board('Cabin_Chimney_Mortar',(-2.475,2.25,fz),(.09,1.86,.47),dark,.008)
for row in range(10):
    for j in range(2):board('Cabin_Chimney_Stone',(-2.38,1.46+row*.166,fz-.11+j*.22),(.20,.157,.21),stone[(j+row)%4],.015)
for z in [fz-.258,fz+.258]:board('Cabin_Fire_Iron',(-2.09,.53,z),(.026,.68,.025),iron,.003)
for y in [.195,.865]:board('Cabin_Fire_Iron',(-2.09,y,fz),(.026,.027,.54),iron,.003)
for i in range(5):
    z=fz-.20+i*.1;tube('Cabin_Fire_Logs',[(-2.38,.23,z-.05),(-2.11,.26,z+.065)],.042,dark)
for i in range(16):
    board('Cabin_Coals',(-2.20+random.uniform(-.13,.10),.205,fz+random.uniform(-.23,.23)),(.026,.013,.02),ember,.004)

# Move the complete fireplace to the door wall, facing into the room (-Z).
bpy.context.view_layer.update()
fire_transform=Matrix.Translation(xyz((-.91,0,1.91)))@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation(xyz((fx,0,fz))).inverted()
for o in bpy.data.objects:
    if o.name.startswith(('Cabin_Hearth','Cabin_Fire_','Cabin_Mantel','Cabin_Chimney_','Cabin_Coals')):o.matrix_world=fire_transform@o.matrix_world

# Original lamp pivot retained. Lantern contacts the desktop at Y=.75.
lamp=bpy.data.objects['ks_lamp'];lx,lz=-.9,-1.87
cone('Lamp_Base',(lx,.767,lz),.064,.034,iron,.057,lamp,32)
cone('Lamp_Crown',(lx,1.075,lz),.067,.055,iron,.036,lamp,32)
cone('Lamp_Chimney',(lx,1.116,lz),.025,.035,brass,.025,lamp,24)
cone('Lamp_Glass',(lx,.922,lz),.052,.267,glass,.052,lamp,32)
for a in [math.pi/4+i*math.pi/2 for i in range(4)]:
    tube('Lamp_Cage',[(lx+.057*math.cos(a),.78,lz+.057*math.sin(a)),(lx+.057*math.cos(a),1.05,lz+.057*math.sin(a))],.004,brass,lamp)
tube('Lamp_Handle',[(lx+.075*math.cos(a*math.pi/24),1.09+.115*math.sin(a*math.pi/24),lz) for a in range(25)],.004,iron,lamp)
bulb=bpy.data.objects['ks_lamp_bulb'];bulb.location+=Vector(xyz((0,-.09,0)));finish(bulb,ember)
cone('Lamp_Candle',(lx,.84,lz),.023,.105,cream,.023,lamp,20)
bpy.context.view_layer.update()
base=Matrix.Translation(xyz((lx,.75,lz)))
stocky=base@Matrix.Diagonal((1.30,1.30,.68,1))@base.inverted()
for o in list(lamp.children_recursive):o.matrix_world=stocky@o.matrix_world

# Chair keeps its original swivel/sit pivot. Thick draped wool, a curved back and broad arms.
chair=bpy.data.objects['ks_chair']
def cp(x,y,z):return (-.34+(x-z)*math.sqrt(.5),y,-.9+(x+z)*math.sqrt(.5))
def cushion(name,p,s):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=xyz(cp(*p)))
    o=bpy.context.object;o.name=name
    for v in o.data.vertices:
        for k in range(3):v.co[k]=math.copysign(abs(v.co[k])**.55,v.co[k])
    o.scale=(s[0],s[2],s[1]);o.rotation_euler.z=-math.pi/4
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,cream)
    for poly in o.data.polygons:poly.use_smooth=True
    w=o.matrix_world.copy();o.parent=chair;o.matrix_world=w;return o
seat=cushion('Chair_Fur_Seat',(0,.48,0),(.30,.10,.29))
back=cushion('Chair_Fur_Back',(0,.81,.19),(.31,.37,.13))
for side in [-1,1]:
    cushion('Chair_Fur_Arm',(side*.255,.63,.015),(.105,.14,.265))
    for z in [-.16,.17]:tube('Chair_Oak_Arm_Support',[cp(side*.255,.44,z),cp(side*.255,.64,z)],.022,dark,chair)
    for z in [-.2,.19]:tube('Chair_Oak_Legs',[cp(side*.23,.04,z),cp(side*.23,.43,z)],.026,dark,chair)
    tube('Chair_Oak_Rocker',[cp(side*.23,.035,z) for z in [-.30,-.15,0,.15,.30]],.021,dark,chair)
# A soft rolled edge and close-set fine tufts break the chair's smooth outline.
for base in [seat,back]:
    v=[];f=[];random.seed(119 if base==seat else 121)
    for i in range(2300):
        a=random.random()*math.tau;t=math.acos(random.uniform(-1,1));n=Vector((math.sin(t)*math.cos(a),math.sin(t)*math.sin(a),math.cos(t)))
        scale=(.30,.29,.10) if base==seat else (.31,.13,.37)
        center=Vector((0,0,0));p=Vector(tuple(math.copysign(abs(n[k])**.55,n[k])*scale[k] for k in range(3)))
        # Mesh positions are already ellipsoidal local coordinates, world transform is retained.
        world=base.matrix_world@p;normal=base.matrix_world.to_3x3()@n;normal.normalize();tip=world+normal*random.uniform(.004,.013);tangent=normal.cross(Vector((0,0,1)))
        if tangent.length<.01:tangent=Vector((1,0,0))
        tangent.normalize();k=len(v)
        for q in [world-tangent*.001,world+tangent*.001,tip]:v.append((q.x,q.z,-q.y))
        f.append((k,k+1,k+2))
    fibres=mesh('Chair_Fur_Fibres',v,f,cream,chair);uv(fibres,(0,2),(1.6,1.6))

# Organic hide silhouette: a broad torso, four soft lobes and a tapered neck.
def radius(a):return 1+.22*math.cos(4*a)-.09*math.cos(2*a)+.026*math.sin(13*a)+.015*math.sin(31*a)
verts=[(0,.035,.43)];faces=[];rings=18;segments=128
for j in range(1,rings+1):
    t=j/rings
    for i in range(segments):
        a=i*math.tau/segments;r=radius(a)*t
        verts.append((.84*r*math.cos(a),.028+.017*(1-t)+.007*math.sin(a*9)*t*t,.43+.91*r*math.sin(a)))
for i in range(segments):faces.append((0,1+i,1+(i+1)%segments))
for j in range(rings-1):
    for i in range(segments):k=1+j*segments+i;kn=1+j*segments+(i+1)%segments;faces.append((k,k+segments,kn+segments,kn))
rug=mesh('Cabin_Hide_Rug',verts,[tuple(reversed(f)) for f in faces],cream);uv(rug,(0,1),(.53,.53))
for p in rug.data.polygons:p.use_smooth=True
# Low ribbon tufts give the rug a fuzzy silhouette without costly hair particles.
v=[];f=[]
for i in range(4200):
    a=random.random()*math.tau;t=math.sqrt(random.random());r=radius(a)*t
    x=.84*r*math.cos(a);z=.43+.91*r*math.sin(a);y=.033+.015*(1-t)
    length=random.uniform(.013,.036);w=.0015;lean=random.uniform(-.018,.018);k=len(v)
    v.extend([(x-w,y,z),(x+w,y,z),(x+lean,y+length,z+.012)]);f.append((k,k+1,k+2))
tufts=mesh('Cabin_Hide_Fibres',v,f,cream);uv(tufts,(0,1),(.53,.53))

def river_x(z):return .35+1.1*math.sin((z+4)*.16)
def valley_y(z):return -.18+(-z-3)*.021+max(0,-z-24)*.16

# Optional wall mounts: closed, calm poses on carved oak plaques.
hide_brown=mat('deer winter coat',(.30,.17,.087),.96)
bear_brown=mat('bear winter coat',(.12,.067,.035),.98)
muzzle=mat('warm muzzle',(.48,.36,.23),.98)
antler=mat('antler ivory',(.63,.52,.35),.78)
eye=mat('mount glass eyes',(.012,.009,.006),.13)
for m,base in [(hide_brown,(.64,.46,.30)),(bear_brown,(.43,.31,.21)),(muzzle,(.66,.55,.41))]:
    n=256;yy,xx=np.mgrid[0:n,0:n]/n;rng=np.random.default_rng(77)
    freq=np.fft.fftfreq(n);fx,fy=np.meshgrid(freq,freq)
    strands=np.fft.ifft2(np.fft.fft2(rng.normal(0,1,(n,n)))*np.exp(-fy*fy*95)).real
    grain=.94+.08*strands/strands.std()+rng.normal(0,.018,(n,n))
    rgb=np.clip(np.array(base)[None,None,:]*grain[:,:,None],0,1)
    img=bpy.data.images.new(m.name+' fur grain',n,n,alpha=True);img.pixels.foreach_set(np.concatenate([rgb,np.ones((n,n,1))],axis=2).astype(np.float32).ravel());img.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def mount_part(name,p,s,m,parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=xyz(p))
    o=bpy.context.object;o.name=name;o.scale=(s[0],s[2],s[1]);finish(o,m)
    for f in o.data.polygons:f.use_smooth=True
    bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=parent;o.matrix_world=w
    return o
for animal,x in [('Deer',-1.73),('Bear',1.46)]:
    root=bpy.data.objects.new('Cabin_'+animal+'_Mount',None);bpy.context.collection.objects.link(root)
    prefix='Cabin_'+animal+'_';coat=hide_brown if animal=='Deer' else bear_brown
    mount_part(prefix+'Plaque',(x,2.25,-2.05),(.25,.34,.047),dark,root)
    mount_part(prefix+'Plaque_Inlay',(x,2.25,-2.008),(.222,.306,.010),wood,root)
    mount_part(prefix+'Neck',(x,2.21,-1.91),(.13 if animal=='Deer' else .19,.23,.145),coat,root)
    skull=mount_part(prefix+'Skull',(x,2.39,-1.78),(.110 if animal=='Deer' else .180,.19,.145),coat,root)
    for v in skull.data.vertices:v.co.x*=.80+.20*(v.co.z+1)/2
    mount_part(prefix+'Muzzle',(x,2.275,-1.625),(.065 if animal=='Deer' else .099,.079,.195 if animal=='Deer' else .124),coat if animal=='Deer' else muzzle,root)
    mount_part(prefix+'Chin',(x,2.227,-1.58),(.054 if animal=='Deer' else .084,.033,.115),muzzle,root)
    mount_part(prefix+'Nose',(x,2.285,-1.435 if animal=='Deer' else -1.51),(.045 if animal=='Deer' else .061,.026,.022),iron,root)
    for side in [-1,1]:
        mount_part(prefix+'Eye',(x+side*(.085 if animal=='Deer' else .112),2.425,-1.660),(.014,.009,.012),eye,root)
        mount_part(prefix+'Brow',(x+side*(.081 if animal=='Deer' else .106),2.444,-1.661),(.037,.019,.023),coat,root)
        ear=mount_part(prefix+'Ear',(x+side*(.151 if animal=='Deer' else .140),2.55,-1.79),(.052,.113,.027) if animal=='Deer' else (.052,.054,.031),coat,root)
        ear.rotation_euler.y=side*.55 if animal=='Deer' else side*.24
        mount_part(prefix+'Ear_Inner',(x+side*(.151 if animal=='Deer' else .140),2.558,-1.757),(.026,.065,.009) if animal=='Deer' else (.028,.030,.008),muzzle,root)
        if animal=='Deer':
            # Tapered branching antlers with separate brow and crown tines.
            path=[(x+side*.067,2.52,-1.81),(x+side*.10,2.67,-1.83),(x+side*.22,2.81,-1.83),(x+side*.31,2.94,-1.85),(x+side*.30,3.08,-1.87)]
            branches=[path,[path[1],(x+side*.09,2.82,-1.72),(x+side*.065,2.89,-1.72)],[path[2],(x+side*.19,2.96,-1.80),(x+side*.17,3.02,-1.81)],[path[3],(x+side*.39,3.04,-1.83),(x+side*.42,3.11,-1.84)]]
            for branch in branches:
                for j in range(len(branch)-1):
                    a,b=Vector(xyz(branch[j])),Vector(xyz(branch[j+1]));d=b-a
                    bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=.018*(1-j/len(branch)),radius2=.003 if j==len(branch)-2 else .014*(1-j/len(branch)),depth=d.length,location=(a+b)/2)
                    o=bpy.context.object;o.name=prefix+'Antler';o.rotation_euler=d.to_track_quat('Z','Y').to_euler();finish(o,antler)
                    for f in o.data.polygons:f.use_smooth=True
                    bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=root;o.matrix_world=w
    # Fine surface strands add coat texture without transparency or hair systems.
    parts=[o for o in root.children if o.name.startswith((prefix+'Neck',prefix+'Skull'))]
    for part in parts:
        bpy.context.view_layer.update();v=[];f=[]
        for i in range(500):
            a=random.random()*math.tau;t=math.acos(random.uniform(-1,1));n=Vector((math.sin(t)*math.cos(a),math.sin(t)*math.sin(a),math.cos(t)))
            p=part.matrix_world@n;normal=part.matrix_world.to_3x3().inverted().transposed()@n;normal.normalize();tip=p+normal*.006
            tangent=normal.cross(Vector((0,0,1)));tangent.normalize();k=len(v)
            for q in [p-tangent*.001,p+tangent*.001,tip]:v.append((q.x,q.z,-q.y))
            f.append((k,k+1,k+2))
        mesh(prefix+'Coat',v,f,coat,root)

# Snow-laden alpine ridges: height-field meshes, layered in depth, not faceted cones.
for layer in range(3):
    nx,nz=140,38;verts=[];faces=[]
    for j in range(nz+1):
        for i in range(nx+1):
            x=-34+i*68/nx;z=-24-layer*12-j*14/nz
            ridge=(5.2+layer*.9+2.1*math.sin(x*.30+layer)+1.5*math.sin(x*.67-layer))
            ridge*=1-.58*math.exp(-((x-1.5)/3.8)**2)
            h=-1.0+max(0,ridge)*math.sin(j/nz*math.pi)**.75
            h+=noise.noise_vector(Vector((x*.65,z*.65,layer)))[0]*.7*math.sin(j/nz*math.pi)
            h+=noise.noise_vector(Vector((x*2.5,z*2.5,layer)))[0]*.14*math.sin(j/nz*math.pi)
            if layer==0 and z>=-33:
                channel=math.exp(-((x-river_x(z))/1.4)**4)
                h=h*(1-channel)+(valley_y(z)-.06)*channel
            verts.append((x,h,z))
    for j in range(nz):
        for i in range(nx):k=j*(nx+1)+i;faces.extend([(k,k+nx+1,k+1),(k+1,k+nx+1,k+nx+2)])
    mountain=mesh('Cabin_Mountain_'+str(layer),verts,[tuple(reversed(f)) for f in faces],snow);mountain.data.materials.append(rock)
    for p in mountain.data.polygons:p.use_smooth=True
    mountain.data.update()
    colors=mountain.data.color_attributes.new(name='Snow deposition',type='FLOAT_COLOR',domain='POINT')
    for i,v in enumerate(mountain.data.vertices):
        grit=noise.noise_vector(v.co*4.5)[0]*.12
        amount=max(0,min(1,(v.normal.z-.72)*3.4+grit+(v.co.z-2)*.045))
        c=Vector((.14,.21,.255)).lerp(Vector((.93,.96,1)),amount)
        colors.data[i].color=(*c,1)
    mountain_mat=snow.copy();mountain_mat.name='Cabin | mountain snow '+str(layer)
    node=mountain_mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Snow deposition'
    mountain_mat.node_tree.links.new(node.outputs['Color'],mountain_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);finish(mountain,mountain_mat)
for i in range(70):
    x=random.uniform(-13,13);z=random.uniform(-23,-5);h=random.uniform(1.0,2.6)
    if abs(x-river_x(z))<1.4:continue
    ground=valley_y(z)
    cone('Cabin_Pine_Trunk',(x,ground+h*.3,z),.035,h*.6,dark,.025,n=7)
    for level in range(4):
        y=ground+h*(.22+level*.19);r=h*(.28-level*.047)
        cone('Cabin_Pines',(x,y,z),r,h*.49,pine,0,n=10)
        cone('Cabin_Snow_Boughs',(x,y+.058,z),r*.93,h*.45,snow,0,n=10)
# Snow banks follow a meandering channel, leaving a real gap for the flowing water.
for side in [-1,1]:
    v=[];f=[]
    for i in range(101):
        z=-3-i*.21;x=river_x(z);y=valley_y(z)
        v.extend([(x+side*.72,y+.018,z),(side*35,y-.035,z)])
        if i:k=2*i;f.append((k-2,k-1,k+1,k))
    mesh('Cabin_Snow_Bank',v,[tuple(reversed(face)) for face in f] if side==-1 else f,snow)

# Apply detail geometry and batch static decoration while retaining interaction descendants.
for o in list(bpy.data.objects):
    if o.type=='CURVE' or o.type=='MESH' and o.modifiers:
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
for prefix in ['Cabin_Logs','Cabin_Chinking','Cabin_Ceiling_Planks','Cabin_Corner_Stone','Cabin_Fire_Stone','Cabin_Chimney_Stone','Cabin_Coals','Cabin_Pines','Cabin_Snow_Boughs','Cabin_Pine_Trunk','Cabin_Rafters','Cabin_Window_Rafters','Cabin_Fire_Logs']:
    objects=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith(prefix)]
    if len(objects)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=prefix
for o in bpy.data.objects:
    if o.type=='MESH':
        if not o.data.uv_layers:uv(o)
        # Imported meshes keep authored normals. New closed solids point outward.
        if o.name.startswith(('Cabin_','Lamp_','Chair_')) and o.name not in ['Cabin_Hide_Fibres','Cabin_Hide_Rug'] and not o.name.startswith('Cabin_Mountain'):
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'snowy-mountain.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
# Source-only review rig, exported geometry above remains camera/light independent.
data=bpy.data.cameras.new('Cabin_Review_Camera');camera=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(camera);camera.location=xyz((.65,1.55,1.6));camera.rotation_euler=(Vector(xyz((-.15,1.8,-2)))-camera.location).to_track_quat('-Z','Y').to_euler();data.lens=21;bpy.context.scene.camera=camera
for name,p,energy,color in [('Cabin_Review_Ceiling',(0,3,0),180,(1,.76,.47)),('Cabin_Review_Window',(0,2,-1.9),100,(.65,.83,1))]:
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=3;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=xyz(p)
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=24
bpy.context.scene.render.resolution_x=1280;bpy.context.scene.render.resolution_y=960;bpy.context.scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art/snowy-mountain/snowy-mountain.blend'))
print('CABIN_COMPLETE')

"""Independent Sky Castle authoring. Web coordinates in metres; source GLB is read-only.
Run: blender -b --python art/sky-castle/build.py
"""
import bpy, math, os, json, random
from mathutils import Vector, Matrix, noise
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'public/room/sky-castle');os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/room/woodland/woodland.glb'))
random.seed(803)
def xyz(p):return (p[0],-p[2],p[1])
def material(name,color,metal=0,rough=.4,alpha=1,transmission=0,glow=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    for k,v in {'Base Color':(*color,alpha),'Metallic':metal,'Roughness':rough,'Alpha':alpha,'Transmission Weight':transmission,'IOR':1.46,'Coat Weight':.32,'Emission Color':(*color,1),'Emission Strength':glow}.items():p.inputs[k].default_value=v
    if alpha<1:m.surface_render_method='DITHERED'
    return m
pearl=material('Sky • porcelain',(.86,.88,.89),.08,.32)
plaster=material('Sky • ivory plaster',(.84,.845,.85),.02,.82)
gold=material('Sky • champagne gold',(.58,.32,.085),.78,.30)
glass=material('Sky • clear quartz',(.60,.82,.86),.08,.13,.63,.38)
opal=material('Sky • opal facets',(.30,.48,.70),.28,.22,.86,.12)
lavender=material('Sky • lilac satin',(.38,.28,.52),.06,.85)
blue=material('Sky • mist blue',(.48,.61,.74),.04,.78)
teal=material('Sky • lagoon enamel',(.10,.25,.28),.18,.36)
rose=material('Sky • rose silk',(.63,.48,.60),0,.9)
ceiling_blue=material('Sky • dusk pearl',(.66,.72,.83),.03,.75)
ink=material('Sky • atlas leather',(.23,.30,.36),.15,.65)
glow=material('Sky • starlight',(.61,.83,1),.1,.2,1,0,1.4)
cloud=material('Sky • cloud silk',(.87,.90,.96),0,1)
for m in [cloud,plaster,lavender,blue,rose,ceiling_blue]:m.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=0
cloud.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=.25
castle=material('Sky • distant alabaster',(.70,.75,.85),.12,.42)
rock=material('Sky • floating chalk',(.31,.42,.53),.1,.85)

def mesh(name,verts,faces,mat,parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    if parent:
        bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    return o
def box(name,p,s,mat,parent=None,bevel=0):
    v=[(p[0]+x*s[0]/2,p[1]+y*s[1]/2,p[2]+z*s[2]/2) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
    o=mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,parent)
    if bevel:
        mod=o.modifiers.new('Polished edges','BEVEL');mod.width=bevel;mod.segments=2
    return o
def tube(name,points,r,mat,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for v,p in zip(s.points,points):v.co=(*xyz(p),1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    if parent:bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=parent;o.matrix_world=w
    return o
def ring(name,p,r,thick,mat,parent=None,plane='xy'):
    return tube(name,[(p[0]+r*math.cos(a*math.tau/96),p[1]+(r*math.sin(a*math.tau/96) if plane=='xy' else 0),p[2]+(r*math.sin(a*math.tau/96) if plane=='xz' else 0)) for a in range(97)],thick,mat,parent)
def cone(name,p,r,h,mat,r2=0,parent=None,n=12):
    verts=[(p[0]+rad*math.cos(i*math.tau/n),p[1]+y,p[2]+rad*math.sin(i*math.tau/n)) for y,rad in [(-h/2,r),(h/2,r2) ] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,parent)
def crystal(name,p,r,h,mat=glass,parent=None):
    cone(name+'_body',(p[0],p[1]+h*.36,p[2]),r,h*.72,mat,r*.81,parent,6)
    cone(name+'_tip',(p[0],p[1]+h*.86,p[2]),r*.81,h*.28,mat,0,parent,6)
def finish(o,m):o.data.materials.clear();o.data.materials.append(m)

# Remove Woodland decor only in this imported, independent copy.
for o in list(bpy.data.objects):
    if o.type!='MESH':continue
    if o.name.startswith(('Woodland_Static','Woodland_Botanical','Cabinet_Flowers','Fern_Stems','Semantic_','Cozy_Woodland','Cozy_Chair','Cozy_Cushion','Finish_Wood','Finish_Coffee','Room_Wall_B_','Win_','Chair_','Accent_Pot','Accent_Leaf')):
        bpy.data.objects.remove(o,do_unlink=True);continue
    if o.name.startswith('Room_'):finish(o,plaster)
    elif o.name.startswith('Trim_'):finish(o,pearl)
    elif o.name.startswith(('Desk_','Cozy_Guest')):finish(o,glass if 'Handle' not in o.name else gold)
    elif o.name.startswith(('Archive_','ks_archive','Shelf_','ks_shelf_board','Door_','Lamp_','CRT_','Clock_','Fan_')) and o.name not in ('CRT_Screen','ks_clock_digits','ks_clock_glass'):
        finish(o,gold if any(w in o.name for w in ('Handle','Knob','Brass','Ring','Pole','Inlay','Rod','Iron','Plate','Screw','Lip','Chain','Finial')) else pearl)
    elif o.name in ('Beanbag','Finish_Folded_Throw'):finish(o,rose if 'Throw' in o.name else lavender)
    elif o.name=='Map_Frame':finish(o,gold)
    elif o.name=='Map_Cork':finish(o,pearl)
    elif o.name=='Map_Sheet':finish(o,pearl)

# Recesses and selected furniture surfaces provide contrast against the pearl shell.
for name in ['Shelf_Back','CRT_Bezel','Door_Leaf']:
    finish(bpy.data.objects[name],teal)
for name in ['Archive_SideL','Archive_SideR','Archive_Plinth','CRT_Body']:
    finish(bpy.data.objects[name],blue)
finish(bpy.data.objects['Room_Ceiling'],ceiling_blue)

# Circular masonry aperture: an actual opening, with depth entirely outside the room.
cx,cy,r=-.15,2.015,.90
v=[];f=[]
for i in range(128):
    a=i*math.tau/128;dx,dy=math.cos(a),math.sin(a)
    t=min((2.5-cx)/dx if dx>1e-8 else (-2.5-cx)/dx if dx<-1e-8 else 1e9,(3.15-cy)/dy if dy>1e-8 else -cy/dy if dy<-1e-8 else 1e9)
    v.extend([(cx+dx*r,cy+dy*r,-2.125),(cx+dx*t,cy+dy*t,-2.125),(cx+dx*r,cy+dy*r,-2.47)])
for i in range(128):
    j=(i+1)%128;f.extend([(3*i,3*j,3*j+1,3*i+1),(3*i,3*i+2,3*j+2,3*j)])
masonry=mesh('Sky_Window_Masonry',v,f,blue)
masonry.data.materials.append(teal)
for polygon in masonry.data.polygons:
    if polygon.index%2:polygon.material_index=1
window=bpy.data.objects['ks_window']
for rr,z,th,m in [(.927,-2.102,.043,pearl),(.978,-2.10,.012,gold),(.876,-2.14,.015,gold),(.89,-2.45,.025,opal)]:ring('Sky_Window_Moulding',(cx,cy,z),rr,th,m,window)
for i in range(24):
    a=i*math.tau/24
    cone('Sky_Window_Diamond',(cx+.978*math.cos(a),cy+.978*math.sin(a),-2.087),.027,.05,opal,.004,window,4)
# Separate side shelves leave the complete lower window arc unobstructed.
# Inner edges clear the frame/diamond radius; backs meet the mounting wall.
sill_top=cy-r
for side,x0,x1 in [('Left',-1.10,-.66),('Right',.36,.80)]:
    outline=[];radius=.03;front=-1.985;back=-2.14
    for x,z,start in [(x1-radius,front-radius,0),(x0+radius,front-radius,90),(x0+radius,back+radius,180),(x1-radius,back+radius,270)]:
        for i in range(13):
            a=math.radians(start+i*90/12)
            outline.append((x+radius*math.cos(a),z+radius*math.sin(a)))
    n=len(outline)
    verts=[(x,y,z) for y in [sill_top-.048,sill_top] for x,z in outline]
    faces=[tuple(range(n)),tuple(reversed(range(n,n*2)))]+[(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)]
    sill=mesh('Sky_Sill_Shelf_'+side,verts,faces,pearl,window)
    mod=sill.modifiers.new('Soft sill edge','BEVEL');mod.width=.006;mod.segments=3
    tube('Sky_Sill_Gold_Edge_'+side,[(x,sill_top-.036,z) for x,z in outline+[outline[0]]],.004,gold,window)

# Slender classical columns, capitals and restrained diamond inlays.
for x in [-1.32,1.02]:
    for y,radius,height in [(.13,.125,.26),(2.87,.13,.15),(2.70,.11,.08)]:cone('Sky_Architecture_Pearl',(x,y,-2.04),radius,height,pearl,radius,n=20)
    cone('Sky_Architecture_Pearl',(x,1.48,-2.04),.077,2.50,pearl,.062,n=20)
    for y in [.26,.32,2.67,2.77,2.93]:ring('Sky_Architecture_Gold',(x,y,-2.04),.105,.009,gold,plane='xz')
    for i in range(10):
        a=i*math.tau/10;tube('Sky_Architecture_Gold',[(x+.078*math.cos(a),.33,-2.04+.078*math.sin(a)),(x+.063*math.cos(a),2.63,-2.04+.063*math.sin(a))],.0035,gold)
for x in [-2.43,2.43]:
    for z in [-1.97,1.98]:
        box('Sky_Architecture_Pearl',(x,1.56,z),(.11,3.12,.11),pearl,bevel=.018)
        tube('Sky_Architecture_Gold',[(x*.993,.14,z*.993),(x*.993,3.02,z*.993)],.006,gold)
for y in [.085,2.99,3.075]:
    tube('Sky_Architecture_Gold',[(-2.41,y,-2.035),(-2.41,y,2.03),(2.41,y,2.03),(2.41,y,-2.035)],.009 if y<3 else .016,gold)
    if y>2.9:tube('Sky_Architecture_Gold',[(-2.41,y,-2.035),(2.41,y,-2.035)],.009,gold)
# Ceiling medallion leaves the spinning fan unobstructed below y=3.15.
for rr in [.33,.39,1.22]:ring('Sky_Architecture_Gold',(0,3.138,0),rr,.009,gold,plane='xz')
for i in range(16):
    a=i*math.tau/16;crystal('Sky_Architecture_Opal',(1.22*math.cos(a),3.075,1.22*math.sin(a)),.04,.066,opal)

# Crystal desk: same surface, drawer, parents and world-space contact heights.
desk=bpy.data.objects['Desk'];top=bpy.data.objects['Desk_Top'];finish(top,glass)
for o in list(bpy.data.objects):
    if o.name.startswith('Desk_Leg_'):bpy.data.objects.remove(o,do_unlink=True)
mod=top.modifiers.new('Quartz edge bevel','BEVEL');mod.width=.009;mod.segments=2
for x in [-1.037,.737]:
    for z in [-2.009,-1.361]:
        crystal('Desk_Leg_Quartz',(x,.015,z),.045,.69,glass,desk)
        cone('Desk_Leg_Gold_Shoe',(x,.018,z),.047,.036,gold,.043,desk,6)
for side in [-1,1]:
    x=-.15+side*.918;tube('Desk_Top_Gold',[(x,.724,-2.052),(x,.724,-1.318)],.004,gold,desk)
tube('Desk_Top_Gold',[(-1.065,.724,-1.316),(.765,.724,-1.316)],.004,gold,desk)

# Substantial curved quartz chair shell; the original root/pivot is preserved.
chair=bpy.data.objects['ks_chair']
def cp(x,y,z):
    return (-.34+(x-z)*math.sqrt(.5),y,-.9+(x+z)*math.sqrt(.5))
seat=box('Chair_Seat',(-.34,.456,-.9),(.42,.052,.42),glass,chair,.018)
bpy.context.view_layer.update()
center=Matrix.Translation(xyz((-.34,.456,-.9)))
seat.matrix_world=center@Matrix.Rotation(-math.pi/4,4,'Z')@center.inverted()@seat.matrix_world
# Author in chair coordinates to follow its existing 45-degree orientation.
verts=[]
for depth in [-.035,.035]:
    for row in range(9):
        t=row/8;y=.47+t*.52;w=.215+.03*math.sin(t*math.pi)-.055*t**3
        for col in range(13):
            u=col/12*2-1;verts.append(cp(u*w,y,.177+.10*t+.038*u*u+depth))
faces=[];layer=9*13
for layeridx in [0,1]:
    for row in range(8):
        for col in range(12):
            k=layeridx*layer+row*13+col;faces.append((k,k+1,k+14,k+13) if layeridx else (k+13,k+14,k+1,k))
boundary=list(range(13))+[row*13+12 for row in range(1,9)]+list(range(8*13+11,8*13-1,-1))+[row*13 for row in range(7,0,-1)]
for i,k in enumerate(boundary):j=boundary[(i+1)%len(boundary)];faces.append((k,j,j+layer,k+layer))
mesh('Chair_Back',verts,faces,glass,chair)
tube('Chair_Gold_Crown',[cp((col/24*2-1)*.16,.991,.277+.038*(col/24*2-1)**2) for col in range(25)],.005,gold,chair)
for x in [-.165,.165]:
    for z in [-.165,.165]:
        tube('Chair_Leg',[cp(x*1.16,.018,z*1.16),cp(x,.432,z)],.024,glass,chair)
        cone('Chair_Gold_Shoe',cp(x*1.16,.016,z*1.16),.026,.032,gold,.025,chair,8)
for x in [-.225,.225]:tube('Chair_Arm',[cp(x,.47,-.12),cp(x,.66,-.08),cp(x,.68,.22)],.021,glass,chair)

# Jewel planter on the retained sill anchor, no geometry below its support.
pot=bpy.data.objects['ks_window_cactus']
cone('Sky_Sill_Bowl',(.57,sill_top+.032,-2.063),.051,.064,teal,.065,pot,16)
for i in range(5):
    a=i*2.4;crystal('Sky_Sill_Crystal',(.57+math.cos(a)*.027,sill_top+.059,-2.063+math.sin(a)*.025),.014,.10+(i%3)*.035,opal if i%2 else glass,pot)

# Cloud floor is continuous noise relief, with flattened furniture contact zones.
verts=[];faces=[];nx,nz=100,86
feet=[(-1.037,-2.009),(.737,-2.009),(-1.037,-1.361),(.737,-1.361)]+[(cp(x,0,z)[0],cp(x,0,z)[2]) for x in [-.191,.191] for z in [-.191,.191]]
for j in range(nz+1):
    z=-2.12+j*4.24/nz
    for i in range(nx+1):
        x=-2.49+i*4.98/nx
        n=noise.fractal(Vector((x*2.3,z*2.3,.71)),1.0,2.1,4)
        y=.012+.09*(n+.8)/1.8
        for fx,fz in feet:y*=min(1,((x-fx)**2+(z-fz)**2)/.015)
        if x>1.80 or x< -1.25 and z> .65:y*=.18
        verts.append((x,max(.001,y),z))
for j in range(nz):
    for i in range(nx):k=j*(nx+1)+i;faces.append((k,k+nx+1,k+nx+2,k+1))
floor=mesh('Sky_Cloud_Floor',verts,faces,cloud)
uv=floor.data.uv_layers.new(name='Cloud_UV')
for polygon in floor.data.polygons:
    for loop in polygon.loop_indices:
        v=floor.data.vertices[floor.data.loops[loop].vertex_index].co
        uv.data[loop].uv=((v.x+2.49)/4.98,(-v.y+2.12)/4.24)
for face in floor.data.polygons:face.use_smooth=True

# Exterior: the floating Crown of Dawn, surrounded by animated water and mist at runtime.
def gothic_window(x,y,z,w,h,r,a):
    # Local tangent/radial coordinates; front glazing and arch occupy the same facade.
    def wp(u,v,d=0):return (x+math.sin(a)*u+math.cos(a)*d,y+v,z-math.cos(a)*u+math.sin(a)*d)
    points=[wp(-w/2,0),wp(-w/2,h*.66)]
    points += [wp(-w/2*(1-t),h*(.66+.34*math.sin(t*math.pi/2))) for t in [i/10 for i in range(11)]]
    points += [wp(w/2*t,h*(1-.34*(1-math.cos(t*math.pi/2)))) for t in [i/10 for i in range(1,11)]]
    points += [wp(w/2,0),wp(-w/2,0)]
    tube('Sky_Castle_Gold',points,r,gold)
    mesh('Sky_Castle_Glass',[wp(0,h*.43,-.012)]+points[:-1],[(0,i+1,(i+1)%(len(points)-1)+1) for i in range(len(points)-1)],opal)
    tube('Sky_Castle_Gold',[wp(0,.02),wp(0,h*.96)],r*.5,gold)
    for v in [.35,.62]:tube('Sky_Castle_Gold',[wp(-w*.45,h*v),wp(w*.45,h*v)],r*.45,gold)
def tower(x,y,z,r,h):
    cone('Sky_Castle_Stone',(x,y+h/2,z),r,h,castle,r*.91,n=16)
    for yy in [y+.08,y+h*.65,y+h]:cone('Sky_Castle_Gold',(x,yy,z),r*1.08,.08,gold,r*1.08,n=16)
    cone('Sky_Castle_Opal',(x,y+h+1.1*r,z),r*1.12,2.2*r,opal,0,n=12)
    crystal('Sky_Castle_Star',(x,y+h+2.2*r,z),.055,.22,glow)
    for k in range(8):
        a=k*math.tau/8
        for yy in [.30,.60]:
            xx=x+math.cos(a)*r*.97;zz=z+math.sin(a)*r*.97
            center=(xx,y+h*yy,zz);o=box('Sky_Castle_Windows',center,(.10,h*.16,.025),glow)
            t=Matrix.Translation(xyz(center));o.matrix_world=t@Matrix.Rotation(-a-math.pi/2,4,'Z')@t.inverted()
        gothic_window(x+math.cos(a)*r*1.008,y+h*.23,z+math.sin(a)*r*1.008,r*.53,h*.40,.011,a)
    # Buttresses break up each tower's silhouette.
    for k in range(6):
        a=k*math.tau/6;cone('Sky_Castle_Stone',(x+math.cos(a)*r,y+h*.35,z+math.sin(a)*r),r*.11,h*.70,castle,r*.075,n=6)
cone('Sky_Castle_Island',(-.5,-1.05,-12),.65,3.2,rock,3.8,n=11)
cone('Sky_Castle_Terrace',(-.5,.59,-12),3.87,.18,pearl,3.87,n=48)
for x,z,radius,height in [(-.5,-12,.78,4.5),(-1.6,-12.4,.48,3.1),(.7,-12.5,.51,3.6),(-2.6,-11.7,.38,2.2),(1.75,-11.5,.44,2.65),(-.4,-10.5,.38,2.3),(-2.1,-13.5,.32,2.9),(1.3,-13.6,.35,3.05)]:tower(x,.68,z,radius,height)
# Ceremonial front hall, raised gallery and open pointed arches.
box('Sky_Castle_Stone',(-.45,1.34,-11.15),(3.9,1.3,1.30),castle,bevel=.04)
for x in [-1.9,-1.2,-.5,.2,.9]:gothic_window(x,.87,-10.48,.39,1.03,.022,math.pi/2)
for x in [-2.45,1.55]:
    for i in range(25):
        t=i/24;tube('Sky_Castle_Gold',[(x,.8+t*1.8,-11.0-t*.9),(x+.13,.8+t*1.8,-11.0-t*.9)],.013,gold)
    tube('Sky_Castle_Stone',[(x,.75,-10.9),(x,1.0,-11.1),(x,1.25,-11.6),(x,2.7,-12.0)],.075,castle)
for i in range(60):
    a=i*math.tau/60;x=-.5+3.65*math.cos(a);z=-12+3.65*math.sin(a)
    cone('Sky_Castle_Stone',(x,.97,z),.034,.62,castle,.034,n=6)
for yy in [.72,1.26]:ring('Sky_Castle_Gold',(-.5,yy,-12),3.65,.025,gold,plane='xz')
# Smaller neighboring isles add depth through the circular opening.
for x,y,z in [(-7,1.2,-20),(7.2,1.0,-24),(-4.6,3.4,-28)]:
    cone('Sky_Castle_Island',(x,y-.7,z),.1,1.8,rock,1.35,n=7)
    cone('Sky_Castle_Terrace',(x,y+.22,z),1.4,.11,pearl,1.4,n=24)
    tower(x,y+.28,z,.34,2.2)

# Move the entire castle/island composition back together; runtime waterfalls use
# the same offset. Room anchors and the size of the castle stay unchanged.
for o in bpy.data.objects:
    if o.name.startswith('Sky_Castle_'):o.location+=Vector(xyz((-2.8,2.8,-12)))

# Bake authored bevels and curves, batch only non-interactive decoration by material.
for o in list(bpy.data.objects):
    if o.type=='CURVE' or o.type=='MESH' and o.modifiers:
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
for prefix in ['Sky_Architecture','Sky_Castle','Sky_Window_Moulding','Sky_Window_Diamond','Sky_Sill_Crystal','Desk_Leg_Quartz']:
    for m in [pearl,gold,glass,opal,glow,castle,rock]:
        objects=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith(prefix) and o.data.materials and o.data.materials[0]==m]
        if len(objects)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=prefix+'_'+m.name.split(' • ')[-1]
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art/sky-castle/sky-castle.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'sky-castle.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
# Blender review camera/lights live only in the source file; runtime supplies its own.
preview=bpy.data.collections.new('Sky Castle • Blender review');bpy.context.scene.collection.children.link(preview)
def preview_object(name,data,p):
    o=bpy.data.objects.new(name,data);preview.objects.link(o);o.location=xyz(p);return o
camera=preview_object('Sky_Review_Camera',bpy.data.cameras.new('Sky_Review_Camera'),(.1,1.48,1.7))
camera.rotation_euler=(Vector(xyz((-.15,1.60,-2)))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=23;bpy.context.scene.camera=camera
for name,p,energy,size in [('Sky_Review_Ceiling',(0,2.85,0),120,3),('Sky_Review_Window',(0,2,-1.7),80,2)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;o=preview_object(name,data,p)
    o.rotation_euler=(Vector(xyz((0,.7,0)))-o.location).to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('Sky daylight');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.36,.56,.75,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.45;bpy.context.scene.world=world
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=24;bpy.context.scene.render.resolution_x=1200;bpy.context.scene.render.resolution_y=900;bpy.context.scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art/sky-castle/sky-castle.blend'))
print('SKY_CASTLE_COMPLETE')

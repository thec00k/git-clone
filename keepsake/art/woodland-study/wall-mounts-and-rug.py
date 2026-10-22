"""Deer and bear wall mounts and the cream hide rug, kept from the retired Snowy Mountain room (owner, 2026-10-20).
Ported from `art/snowy-mountain/build.py` on branch `codex/snowy-mountain-room` (commit 7037e85). Shapes and coats are
unchanged; `marbled-fur.jpg` is Snowy's `marbled-fur.png` at 1024 px.
Runs after quality-pass.py so materials.py does not restyle these parts. All coordinates are Three.js metres.
"""
import bpy, math, random
from pathlib import Path
import numpy as np
from mathutils import Vector

random.seed(921)
def xyz(p):return (p[0],-p[2],p[1])
def mat(name,color,rough=.8,metal=0):
    m=bpy.data.materials.new('Woodland_Mount_'+name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    for k,v in {'Base Color':(*color,1),'Roughness':rough,'Metallic':metal}.items():p.inputs[k].default_value=v
    return m
def image(m,name,rgb):
    n=rgb.shape[0];img=bpy.data.images.new(name,n,n,alpha=True)
    img.pixels.foreach_set(np.concatenate([rgb,np.ones((n,n,1))],axis=2).astype(np.float32).ravel());img.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def finish(o,m):o.data.materials.clear();o.data.materials.append(m)
def mesh(name,verts,faces,m,parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(m)
    if parent:
        bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    return o
def uv(o,axes=(0,2),scale=(1,1)):
    layer=o.data.uv_layers.new(name='Mount UV')
    for p in o.data.polygons:
        for l in p.loop_indices:
            v=o.data.vertices[o.data.loops[l].vertex_index].co
            layer.data[l].uv=(v[axes[0]]*scale[0],v[axes[1]]*scale[1])

dark=bpy.data.materials['Woodland_Walnut_Joinery']  # plaques match the room's other walnut joinery
wood=mat('honey cedar',(.30,.135,.057));iron=mat('blackened iron',(.025,.032,.035),.42,.65)
cream=mat('ivory wool',(.72,.68,.59),.98)
cream.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=.6
# Snowy's marbled sheepskin texture (image generator; licences/ledger.json `hide-rug-fur-ai`).
fur=bpy.data.images.load(str(Path(__file__).with_name('marbled-fur.jpg')));fur.pack()
node=cream.node_tree.nodes.new('ShaderNodeTexImage');node.image=fur
cream.node_tree.links.new(node.outputs['Color'],cream.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

# --- Hide rug: a broad torso, four soft lobes and a tapered neck ---------------------------------
# Snowy laid it at (0, 0.43) at full size. Here it is 76% size at (0.15, 0.55), clear of the chair,
# the beanbag, the hearth and the holiday tree and pumpkin by the hearth.
RX,RZ,RS=.15,.55,.76
def radius(a):return 1+.22*math.cos(4*a)-.09*math.cos(2*a)+.026*math.sin(13*a)+.015*math.sin(31*a)
verts=[(RX,.035,RZ)];faces=[];rings=18;segments=128
for j in range(1,rings+1):
    t=j/rings
    for i in range(segments):
        a=i*math.tau/segments;r=radius(a)*t*RS
        verts.append((RX+.84*r*math.cos(a),.028+.017*(1-t)+.007*math.sin(a*9)*t*t,RZ+.91*r*math.sin(a)))
for i in range(segments):faces.append((0,1+i,1+(i+1)%segments))
for j in range(rings-1):
    for i in range(segments):k=1+j*segments+i;kn=1+j*segments+(i+1)%segments;faces.append((k,k+segments,kn+segments,kn))
rug_root=bpy.data.objects.new('Hide_Rug',None);bpy.context.collection.objects.link(rug_root)
rug=mesh('Hide_Rug_Pelt',verts,[tuple(reversed(f)) for f in faces],cream,rug_root);uv(rug,(0,1),(.53,.53))
for p in rug.data.polygons:p.use_smooth=True
# Low ribbon tufts give the rug a fuzzy silhouette without costly hair particles.
v=[];f=[]
for i in range(int(4200*RS*RS)):
    a=random.random()*math.tau;t=math.sqrt(random.random());r=radius(a)*t*RS
    x=RX+.84*r*math.cos(a);z=RZ+.91*r*math.sin(a);y=.033+.015*(1-t)
    length=random.uniform(.013,.036);w=.0015;lean=random.uniform(-.018,.018);k=len(v)
    v.extend([(x-w,y,z),(x+w,y,z),(x+lean,y+length,z+.012)]);f.append((k,k+1,k+2))
tufts=mesh('Hide_Rug_Fibres',v,f,cream,rug_root);uv(tufts,(0,1),(.53,.53))

# --- Wall mounts: closed, calm poses on carved plaques, either side of the window -----------------
hide_brown=mat('deer winter coat',(.30,.17,.087),.96)
bear_brown=mat('bear winter coat',(.12,.067,.035),.98)
muzzle=mat('warm muzzle',(.48,.36,.23),.98)
antler=mat('antler ivory',(.63,.52,.35),.78)
eye=mat('glass eyes',(.012,.009,.006),.13)
for m,base in [(hide_brown,(.64,.46,.30)),(bear_brown,(.43,.31,.21)),(muzzle,(.66,.55,.41))]:
    n=256;rng=np.random.default_rng(77)
    freq=np.fft.fftfreq(n);fx,fy=np.meshgrid(freq,freq)
    strands=np.fft.ifft2(np.fft.fft2(rng.normal(0,1,(n,n)))*np.exp(-fy*fy*95)).real
    grain=.94+.08*strands/strands.std()+rng.normal(0,.018,(n,n))
    image(m,m.name+' fur grain',np.clip(np.array(base)[None,None,:]*grain[:,:,None],0,1))
DZ=.006  # Snowy's wall stood 6 mm further back; the plaques now rest on the log crowns.
def mount_part(name,p,s,m,parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=xyz((p[0],p[1],p[2]+DZ)))
    o=bpy.context.object;o.name=name;o.scale=(s[0],s[2],s[1]);finish(o,m)
    for f in o.data.polygons:f.use_smooth=True
    bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=parent;o.matrix_world=w
    return o
for animal,x in [('Deer',-1.73),('Bear',1.46)]:
    root=bpy.data.objects.new('Mount_'+animal,None);bpy.context.collection.objects.link(root)
    prefix='Mount_'+animal+'_';coat=hide_brown if animal=='Deer' else bear_brown
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
                    a,b=Vector(xyz((branch[j][0],branch[j][1],branch[j][2]+DZ))),Vector(xyz((branch[j+1][0],branch[j+1][1],branch[j+1][2]+DZ)));d=b-a
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
bpy.context.view_layer.update()
print('WOODLAND_MOUNTS_AND_RUG deer, bear and hide rug added')

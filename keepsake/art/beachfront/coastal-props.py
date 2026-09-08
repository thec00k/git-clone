"""Original, replaceable Beachfront props. Retains clock/lamp interaction anchors."""
import bpy, bmesh, math, random
from mathutils import Vector, noise
ROOT=r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\','/'), 'Only edit Beachfront'
random.seed(27)
def remove(ob): bpy.data.objects.remove(ob,do_unlink=True)
for ob in list(bpy.data.objects):
    if ob.name.startswith(('Beachfront_Prop_','Beachfront_ShoreRock','Beachfront_Preview_Rock','Cabinet_Flowers','Lamp_','Clock_')) or ob.name in ['Accent_Pot','Accent_Leaf1','Accent_Leaf2','Fern_Stems']:
        remove(ob)
# The inherited pot/leaves were batched with unrelated room objects. Remove only
# the cabinet plant's spatial region, keeping every other disconnected component.
for name in ['Woodland_Static_terracotta','Woodland_Static_fern']:
    ob=bpy.data.objects.get(name)
    if ob:
        bm=bmesh.new();bm.from_mesh(ob.data)
        vertices=[v for v in bm.verts if .65<(ob.matrix_world@v.co).x<1.55 and 1.5<(ob.matrix_world@v.co).y<2.05 and .839<(ob.matrix_world@v.co).z<1.55]
        bmesh.ops.delete(bm,geom=vertices,context='VERTS');bm.to_mesh(ob.data);bm.free()

def mat(name,color,rough=.5,metal=0,alpha=1):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m.diffuse_color=(*rgb,alpha);p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
    if alpha<1: m.blend_method='BLEND';m.use_screen_refraction=True;m.show_transparent_back=False
    return m
shell=mat('Coastal | nacre','#ead4bc',.34)
ceramic=mat('Coastal | glazed sea glass','#9ac6c4',.24)
linen=mat('Coastal | warm white linen','#eae4d4',.88)
glass=mat('Coastal | bowl glass','#d6eeee',.09,0,.18)
water=mat('Coastal | bowl water','#88b9be',.16,0,.22)
fishmat=mat('Coastal | copper fish','#dc863d',.38)
dark=mat('Coastal | midnight enamel','#18323b',.28)
stone=mat('Coastal | weathered granite','#8b918c',.96)
brass=bpy.data.materials['M_FanBrass']
teak=bpy.data.materials['Beachfront | warm teak']

def finish(name,m,parent=None):
    ob=bpy.context.view_layer.objects.active;ob.name=name
    ob.data.materials.clear();ob.data.materials.append(m)
    if parent: ob.parent=parent
    return ob
def mesh(name,verts,faces,m,parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);data.materials.append(m)
    if parent:ob.parent=parent
    return ob
def cube(name,loc,size,m,bevel=.008,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=finish(name,m,parent);ob.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=ob.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
    ob.modifiers.new('Corner normals','WEIGHTED_NORMAL');return ob
def sphere(name,loc,scale,m,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=loc);ob=finish(name,m,parent);ob.scale=scale
    for p in ob.data.polygons:p.use_smooth=True
    return ob
def lathe(name,profile,loc,m,parent=None,segments=64):
    verts=[];faces=[]
    for r,z in profile:
        for i in range(segments):
            a=i*2*math.pi/segments;verts.append((loc[0]+r*math.cos(a),loc[1]+r*math.sin(a),loc[2]+z))
    for j in range(len(profile)-1):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
    ob=mesh(name,verts,faces,m,parent)
    for p in ob.data.polygons:p.use_smooth=True
    return ob
def torus(name,loc,r,tube,m):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=tube,major_segments=48,minor_segments=8,location=loc);return finish(name,m)

# Reference-inspired replaceable conch.
exec(compile(open(ROOT+'/art/beachfront/conch-shell.py').read(),'conch-shell.py','exec'))

# Bowl sits on a small teak coaster. Its glass has a real open rim and inner wall.
center=(1.075,1.8,.849)
lathe('Beachfront_Prop_Bowl_Coaster',[(0,0),(.102,0),(.106,.005),(.102,.012),(0,.012)],(center[0],center[1],.84),teak)
profile=[(.065,0),(.079,.007),(.1,.03),(.124,.065),(.135,.11),(.133,.145),(.12,.18),(.103,.201),(.099,.207),(.095,.207),(.099,.199),(.116,.178),(.129,.144),(.131,.11),(.12,.066),(.096,.032),(.074,.012),(0,.012)]
lathe('Beachfront_Prop_Fishbowl',profile,center,glass)
torus('Beachfront_Prop_Bowl_Rim',(center[0],center[1],center[2]+.205),.098,.004,glass)
lathe('Beachfront_Prop_Bowl_Water',[(0,.017),(.072,.017),(.094,.035),(.119,.068),(.13,.11),(.128,.145),(.124,.158),(0,.158)],center,water)
torus('Beachfront_Prop_Waterline',(center[0],center[1],center[2]+.158),.124,.0015,water)
for i in range(12):
    a=i*2.4;r=.057*math.sqrt((i+1)/12)
    sphere('Beachfront_Prop_Pebble_%02d'%i,(center[0]+math.cos(a)*r,center[1]+math.sin(a)*r,center[2]+.018),(.013,.01,.006),shell if i%3 else ceramic)
fish=sphere('Beachfront_Prop_Fish',(1.075,1.767,.944),(.035,.011,.018),fishmat)
mesh('Beachfront_Prop_Fish_Tail',[(1.044,1.767,.944),(1.021,1.767,.966),(1.021,1.767,.925)],[(0,1,2)],fishmat)
mesh('Beachfront_Prop_Fish_Fin',[(1.06,1.767,.956),(1.072,1.767,.97),(1.09,1.767,.955)],[(0,1,2)],fishmat)
sphere('Beachfront_Prop_Fish_Eye',(1.097,1.756,.948),(.002,.0014,.002),dark)

# Ceramic table lamp, broad linen shade and restrained brass neck.
lamp=bpy.data.objects['ks_lamp']
lathe('Beachfront_Prop_Lamp_Base',[(0,-.015),(.054,-.015),(.06,-.009),(.06,.001),(.053,.006),(0,.006)],(0,-.12,0),teak,lamp)
lathe('Beachfront_Prop_Lamp_Ceramic',[(.036,.005),(.048,.018),(.051,.046),(.047,.087),(.034,.125),(.019,.144),(.014,.153)],(0,-.12,0),ceramic,lamp)
lathe('Beachfront_Prop_Lamp_Neck',[(.009,.147),(.009,.25)],(0,-.12,0),brass,lamp,24)
lathe('Beachfront_Prop_Lamp_Shade',[(.101,.23),(.079,.335),(.075,.337),(.074,.331),(.096,.23),(.101,.23)],(0,-.12,0),linen,lamp)
for z,r in [(.23,.10),(.335,.077)]:
    ob=torus('Beachfront_Prop_Lamp_Piping',(0,-.12,z),r,.002,linen);ob.parent=lamp
# Digital clock: one rounded enamel body with a porcelain surround; existing live face retained.
clock=bpy.data.objects['ks_clock']
cube('Beachfront_Prop_Clock_Body',(0,0,.032),(.166,.067,.064),ceramic,.01,clock)
cube('Beachfront_Prop_Clock_Face',(0,-.034,.032),(.143,.006,.045),dark,.005,clock)
for x in [-.052,.052]:cube('Beachfront_Prop_Clock_Foot',(x,.004,.002),(.023,.039,.004),dark,.002,clock)
for n,y in [('ks_clock_digits',-.039),('ks_clock_glass',-.04)]:bpy.data.objects[n].location.y=y
cube('Beachfront_Prop_Clock_Snooze',(0,.002,.065),(.045,.019,.003),linen,.001,clock)

# Shared, deterministic rock meshes: broad broken planes, layered fissures,
# small-scale erosion and baked vertex tones, authored once for Blender and web.
for i,(x,y,z,sx,sy,sz) in enumerate([(-1.35,5.1,.84,1.05,.8,.62),(1.65,5.8,.79,1.2,.9,.57),(-2.05,4.4,.72,.55,.5,.35)]):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5,radius=1,location=(x,y,z))
    ob=finish('Beachfront_ShoreRock_%s'%i,stone)
    for v in ob.data.vertices:
        p=v.co.copy();q=p*2.7+Vector((i*3.7,.8,1.2))
        broad=noise.noise_vector(q*.65)[0]
        fine=noise.noise_vector(q*3.7)[1]
        seam=math.exp(-((p.z+.13*p.x-.14*math.sin(p.y*3))/.045)**2)
        cracks=math.exp(-(math.sin(p.z*9+p.x*1.8+noise.noise_vector(q)[2]*.4)/.12)**2)
        f=1+.24*broad+.06*fine-.075*seam-.024*cracks
        p*=f;p.x+=.1*p.z;p.z=min(p.z,.82+.10*p.x)
        v.co=(p.x*sx,p.y*sy,p.z*sz)
    colors=ob.data.color_attributes.new(name='CoastalRockColor',type='FLOAT_COLOR',domain='POINT')
    for j,v in enumerate(ob.data.vertices):
        q=v.co;grain=noise.noise_vector(q*34)[0];strata=.5+.5*math.sin(q.z*29+q.x*2.7+noise.noise_vector(q*4)[1]*2)
        shade=.22+.055*grain+.055*strata
        if q.z<-.10:shade*=.72
        colors.data[j].color=(shade*.94,shade,shade*.98,1)
    for p in ob.data.polygons:p.use_smooth=True
    ob['asset_role']='shoreline rock; shared Blender and runtime geometry'
nodes=stone.node_tree.nodes
vc=nodes.get('Coastal baked variation') or nodes.new('ShaderNodeVertexColor');vc.name='Coastal baked variation';vc.layer_name='CoastalRockColor'
stone.node_tree.links.new(vc.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
print('Authored coastal shell, fishbowl, ceramic lamp, modern clock and shared eroded rocks.')

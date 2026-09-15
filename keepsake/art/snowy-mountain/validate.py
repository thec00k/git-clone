import bpy,json,os,math,struct
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/room/snowy-mountain/snowy-mountain.glb'))
bpy.context.view_layer.update()
source={o['name']:o for o in json.load(open(os.path.join(ROOT,'art/snowy-mountain/source-inspection.json')))}
def web(v):return [v.x,v.z,-v.y]
def bounds(o):
    p=[web(o.matrix_world@Vector(v)) for v in o.bound_box]
    return [[f(v[k] for v in p) for k in range(3)] for f in [min,max]]
anchors=['Desk','Desk_Drawer','ks_book','ks_archive','ks_archive_drawer','ks_chair','ks_clock','ks_crt','ks_window','ks_window_cactus','ks_lamp','ks_shelf','ks_map','ks_ceiling_fan','ks_ceiling_fan_blades','ks_ceiling_switch','ks_door']
for n in anchors:
    o=bpy.data.objects[n];assert max(abs(a-b) for a,b in zip(web(o.matrix_world.translation),source[n]['position']))<.00015,n
    assert (o.parent.name if o.parent else None)==source[n]['parent'],n+' parent'
desk=bounds(bpy.data.objects['Desk_Top']);lamp=bounds(bpy.data.objects['Lamp_Base']);sill=bounds(bpy.data.objects['Win_Sill'])
assert abs(desk[1][1]-.75)<.0001
assert abs(lamp[0][1]-desk[1][1])<.0002,'lantern contacts desk'
assert abs(sill[1][1]-1.138)<.0002,'original sill props supported'
hearth=bounds(bpy.data.objects['Cabin_Hearth']);frame=bounds(bpy.data.objects['Map_Frame'])
assert hearth[1][0]<bounds(bpy.data.objects['Door_Jamb_L'])[0][0]-.1,'fireplace clears door'
assert hearth[0][2]>1.48+.15,'hearth clears walking boundary'
assert hearth[0][2]>1.43+.2,'hearth clears relocated beanbag'
lantern_parts=[bounds(o) for o in bpy.data.objects['ks_lamp'].children_recursive if o.type=='MESH']
assert max(b[1][1] for b in lantern_parts)-.75<.32,'stocky lantern height'
assert lamp[1][0]-lamp[0][0]>.16,'stocky lantern width'
assert bounds(bpy.data.objects['Cabin_Mountain_0'])[1][2]<=-23.99,'distant mountains'
for name,edge,side in [('Cabin_Deer_Mount',-1.1,-1),('Cabin_Bear_Mount',.8,1)]:
    children=[bounds(o) for o in bpy.data.objects[name].children_recursive if o.type=='MESH']
    assert all(b[1][0]<edge if side==-1 else b[0][0]>edge for b in children),'mount clears window: '+name
assert bounds(bpy.data.objects['Cabin_Window_Reveal'])[1][2]<-2.17,'reveal stays behind sill objects'
assert bounds(bpy.data.objects['Cabin_Window_Rafters'])[0][2]>bounds(bpy.data.objects['Cabin_Window_Triangle'])[1][2]+.04,'window rafter depth clearance'
hit,_,_,_,o,_=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((-.12,2.04,3.82)),Vector((0,1,0)),distance=.35)
assert hit and o.name=='Cabin_Window_Gable_Cap','roof apex sealed'
for x,y,expected in [(.25,2.088,'Cabin_Window_Crossbar'),(-1.4,.201,'Cabin_Chinking')]:
    hit,_,_,_,o,_=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((x,1.90,y)),Vector((0,1,0)),distance=.65)
    assert hit and o.name==expected,'crossbar and sealed log joints: '+expected
for x,y in [(-.75,1.35),(.45,1.35),(-.75,2.75),(.45,2.75),(-.33,3.38),(.03,3.38)]:
    hit,_,_,_,o,_=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((x,1.90,y)),Vector((0,1,0)),distance=.65)
    assert not hit,'window aperture obstructed by '+o.name if o else 'window aperture'
assert bounds(bpy.data.objects['Chair_Fur_Back'])[1][1]>1.15,'substantial back support'
assert bpy.data.objects['Chair_Fur_Back'].parent.name=='ks_chair'
assert not any(o.name.startswith(('Semantic_Curtain','Cozy_Chair','Sky_','Neon_')) for o in bpy.data.objects)
meshes=[o for o in bpy.data.objects if o.type=='MESH'];triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
assert triangles<180000,triangles
assert len(meshes)<350,len(meshes)
asset=open(os.path.join(ROOT,'public/room/snowy-mountain/snowy-mountain.glb'),'rb').read()
gltf=json.loads(asset[20:20+struct.unpack_from('<I',asset,12)[0]])
primitives=sum(len(m['primitives']) for m in gltf['meshes'])
assert primitives<350,primitives
assert os.path.getsize(os.path.join(ROOT,'public/room/snowy-mountain/snowy-mountain.glb'))<8*1024*1024
report={'result':'PASS','anchors':anchors,'triangles':triangles,'meshes':len(meshes),'primitives':primitives,'bytes':len(asset),'desk':desk,'lantern':lamp,'hearth':hearth,'map':frame,'sill':sill}
corner=[web(bpy.data.objects['Cabin_Corner_Stone'].matrix_world@v.co) for v in bpy.data.objects['Cabin_Corner_Stone'].data.vertices]
corner=[v for v in corner if v[0]>2 and v[2]>1.5]
names=set(bpy.data.objects.keys())
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/room/furniture/display-case.glb'))
from mathutils import Matrix
transform=Matrix.Translation((1.84,-1.4,0))@Matrix.Rotation(-3*math.pi/4,4,'Z')
bpy.context.view_layer.update()
case=[web(transform@o.matrix_world@v.co) for o in bpy.data.objects if o.name not in names and o.type=='MESH' for v in o.data.vertices]
case_bounds=[[f(v[k] for v in case) for k in range(3)] for f in [min,max]]
assert case_bounds[1][0]<min(v[0] for v in corner)-.05,'case clears corner stones on X'
assert case_bounds[1][2]<min(v[2] for v in corner)-.1,'case clears corner stones on Z'
assert case_bounds[0][2]>.6-.22+.2,'case clears bookshelf end'
report['displayCase']=case_bounds
json.dump(report,open(os.path.join(ROOT,'art/snowy-mountain/validation.json'),'w'),indent=2)
print('CABIN_VALIDATION_PASS',triangles,len(meshes))

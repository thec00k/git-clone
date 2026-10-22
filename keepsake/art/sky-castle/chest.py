"""Independent pearl/quartz capsule finish; preserve the original lid pivot."""
import bpy, os, json
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(root,'public/room/furniture/time-capsule.glb'))
original={o.name:(o.matrix_world.copy(),o.parent.name if o.parent else None) for o in bpy.data.objects}
original_triangles=sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for p in o.data.polygons)

def mat(name,color,metal=0,rough=.35,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    for key,value in {'Base Color':(*color,1),'Metallic':metal,'Roughness':rough,'Coat Weight':.35,'Emission Color':(*color,1),'Emission Strength':emission}.items():
        p.inputs[key].default_value=value
    return m
pearl=mat('Sky capsule • pearl enamel',(.70,.77,.86),.20,.30)
quartz=mat('Sky capsule • lavender quartz',(.34,.44,.66),.30,.19,.13)
gold=mat('Sky capsule • warm gold',(.58,.32,.085),.80,.27)
velvet=mat('Sky capsule • midnight velvet',(.055,.085,.13),0,.95)
light=mat('Sky capsule • soft moonlight',(.48,.76,.86),.10,.24,.75)
assignments={
 'Body_Interior_cedar':velvet,'Body_Attic_warm_oak':pearl,
 'Body_Dark_worn_oak_edges':quartz,'Body_Aged_honey_brass':gold,
 'Body_Patinated_side_handles':gold,'Lid_Aged_honey_brass':gold,
 'Lid_Attic_warm_oak':pearl,'Lid_Dark_worn_oak_edges':quartz,
}
for name,m in assignments.items():
    o=bpy.data.objects[name];o.data.materials.clear();o.data.materials.append(m)

def xyz(p):return (p[0],-p[2],p[1])
def diamond(name,p,s,m):
    verts=[(p[0]+x*s[0],p[1]+y*s[1],p[2]+z*s[2]) for x,y,z in [(0,1,0),(1,0,0),(0,-1,0),(-1,0,0),(0,0,1),(0,0,-1)]]
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(v) for v in verts],[],[(4,i,(i+1)%4) for i in range(4)]+[(5,(i+1)%4,i) for i in range(4)])
    data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(m)
    return o
diamond('Sky_Capsule_Clasp_Setting',(0,.178,.219),(.044,.058,.009),gold)
diamond('Sky_Capsule_Moonstone',(0,.178,.228),(.031,.043,.016),light)
for x in [-.218,.218]:
    diamond('Sky_Capsule_Quartz_Inlay',(x,.153,.205),(.020,.054,.010),quartz)
for y in [.062,.237]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz((0,y,.204)))
    o=bpy.context.object;o.name='Sky_Capsule_Light_Seam';o.dimensions=(.44,.004,.003)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(light)
    bevel=o.modifiers.new('Rounded light seam','BEVEL');bevel.width=.001;bevel.segments=2
    bpy.ops.object.modifier_apply(modifier=bevel.name)

bpy.context.view_layer.update()
for name,(world,parent) in original.items():
    o=bpy.data.objects[name]
    assert max(abs(o.matrix_world[i][j]-world[i][j]) for i in range(4) for j in range(4))<1e-6,name
    assert (o.parent.name if o.parent else None)==parent,name
points=[o.matrix_world@Vector(v) for o in bpy.data.objects if o.type=='MESH' for v in o.bound_box]
assert min(p.z for p in points)>=0 and max(abs(p.x) for p in points)<.31
assert max(-p.y for p in points)<.25
triangles=sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for p in o.data.polygons)
assert triangles-original_triangles<400,'small detail budget over the unchanged source chest'
out=os.path.join(root,'public/room/sky-castle/time-capsule.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_cameras=False,export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'art/sky-castle/time-capsule.blend'))
with open(os.path.join(root,'art/sky-castle/chest-validation.json'),'w') as f:
    json.dump({'result':'PASS','preservedNodes':list(original),'triangles':triangles,'bytes':os.path.getsize(out),'lidPivot':list(bpy.data.objects['TimeCapsule_LidPivot'].matrix_world.translation)},f,indent=2)
print('SKY_CAPSULE_VALIDATION_PASS',triangles)

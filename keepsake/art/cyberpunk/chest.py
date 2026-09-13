import bpy,os
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(root,'public/room/furniture/time-capsule.glb'))
for m in bpy.data.materials:
 if not m.use_nodes:continue
 p=m.node_tree.nodes.get('Principled BSDF')
 for link in list(m.node_tree.links):m.node_tree.links.remove(link)
 out=m.node_tree.nodes.get('Material Output');m.node_tree.links.new(p.outputs['BSDF'],out.inputs['Surface'])
 hardware='brass' in m.name.lower() or 'handle' in m.name.lower()
 p.inputs['Base Color'].default_value=(.55,.62,.70,1) if hardware else (.20,.25,.32,1)
 p.inputs['Metallic'].default_value=.72;p.inputs['Roughness'].default_value=.25 if hardware else .38
 p.inputs['Emission Color'].default_value=(.10,.15,.22,1);p.inputs['Emission Strength'].default_value=.22
 m.name='Capsule titanium hardware' if hardware else 'Capsule graphite alloy'
points=[o.matrix_world@Vector(v) for o in bpy.data.objects if o.type=='MESH' for v in o.bound_box]
x0,x1=min(p.x for p in points),max(p.x for p in points);front=min(p.y for p in points);height=max(p.z for p in points)
m=bpy.data.materials.new('Capsule cyan inlay');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.025,.65,.85,1);p.inputs['Emission Color'].default_value=(.025,.65,1,1);p.inputs['Emission Strength'].default_value=1.2
for z in [height*.12,height*.51]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=((x0+x1)/2,front-.003,z));o=bpy.context.object;o.name='Capsule_Cyan_Inlay';o.scale=((x1-x0)*.82,.005,.004);o.data.materials.append(m)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'art/cyberpunk/time-capsule-metal.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(root,'public/room/furniture/time-capsule-metal.glb'),export_format='GLB',export_cameras=False,export_lights=False)
print('Metal capsule saved',height)

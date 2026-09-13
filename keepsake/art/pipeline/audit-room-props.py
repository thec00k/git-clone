"""Read shipped room geometry into an isolated Blender process; never save sources."""
import bpy, json, pathlib, re
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]
reports={}
for room in ['woodland','beachfront','cyberpunk']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/room'/room/(room+'.glb')))
 objects=[]
 for o in bpy.data.objects:
  if o.type!='MESH' or not re.search(r'Camera|Mug|Cup|Pencil|Clock|CRT_|Lamp_|Neon_Holo|Neon_Jelly|Beachfront_Prop',o.name,re.I):continue
  pts=[o.matrix_world@Vector(v) for v in o.bound_box]
  objects.append({'name':o.name,'parent':o.parent.name if o.parent else None,'location':list(o.location),'scale':list(o.scale),'rotation':list(o.rotation_euler),'bounds':[[round(min(p[i] for p in pts),5),round(max(p[i] for p in pts),5)] for i in range(3)],'triangles':sum(len(f.vertices)-2 for f in o.data.polygons),'materials':[m.name for m in o.data.materials if m]})
 reports[room]=objects
out=ROOT/'art/demo-work/room-prop-audit.json';out.write_text(json.dumps(reports,indent=2))
print('AUDIT',out)

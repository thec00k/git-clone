import bpy, json, os
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/room/woodland/woodland.glb'))
rows=[]
for o in bpy.data.objects:
    if o.type=='MESH':
        p=[o.matrix_world@Vector(v) for v in o.bound_box]
        coords=[(v.x,v.z,-v.y) for v in p]
        bounds=[[round(f(v[k] for v in coords),4) for k in range(3)] for f in [min,max]]
    else: bounds=None
    v=o.matrix_world.translation
    rows.append(dict(name=o.name,type=o.type,parent=o.parent.name if o.parent else None,position=[round(v.x,4),round(v.z,4),round(-v.y,4)],bounds=bounds,materials=[m.name for m in o.data.materials if m] if o.type=='MESH' else []))
with open(os.path.join(ROOT,'art/snowy-mountain/source-inspection.json'),'w') as f:json.dump(rows,f,indent=2)
print('INSPECTION_COMPLETE',len(rows))


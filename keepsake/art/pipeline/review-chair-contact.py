import bpy
from pathlib import Path
from mathutils import Vector
root=Path.cwd()/'keepsake'
bpy.ops.wm.open_mainfile(filepath=str(root/'art/woodland/woodland.blend'))
chair=bpy.data.objects['ks_chair'];chair.location.z=.045;bpy.context.view_layer.update()
pts=[o.matrix_world@v.co for o in chair.children_recursive if o.type=='MESH' for v in o.data.vertices]
print('Woodland chair bottom:',min(v.z for v in pts))
print('Cushion top:',max((bpy.data.objects['Cozy_Chair_Cushion'].matrix_world@v.co).z for v in bpy.data.objects['Cozy_Chair_Cushion'].data.vertices))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/reviews/woodland-chair-contact-review.blend'))

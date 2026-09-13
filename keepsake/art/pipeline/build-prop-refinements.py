"""Small geometry-only overlays; retain original runtime transforms and materials."""
import bpy, pathlib, json, math
from mathutils import Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2]
TARGETS={'CRT_Back':.003,'CRT_Base':.002,'CRT_Bezel':.0015,'Clock_Back':.0008,'Clock_Bottom':.0008,'Clock_Left':.0008,'Clock_Right':.0008,'Clock_Top':.001}
copies=[];report={}
for room in ['woodland','beachfront','cyberpunk']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/room'/room/(room+'.glb')))
 for name,width in TARGETS.items():
  o=bpy.data.objects.get(name)
  if not o:continue
  before=[(min(v.co[i] for v in o.data.vertices),max(v.co[i] for v in o.data.vertices)) for i in range(3)]
  # Transform applies only inside this derivative, returning vertices to source
  # local space afterwards. Runtime hierarchy and pivots are never replaced.
  old=o.matrix_world.copy();o.parent=None;o.matrix_world=Matrix.Identity(4)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bevel=o.modifiers.new('Light-catching eased edges','BEVEL');bevel.width=width;bevel.segments=3;bevel.limit_method='ANGLE';bevel.angle_limit=.52
  bpy.ops.object.modifier_apply(modifier=bevel.name)
  norm=o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');norm.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=norm.name)
  after=[(min(v.co[i] for v in o.data.vertices),max(v.co[i] for v in o.data.vertices)) for i in range(3)]
  assert all(abs(before[i][j]-after[i][j])<.0001 for i in range(3) for j in range(2)),name
  # Store mesh arrays because read_factory_settings clears all Blender data.
  uv=[tuple(v.uv) for v in o.data.uv_layers.active.data] if o.data.uv_layers.active else None
  copies.append((room+'__'+name,[tuple(v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons],uv))
  report[room+'__'+name]={'original_bounds':before,'refined_bounds':after,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'parent_preserved_at_runtime':True}
bpy.ops.wm.read_factory_settings(use_empty=True)
for name,verts,faces,uv in copies:
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 if uv:
  layer=mesh.uv_layers.new(name='UVMap')
  for loop,value in zip(layer.data,uv):loop.uv=value
 # Face normals preserve planar cabinet surfaces; bevel strips catch the light.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/furniture/prop-refinements.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/room/furniture/prop-refinements.glb'),export_format='GLB',export_yup=True)
(ROOT/'art/demo-work/prop-refinements-validation.json').write_text(json.dumps(report,indent=2))
print('REFINED',len(copies),'casings')

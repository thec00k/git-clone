import bpy,runpy
from pathlib import Path
p=Path(__file__).resolve().parents[2]
runpy.run_path(str(p/'art/woodland-study/quality-pass.py'))
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type not in {'CAMERA','LIGHT'}:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(p/'public/room/woodland-study/woodland-study.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(p/'art/woodland-study/woodland-quality.blend'),compress=True)

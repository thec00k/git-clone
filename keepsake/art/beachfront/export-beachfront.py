import bpy
ROOT = r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\','/'), 'Only export Beachfront'
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
    if not ob.get('blender_preview_only') and not ob.name.startswith('Beachfront_Preview_') and not ob.hide_get() and not ob.hide_render and ob.type in ['MESH','EMPTY','CURVE'] and ob.name not in ['Outside_View','Win_Glass','Beanbag_Original_Backup']:ob.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/room/beachfront/beachfront.glb',export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_tangents=False,export_image_format='JPEG')

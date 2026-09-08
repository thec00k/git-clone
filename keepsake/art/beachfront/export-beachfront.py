"""Compatibility entry point; the shared pipeline owns web exports now."""
import bpy, pathlib, shutil, subprocess
root = pathlib.Path(__file__).resolve().parents[2]
if bpy.app.version < (5, 1, 0):
    raise RuntimeError('Open the source in Blender 5.1 or newer.')
if pathlib.Path(bpy.data.filepath).resolve() != (root/'art/beachfront/beachfront.blend').resolve():
    raise RuntimeError('Open the saved Beachfront source before exporting.')
if bpy.data.is_dirty:
    raise RuntimeError('Save your Blender edits before refreshing the web asset.')
node = shutil.which('node')
if not node:
    raise RuntimeError('Run npm run assets:refresh -- --room beachfront from the keepsake directory.')
subprocess.run([node,str(root/'scripts/refresh-room-assets.mjs'),'--room','beachfront'],cwd=root,check=True)

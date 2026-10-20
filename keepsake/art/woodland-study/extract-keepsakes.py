"""One-off: keep the Snowy Mountain room's deer and bear mounts and hide rug for the Woodland cabin.

The Snowy room was retired on 2026-10-19 (owner request); these three pieces were kept.
Run once in background Blender 5.1 against the Snowy branch's source file:

    git show origin/codex/snowy-mountain-room:keepsake/art/snowy-mountain/snowy-mountain.blend > snowy.blend
    blender -b snowy.blend --factory-startup -P art/woodland-study/extract-keepsakes.py

Writes art/woodland-study/keepsakes.blend, which build.py appends (keepsakes.py). Names change from
Cabin_* to Keepsake_* so the cabin's log passes and checks leave them alone. Geometry and materials
are the Snowy ones; the rug's fur image is repacked as JPEG.
"""
import bpy
from pathlib import Path

OUT = Path(__file__).with_name('keepsakes.blend')
roots = ['Cabin_Deer_Mount', 'Cabin_Bear_Mount', 'Cabin_Hide_Rug', 'Cabin_Hide_Fibres']
keep = set()
for name in roots:
    o = bpy.data.objects[name]
    keep.add(o)
    keep.update(o.children_recursive)

# The rug keeps its marbled fur (the Snowy branch's image-generator texture, see the
# snowy-hide-fur ledger entry), repacked as a 1024 px JPEG: about 0.3 MB instead of a 2.9 MB PNG.
src = bpy.data.images['marbled-fur.png']
tmp = Path(bpy.app.tempdir) / 'keepsake-marbled-fur.jpg'
settings = bpy.context.scene.render.image_settings
settings.file_format = 'JPEG'
settings.quality = 90
src.save_render(str(tmp))
fur = bpy.data.images.load(str(tmp))
fur.name = 'Keepsake marbled fur'
fur.pack()
wool = bpy.data.materials['Cabin | ivory wool']
for node in wool.node_tree.nodes:
    if node.type == 'TEX_IMAGE' and node.image and node.image.name == 'marbled-fur.png':
        node.image = fur

for o in list(bpy.data.objects):
    if o not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
for o in keep:
    o.name = o.name.replace('Cabin_', 'Keepsake_', 1)
for m in bpy.data.materials:
    if m.name.startswith('Cabin | '):
        m.name = 'Keepsake_' + m.name[len('Cabin | '):].title().replace(' ', '_')
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT), compress=True)
print('KEEPSAKES', sorted(o.name for o in keep if o.parent is None), OUT.stat().st_size, 'bytes')

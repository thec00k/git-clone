"""Beachfront furniture remodel: the Woodland cabin's new shapes in pale driftwood, whitewash and sea glass
(owner, 2026-10-20).

Run once in background Blender 5.1 against art/beachfront/beachfront.blend, then publish:

    blender -b art/beachfront/beachfront.blend --factory-startup -P art/beachfront/coastal-remodel.py
    npm run assets:refresh -- --room beachfront

It runs art/woodland-study/furniture-remodel.py with KS_ROOM = 'beachfront' (same shapes, same footprints;
Beachfront keeps its coastal lamp, clock, CRT and arched window), then gives each new part a coastal
material by its ks_family and saves the source in place.
"""
import bpy, math
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHAPES = ROOT / 'art' / 'woodland-study' / 'furniture-remodel.py'
if bpy.data.objects.get('Desk_HandleRose'):
    raise RuntimeError('beachfront.blend is already remodelled; run this on the unremodelled source.')
exec(compile(SHAPES.read_text(encoding='utf8'), str(SHAPES), 'exec'), {'__name__': 'furniture_remodel', 'KS_ROOM': 'beachfront'})

M = bpy.data.materials


def solid(name, rgb, rough, metal=0.0):
    m = M.get(name) or M.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    lin = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb)
    p.inputs['Base Color'].default_value = (*lin, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*lin, 1)
    return m


def driftwood():
    """The coastal teak's grain, bleached to pale silvery driftwood."""
    if M.get('Coastal | pale driftwood'):
        return M['Coastal | pale driftwood']
    m = M['Beachfront | warm teak'].copy()
    m.name = 'Coastal | pale driftwood'
    tex = next(n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE')
    src = tex.image
    w, h = src.size
    px = np.array(src.pixels[:], dtype=np.float32).reshape(h, w, 4)
    lum = px[..., :3] @ np.array([.2126, .7152, .0722], dtype=np.float32)
    lum = (lum - lum.min()) / max(1e-6, float(lum.max() - lum.min()))
    # Linear colours, a narrow range: the grain should whisper, not stripe.
    dark, light = np.array([.66, .62, .55]), np.array([.78, .75, .69])
    rgb = dark[None, None, :] + (light - dark)[None, None, :] * lum[..., None]
    img = bpy.data.images.new('Coastal | pale driftwood grain', w, h, alpha=False)
    img.pixels.foreach_set(np.concatenate([rgb, np.ones((h, w, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    tex.image = img
    return m


drift = driftwood()
white = M['Beachfront | whitewashed wood']
glass = M['Beachfront | sea glass joinery']
canvas = M['Woodland | moss painted joinery']  # the window's soft sea-glass paint; the room is at its 80-material budget
families = {
    'oak': drift, 'veneer': drift, 'joinery': white, 'honey': glass,
    'moss': canvas, 'linen': M['Beachfront | sailcloth'], 'paper': M['Coastal | warm white linen'],
    'forest': glass, 'clay': M['M_Pin'], 'brass': M['M_FanBrass'], 'iron': M['M_FanIron'],
}
# Shelf and cabinet carcasses are whitewashed (the room's palette); drawer fronts and door fields sea glass.
WHITE = ('Shelf_', 'Archive_Top', 'Archive_Side')
GLASS = ('Desk_DrawerPanel', 'Archive_DrawerPanel', 'Door_Field_')


def project(o, tile):
    me = o.data
    uv = me.uv_layers.active or me.uv_layers.new(name='UVMap')
    sc = [abs(v) for v in o.matrix_world.to_scale()]
    dims = [max(v.co[i] for v in me.vertices) - min(v.co[i] for v in me.vertices) for i in range(3)]
    for f in me.polygons:
        dom = max(range(3), key=lambda i: abs(f.normal[i]))
        axes = sorted((i for i in range(3) if i != dom), key=lambda i: dims[i] * sc[i], reverse=True)
        for li in f.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co[axes[0]] * sc[axes[0]] / tile[0], co[axes[1]] * sc[axes[1]] / tile[1])


count = 0
for o in bpy.context.scene.objects:
    fam = o.get('ks_family')
    if not fam or o.type != 'MESH':
        continue
    m = families[fam]
    if fam == 'oak' and o.name.startswith(WHITE):
        m = white
    if o.name.startswith(GLASS):
        m = glass
    o.data.materials.clear()
    o.data.materials.append(m)
    for f in o.data.polygons:
        f.material_index = 0
    project(o, (.24, .24) if fam in ('moss', 'linen', 'paper', 'clay', 'forest') else (1.15, .65))
    count += 1
# The kept archive drawer and desk drawer bodies match the new driftwood.
for n in ['ks_archive_drawer']:
    o = bpy.data.objects.get(n)
    if o:
        o.data.materials.clear()
        o.data.materials.append(drift)
# Beachfront's budget is 350 draws: merge small static parts that share a material into one mesh each.
# Moving parts, interaction anchors and anything the app looks up by name stay separate.


def merge(prefix, name):
    parts = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith(prefix)]
    if len(parts) < 2:
        return
    for o in parts:
        with bpy.context.temp_override(object=o, active_object=o):
            for m in list(o.modifiers):
                bpy.ops.object.modifier_apply(modifier=m.name)
    with bpy.context.temp_override(active_object=parts[0], selected_editable_objects=parts, selected_objects=parts):
        bpy.ops.object.join()
    parts[0].name = name
    parts[0].data.name = name


for prefix, name in [('Shelf_Back', 'Shelf_Back'), ('Beanbag_S', 'Beanbag_StitchedSeams'), ('Door_Hinge', 'Door_Hinges'),
                     ('Archive_Foot', 'Archive_Feet'), ('Chair_Stretcher', 'Chair_Stretchers'),
                     ('Cozy_Guest_Table_Leg', 'Cozy_Guest_Table_Legs'), ('Desk_Leg_', 'Desk_Leg_Ferrules')]:
    if prefix == 'Desk_Leg_':
        # Only the brass shoes: the legs carry different wood.
        parts = [o for o in bpy.context.scene.objects if o.name.endswith('_Ferrule')]
        for i, o in enumerate(parts):
            o.name = 'Desk_Leg_Shoe_%d' % i
        prefix = 'Desk_Leg_Shoe_'
    merge(prefix, name)

# The source also holds review copies of the display case and time capsule. The app loads those from
# public/room/furniture/, so they stay out of the room export (refresh-room.py skips blender_preview_only).
for name in ['Keepsake_Corner_Display_Case', 'Keepsake_TimeCapsule']:
    col = bpy.data.collections.get(name)
    for o in (col.all_objects if col else []):
        o['blender_preview_only'] = True
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
print('COASTAL_REMODEL', count, 'parts')

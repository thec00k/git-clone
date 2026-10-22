"""Sky Castle furniture remodel (owner, 2026-10-22): the Woodland cabin's new shapes, the glass furniture
kept as faceted crystal with sparkle specks and chipped edges, and marble with gold for the other pieces.

art/sky-castle/build.py starts from the retired public/room/woodland/woodland.glb, so this runs once on
the published source instead, exports the room and records it:

    blender -b art/sky-castle/sky-castle.blend --factory-startup -P art/sky-castle/crystal-remodel.py
    node scripts/publish-sky-castle.mjs

It runs art/woodland-study/furniture-remodel.py with KS_ROOM = 'sky-castle' (same shapes and footprints;
Sky Castle keeps its own lamp, clock, CRT, round window, sill shelves and map), then gives each new part
a Sky Castle material by its ks_family.
"""
import bpy, bmesh, math, os
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SHAPES = ROOT / 'art' / 'woodland-study' / 'furniture-remodel.py'
if bpy.context.mode != 'OBJECT':  # the source was saved in edit mode
    bpy.ops.object.mode_set(mode='OBJECT')
if bpy.data.objects.get('Desk_HandleRose'):
    raise RuntimeError('sky-castle.blend is already remodelled; run this on the unremodelled source.')
# The old glass desk's extra parts have names the shared remodel does not know.
for o in list(bpy.data.objects):
    if o.name.startswith(('Desk_Top_Gold', 'Desk_Leg_Quartz', 'Desk_Leg_Gold_Shoe')):
        bpy.data.objects.remove(o, do_unlink=True)
exec(compile(SHAPES.read_text(encoding='utf8'), str(SHAPES), 'exec'), {'__name__': 'furniture_remodel', 'KS_ROOM': 'sky-castle'})

M = bpy.data.materials
rng = np.random.default_rng(2210)


def image(name, rgba):
    n = rgba.shape[0]
    img = bpy.data.images.new(name, n, n, alpha=rgba.shape[2] == 4)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.pack()
    return img


def field(n, sx, sy, power=1.6):
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing='ij')
    f = np.fft.ifft2(np.fft.fft2(rng.normal(0, 1, (n, n))) / (np.sqrt((fx * sx) ** 2 + (fy * sy) ** 2) + 1e-3) ** power).real
    return (f - f.mean()) / f.std()


def crystal():
    """The room's clear quartz with sparkle specks: tiny bright inclusions and a few opal flecks.
    The name keeps 'clear quartz', so SkyCastleFinish still draws it without depth writes."""
    m = M['Sky • clear quartz'].copy()
    m.name = 'Sky • clear quartz crystal'
    p = next(x for x in m.node_tree.nodes if x.type == 'BSDF_PRINCIPLED')
    base = np.array(p.inputs['Base Color'].default_value[:3])
    alpha = p.inputs['Alpha'].default_value
    n = 512
    rgba = np.zeros((n, n, 4))
    rgba[..., :3] = base * (1 + .06 * field(n, 2, 2, 2.0))[..., None]
    rgba[..., 3] = alpha
    for k in range(int(n * n * .004)):  # sparkle specks, 1-2 px
        y, x = rng.integers(0, n, 2)
        s = rng.integers(1, 3)
        rgba[y:y + s, x:x + s, :3] = (1, 1, 1) if rng.random() < .75 else (.72, .62, .95)
        rgba[y:y + s, x:x + s, 3] = .95
    tex = m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image('Sky • crystal specks', rgba)
    m.node_tree.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    m.node_tree.links.new(tex.outputs['Alpha'], p.inputs['Alpha'])
    return m


def marble():
    """Pearl-white marble with soft grey veins and the odd thread of gold."""
    m = M['Sky • porcelain'].copy()
    m.name = 'Sky • white marble'
    p = next(x for x in m.node_tree.nodes if x.type == 'BSDF_PRINCIPLED')
    n = 1024
    warp = field(n, 1.5, 1.5, 2.2)
    y, x = np.mgrid[0:n, 0:n] / n
    veins = np.abs(np.sin((x * 3 + y * 1.4) * math.tau + warp * 2.4))   # broad wandering veins
    fine = np.abs(np.sin((x * 9 - y * 5) * math.tau + warp * 3.1 + field(n, 3, 3, 1.8)))
    grey = np.clip(1 - veins, 0, 1) ** 9 * .55 + np.clip(1 - fine, 0, 1) ** 18 * .3
    gold = (np.clip(1 - fine, 0, 1) ** 40 > .5) & (field(n, 4, 4, 1.4) > 1.1)
    white = np.array([.86, .87, .87])
    rgb = white[None, None, :] * (1 - grey[..., None] * np.array([.42, .40, .36]))
    rgb[gold] = (.70, .52, .24)
    tex = m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image('Sky • white marble veins', np.concatenate([rgb, np.ones((n, n, 1))], axis=2))
    m.node_tree.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = .22  # polished
    return m


quartz, stone = crystal(), marble()
gold = M['Sky • champagne gold']
fabric = {'moss': M['Sky • mist blue'], 'linen': M['Sky • lilac satin'], 'paper': M['Sky • porcelain'],
          'forest': M['Sky • lagoon enamel'], 'clay': M['M_Pin']}
# The glass pieces stay glass (owner); everything else wooden becomes marble, with gold trims.
CRYSTAL = ('Desk_', 'Chair_', 'Cozy_Guest_')


def pick(o, fam):
    if fam in ('brass', 'iron'):
        return gold
    if o.name == 'Finish_Folded_Throw':
        return M['Sky • rose silk']
    if fam in fabric:
        return fabric[fam]
    if o.name.startswith(CRYSTAL):
        return quartz
    return gold if fam == 'joinery' else stone


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


# Chipped crystal edges: the slab outlines bite inward in small facets, shaded flat so they glint.
def profile(length, depth):
    xs, ds, x = [0.0], [rng.uniform(0, depth)], 0.0
    while x < length:
        x += rng.uniform(.012, .025)
        xs.append(x)
        ds.append(rng.uniform(0, depth) * (1.8 if rng.random() < .15 else 1))
    return lambda t: float(np.interp(t, xs, ds))


def prepare(o, step=.012):
    with bpy.context.temp_override(object=o, active_object=o):
        for mod in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for e in list(bm.edges):
        k = int(e.calc_length() / step)
        if k > 0:
            bmesh.ops.subdivide_edges(bm, edges=[e], cuts=k)
    return bm


def chip_rect(o, band, depth):
    bm = prepare(o)
    co = [v.co for v in bm.verts]
    lo = [min(c[i] for c in co) for i in range(3)]
    hi = [max(c[i] for c in co) for i in range(3)]
    sides = {(ax, s): profile(hi[1 - ax] - lo[1 - ax], depth) for ax in (0, 1) for s in (0, 1)}
    for v in bm.verts:
        for ax in (0, 1):
            t = v.co[1 - ax] - lo[1 - ax]
            if v.co[ax] - lo[ax] < band:
                v.co[ax] += sides[(ax, 0)](t)
            elif hi[ax] - v.co[ax] < band:
                v.co[ax] -= sides[(ax, 1)](t)
    for f in bm.faces:
        f.smooth = False
    bm.to_mesh(o.data)
    bm.free()


def chip_round(o, band, depth):
    bm = prepare(o, .01)
    co = [v.co for v in bm.verts]
    cx = (min(c.x for c in co) + max(c.x for c in co)) / 2
    cy = (min(c.y for c in co) + max(c.y for c in co)) / 2
    rx = (max(c.x for c in co) - min(c.x for c in co)) / 2
    ry = (max(c.y for c in co) - min(c.y for c in co)) / 2
    bite = profile(2 * math.pi, depth)
    for v in bm.verts:
        dx, dy = (v.co.x - cx) / rx, (v.co.y - cy) / ry
        if math.hypot(dx, dy) > 1 - band / min(rx, ry):
            k = 1 - bite(math.atan2(dy, dx) % (2 * math.pi)) / min(rx, ry)
            v.co.x, v.co.y = cx + (v.co.x - cx) * k, cy + (v.co.y - cy) * k
    for f in bm.faces:
        f.smooth = False
    bm.to_mesh(o.data)
    bm.free()


for name in ['Desk_Top', 'Desk_Apron_FL', 'Desk_Apron_FR']:
    o = bpy.data.objects.get(name)
    if o:
        chip_rect(o, .02 if name == 'Desk_Top' else .012, .007 if name == 'Desk_Top' else .004)
top = bpy.data.objects.get('Cozy_Guest_Tabletop')
if top:
    chip_round(top, .02, .007)

count = 0
for o in bpy.context.scene.objects:
    fam = o.get('ks_family')
    if not fam or o.type != 'MESH':
        continue
    m = pick(o, fam)
    o.data.materials.clear()
    o.data.materials.append(m)
    for f in o.data.polygons:
        f.material_index = 0
    project(o, (.24, .24) if fam in fabric else (.6, .6))
    count += 1
# Kept wooden parts of the cabinet and shelf match the new marble.
for n in ['ks_archive_drawer', 'Archive_Back', 'Archive_Deck', 'Archive_Header', 'ks_shelf_board_0', 'ks_shelf_board_1', 'ks_shelf_board_2']:
    o = bpy.data.objects.get(n)
    if o:
        o.data.materials.clear()
        o.data.materials.append(stone)
        for f in o.data.polygons:
            f.material_index = 0
        project(o, (.6, .6))


# Stay within the 350-draw budget: merge small static parts that share a material.
def merge(prefix, name):
    parts = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith(prefix)]
    if len(parts) < 2:
        return
    for o in parts:
        with bpy.context.temp_override(object=o, active_object=o):
            for mod in list(o.modifiers):
                bpy.ops.object.modifier_apply(modifier=mod.name)
    with bpy.context.temp_override(active_object=parts[0], selected_editable_objects=parts, selected_objects=parts):
        bpy.ops.object.join()
    parts[0].name = name
    parts[0].data.name = name


for o in [o for o in bpy.context.scene.objects if o.name.endswith('_Ferrule')]:
    o.name = 'Desk_Leg_Shoe_'
for prefix, name in [('Shelf_Back', 'Shelf_Back'), ('Beanbag_S', 'Beanbag_StitchedSeams'), ('Door_Hinge', 'Door_Hinges'),
                     ('Archive_Foot', 'Archive_Feet'), ('Chair_Stretcher', 'Chair_Stretchers'),
                     ('Cozy_Guest_Table_Leg', 'Cozy_Guest_Table_Legs'), ('Desk_Leg_Shoe_', 'Desk_Leg_Shoes')]:
    merge(prefix, name)

bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
out = ROOT / 'public' / 'room' / 'sky-castle' / 'sky-castle.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True, export_apply=True, export_cameras=False,
                          export_lights=False, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('CRYSTAL_REMODEL', count, 'parts', out.stat().st_size, 'bytes')

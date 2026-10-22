"""Beachfront furniture remodel: the Woodland cabin's new shapes in pale driftwood, whitewash and sea glass
(owner, 2026-10-20; driftwood made more like real driftwood 2026-10-21).

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


def field(rng, n, sx, sy, power=1.6):
    """Seamless noise, stretched: long features along x (the grain direction of the projected UVs)."""
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing='ij')
    spectrum = 1 / (np.sqrt((fx * sx) ** 2 + (fy * sy) ** 2) + 1e-3) ** power
    f = np.fft.ifft2(np.fft.fft2(rng.normal(0, 1, (n, n))) * spectrum).real
    return (f - f.mean()) / f.std()


def driftwood():
    """Sea-bleached driftwood: silver-grey, long raised fibres, darker worn grooves, a few fine checks."""
    if M.get('Coastal | pale driftwood'):
        return M['Coastal | pale driftwood']
    n = 1024
    rng = np.random.default_rng(1019)
    fibres = field(rng, n, 40, 1, 1.2)        # fine streaks running along the grain
    grain = field(rng, n, 9, 1, 1.6)          # broader growth bands
    weather = field(rng, n, 3, 3, 2.2)        # soft patches where the sun bleached it more
    # Worn-out soft grain sits lower and darker; hard fibres stand proud and pale.
    height = .45 * np.tanh(grain * .9) + .5 * np.tanh(fibres * 1.3)
    # Fine drying checks: thin dark slits along the grain that taper out.
    checks = np.zeros((n, n))
    for _ in range(26):
        y0, x0, length = rng.integers(0, n), rng.integers(0, n), rng.integers(n // 10, n // 3)
        xs = (x0 + np.arange(length)) % n
        ys = (y0 + np.cumsum(rng.normal(0, .25, length))).astype(int) % n
        taper = np.sin(np.linspace(0, np.pi, length)) ** .7
        checks[ys, xs] = np.maximum(checks[ys, xs], taper)
        checks[(ys + 1) % n, xs] = np.maximum(checks[(ys + 1) % n, xs], taper * .5)
    height -= 1.6 * checks
    tone = np.clip(.56 + .28 * height + .1 * weather, 0, 1)
    # sRGB #6e6b65 (grooves) -> #b4b1aa -> #e0ded7 (bleached ridges): pale silver-grey, barely warm.
    lo, mid, hi = (np.array([.156, .147, .133]), np.array([.456, .439, .402]), np.array([.745, .730, .680]))
    t = tone[..., None]
    rgb = np.where(t < .5, lo + (mid - lo) * (t / .5), mid + (hi - mid) * ((t - .5) / .5))
    rgb = rgb * (1 + .04 * weather[..., None] * np.array([-.4, 0, .6]))  # sun-bleached patches go slightly blue-grey
    m = M['Beachfront | warm teak'].copy()
    m.name = 'Coastal | pale driftwood'
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bsdf = next(x for x in nodes if x.type == 'BSDF_PRINCIPLED')
    tex = next(x for x in nodes if x.type == 'TEX_IMAGE')
    img = bpy.data.images.new('Coastal | pale driftwood grain', n, n, alpha=False)
    img.pixels.foreach_set(np.concatenate([np.clip(rgb, 0, 1), np.ones((n, n, 1))], axis=2).astype(np.float32).ravel())
    img.pack()
    tex.image = img
    # Raised fibres and sunken grooves catch the light (normal map from the same height field).
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 1.5
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 1.5
    nrm = np.stack([-dx, -dy, np.ones_like(dx)], axis=-1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    nimg = bpy.data.images.new('Coastal | pale driftwood relief', n, n, alpha=False)
    nimg.colorspace_settings.name = 'Non-Color'
    nimg.pixels.foreach_set(np.concatenate([nrm * .5 + .5, np.ones((n, n, 1))], axis=2).astype(np.float32).ravel())
    nimg.pack()
    if not bsdf.inputs['Normal'].is_linked:
        ntex = nodes.new('ShaderNodeTexImage')
        ntex.image = nimg
        nmap = nodes.new('ShaderNodeNormalMap')
        nmap.inputs['Strength'].default_value = 1.2
        links.new(ntex.outputs['Color'], nmap.inputs['Color'])
        links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = .9  # dry, salt-bleached: no sheen
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


# Jagged, sea-worn edges on the driftwood slabs and the map frame (owner, 2026-10-21). Edges only bite
# inward, so nothing gets closer to the props or the map; top surfaces keep their height.
import bmesh
from mathutils import Vector
rng = np.random.default_rng(2110)


def profile(length, depth):
    """A worn edge: random bites every 1.5-3 cm, now and then a deeper notch."""
    xs, ds, x = [0.0], [rng.uniform(0, depth)], 0.0
    while x < length:
        x += rng.uniform(.015, .03)
        xs.append(x)
        ds.append(rng.uniform(0, depth) * (1.8 if rng.random() < .12 else 1))
    return lambda t: float(np.interp(t, xs, ds))


def prepare(o, step=.012):
    with bpy.context.temp_override(object=o, active_object=o):
        for mod in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for e in list(bm.edges):
        n = int(e.calc_length() / step)
        if n > 0:
            bmesh.ops.subdivide_edges(bm, edges=[e], cuts=n)
    return bm


def jag_rect(o, a, b, band, depth, inner=None):
    """Slab or frame lying in local axes (a, b): verts within `band` of the outer outline move inward;
    with `inner` (a margin), verts within `band` of the opening move outward (the bars get thinner)."""
    bm = prepare(o)
    co = [v.co for v in bm.verts]
    lo = [min(c[i] for c in co) for i in range(3)]
    hi = [max(c[i] for c in co) for i in range(3)]
    sides = {}
    for ax, other in ((a, b), (b, a)):
        span = hi[other] - lo[other]
        sides[(ax, 0)] = profile(span, depth)
        sides[(ax, 1)] = profile(span, depth)
        if inner:
            sides[(ax, 2)] = profile(span, depth * .7)
            sides[(ax, 3)] = profile(span, depth * .7)
    for v in bm.verts:
        for ax, other in ((a, b), (b, a)):
            t = v.co[other] - lo[other]
            if v.co[ax] - lo[ax] < band:
                v.co[ax] += sides[(ax, 0)](t)
            elif hi[ax] - v.co[ax] < band:
                v.co[ax] -= sides[(ax, 1)](t)
            elif inner:
                i0, i1 = lo[ax] + inner, hi[ax] - inner
                if 0 <= i0 - v.co[ax] < band:
                    v.co[ax] -= sides[(ax, 2)](t)
                elif 0 <= v.co[ax] - i1 < band:
                    v.co[ax] += sides[(ax, 3)](t)
    bm.to_mesh(o.data)
    bm.free()


def jag_round(o, band, depth):
    """Round or oval top: verts near the rim move toward the centre by a worn profile around it."""
    bm = prepare(o, .01)
    co = [v.co for v in bm.verts]
    cx = (min(c.x for c in co) + max(c.x for c in co)) / 2
    cy = (min(c.y for c in co) + max(c.y for c in co)) / 2
    rx = (max(c.x for c in co) - min(c.x for c in co)) / 2
    ry = (max(c.y for c in co) - min(c.y for c in co)) / 2
    bite = profile(2 * math.pi, depth)
    for v in bm.verts:
        dx, dy = (v.co.x - cx) / rx, (v.co.y - cy) / ry
        r = math.hypot(dx, dy)
        if r > 1 - band / min(rx, ry):
            k = 1 - bite(math.atan2(dy, dx) % (2 * math.pi)) / min(rx, ry)
            v.co.x, v.co.y = cx + (v.co.x - cx) * k, cy + (v.co.y - cy) * k
    bm.to_mesh(o.data)
    bm.free()


# Blender axes: slabs lie in x/y; the map frame hangs in y/z (its depth is x).
for name in ['Desk_Top', 'Desk_Apron_FL', 'Desk_Apron_FR']:
    o = bpy.data.objects.get(name)
    if o:
        jag_rect(o, 0, 1, .02 if name == 'Desk_Top' else .012, .007 if name == 'Desk_Top' else .005)
top = bpy.data.objects.get('Cozy_Guest_Tabletop')
if top:
    jag_round(top, .02, .008)
frame = bpy.data.objects.get('Map_Frame')
if frame:
    jag_rect(frame, 1, 2, .016, .012, inner=.07)

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
    if o.name.startswith('Map_Frame'):
        m = drift  # a driftwood frame (owner, 2026-10-21)
    o.data.materials.clear()
    o.data.materials.append(m)
    for f in o.data.polygons:
        f.material_index = 0
    project(o, (.24, .24) if fam in ('moss', 'linen', 'paper', 'clay', 'forest') else (.5, .3) if m is drift else (1.15, .65))
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

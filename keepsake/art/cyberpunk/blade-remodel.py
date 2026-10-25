"""Neon City furniture remodel (owner, 2026-10-25): the Woodland cabin's new shapes, with a cyberpunk,
Blade Runner mood: gunmetal and black enamel instead of wood, worn black leather, amber brass, a thin
cyan underglow on the desk and an amber strip under the shelf crown, stained concrete walls and a
dark, wet-looking floor.

art/cyberpunk/build.py starts from the retired public/room/woodland/woodland.glb, so this runs once on
the published source instead, exports the room and records it:

    blender -b art/cyberpunk/cyberpunk.blend --factory-startup -P art/cyberpunk/blade-remodel.py
    node scripts/publish-cyberpunk.mjs

It runs art/woodland-study/furniture-remodel.py with KS_ROOM = 'cyberpunk' (same shapes and footprints;
Neon City keeps its lava lamp, clock, CRT, rounded window, holograms, jellyfish and skyline), then gives
each new part a Neon City material by its ks_family. The map keeps its original frame and pins, and the
ceiling is left as it was (owner).
"""
import bpy, bmesh, math, tempfile
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHAPES = ROOT / 'art' / 'woodland-study' / 'furniture-remodel.py'
if bpy.context.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
if bpy.data.objects.get('Desk_HandleRose'):
    raise RuntimeError('cyberpunk.blend is already remodelled; run this on the unremodelled source.')
# The owner keeps Neon City's map style (2026-10-25): set the original frame and pins aside, so the shared
# remodel's new frame, pins, cord and nail can be swapped back for them afterwards.
MAP_PARTS = ['Map_Frame', 'Map_Pin_0', 'Map_Pin_1', 'Map_Pin_2', 'Map_Pin_3']
kept_map = {}
for n in MAP_PARTS:
    o = bpy.data.objects[n]
    c = o.copy()
    c.data = o.data.copy()
    c.name = 'Keep_' + n
    bpy.context.collection.objects.link(c)
    kept_map[n] = (c, o.matrix_world.copy())
shapes = {'__name__': 'furniture_remodel', 'KS_ROOM': 'cyberpunk'}
exec(compile(SHAPES.read_text(encoding='utf8'), str(SHAPES), 'exec'), shapes)
box = shapes['box']

M = bpy.data.materials
O = bpy.data.objects
for n in MAP_PARTS + ['Map_Cord', 'Map_Nail']:
    if O.get(n):
        O.remove(O[n], do_unlink=True)
for n, (c, mw) in kept_map.items():
    c.name = n
    c.data.name = n
    c.parent = O['ks_map']
    c.matrix_world = mw
rng = np.random.default_rng(2510)


def image(name, rgb, alpha=False):
    """Values are sRGB (the image's colour space), so .38 is about .12 linear."""
    n = rgb.shape[0]
    rgba = np.concatenate([rgb, np.ones((n, n, 1))], axis=2) if rgb.shape[2] == 3 else rgb
    img = bpy.data.images.new(name, n, n, alpha=alpha)
    img.pixels.foreach_set(np.clip(rgba, 0, 1).astype(np.float32).ravel())
    # Saved and packed as JPEG, so the glTF export keeps JPEG: noise textures are many times smaller than PNG.
    img.filepath_raw = str(Path(tempfile.gettempdir()) / (bpy.path.clean_name(name) + '.jpg'))
    img.file_format = 'JPEG'
    img.save()
    img.source = 'FILE'
    img.reload()
    img.pack()
    return img


def field(n, sx, sy, power=1.6):
    """Tileable noise; sx and sy stretch it (a small sx gives long streaks along x)."""
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing='ij')
    f = np.fft.ifft2(np.fft.fft2(rng.normal(0, 1, (n, n))) / (np.sqrt((fx * sx) ** 2 + (fy * sy) ** 2) + 1e-3) ** power).real
    return (f - f.mean()) / f.std()


def normal_map(height, strength):
    gy, gx = np.gradient(height)
    nrm = np.stack([-gx * strength, -gy * strength, np.ones_like(height)], axis=2)
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    return nrm * .5 + .5


def material(name, rgb, rough, metal, height=None, strength=0.0, normal=None):
    m = M.new(name)
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    p = next(x for x in nodes if x.type == 'BSDF_PRINCIPLED')
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image(name + ' colour', rgb)
    links.new(tex.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if height is not None or normal is not None:
        nt = nodes.new('ShaderNodeTexImage')
        nt.image = normal or image(name + ' normal', normal_map(height, strength))
        nt.image.colorspace_settings.name = 'Non-Color'
        nm = nodes.new('ShaderNodeNormalMap')
        links.new(nt.outputs['Color'], nm.inputs['Color'])
        links.new(nm.outputs['Normal'], p.inputs['Normal'])
    return m


def gunmetal():
    """Satin dark steel: faint long brushing, a few bright scuffs and grime in patches (no bump: it read as wood grain)."""
    n = 512
    brush = field(n, .03, 24, .9)
    grime = field(n, 1.5, 1.5, 2.2)
    scuff = (np.abs(field(n, .3, 9, 1.3)) < .012) & (field(n, 2, 2, 2) > .6)
    v = .38 + .01 * brush - .05 * np.clip(grime, 0, None)
    v[scuff] += .14
    rgb = v[..., None] * np.array([.96, 1.0, 1.06])
    return material('Neon • gunmetal', rgb, .42, .45)  # the room has no environment map: keep metalness moderate


def enamel():
    """Near-black satin enamel with a faint orange-peel."""
    n = 512
    peel = field(n, 6, 6, 1.0)
    rgb = (.12 + .006 * peel)[..., None] * np.array([1, 1, 1.08])
    return material('Neon • black enamel', rgb, .3, .1)


def leather(name, tone, worn, normal=None):
    """Worn leather: thin creases, a fine pebble grain and lighter rubbed patches. The second leather reuses the first's normal map."""
    n = 512
    crease = .6 * np.exp(-(field(n, 6, 6, 1.6) / .05) ** 2) + .3 * np.exp(-(field(n, 14, 14, 1.4) / .04) ** 2)
    grain = field(n, 24, 24, .8)
    rub = np.clip(field(n, 1.2, 1.2, 2.2) - .4, 0, None)
    rgb = np.array(tone)[None, None, :] * (1 + .04 * grain - .35 * crease)[..., None]
    rgb += np.array(worn)[None, None, :] * np.clip(rub * .25, 0, .3)[..., None]
    if normal:
        return material(name, rgb, .5, 0, normal=normal)
    return material(name, rgb, .45, 0, grain * .25 - crease * .6, 1.2)


def wool(name, tone):
    n = 512
    y, x = np.mgrid[0:n, 0:n]
    knit = np.sin(x * math.tau / 8) * np.sin(y * math.tau / 6)
    rgb = np.array(tone)[None, None, :] * (1 + .12 * knit + .06 * field(n, 4, 4, 1.4))[..., None]
    return material(name, rgb, .85, 0)


def stained_concrete():
    """Studio-apartment poured concrete (owner, 2026-10-25): smooth, mottled and stained, with a few drips
    running down, faint formwork seams every 1.2 m by 0.6 m and the odd tie hole. One texture covers 2.4 m."""
    n = 1024
    px = n / 2.4  # pixels per metre
    y, x = np.mgrid[0:n, 0:n] / px  # metres; rows run up the wall
    low = field(n, 1.4, 1.4, 2.3)       # broad clouding
    mid = field(n, 6, 6, 1.6)           # trowel mottling
    pores = field(n, 40, 40, .6)
    drips = np.clip(field(n, .05, 30, 1.0), 0, None) * np.clip(field(n, 2, 2, 2.0) + .3, 0, None)  # vertical streaks in patches
    seam = (np.minimum(x % 1.2, 1.2 - x % 1.2) < .004) | (np.minimum(y % .6, .6 - y % .6) < .004)
    tie = np.zeros((n, n), bool)
    for cx in (.15, 1.05, 1.35, 2.25):
        for cy in (.15, .45, .75, 1.05, 1.35, 1.65, 1.95, 2.25):
            tie |= (x - cx) ** 2 + (y - cy) ** 2 < .011 ** 2
    val = .42 + .025 * mid + .008 * pores - .06 * np.clip(low, 0, None) - .05 * drips
    val = np.where(seam, val - .05, val)
    val = np.where(tie, val - .14, val)
    rgb = val[..., None] * np.array([1.0, .97, .93])
    rgb -= np.clip(low - .8, 0, None)[..., None] * np.array([.02, .03, .045])  # warm rust-brown stain where the clouding is darkest
    height = pores * .15 - seam * 1.5 - tie * 3.0
    return material('Neon • stained concrete', rgb, .72, 0, height, 1.5)


def wet_deck():
    """Dark steel-grey deck boards, satin-wet so neon and the window streak across them."""
    n = 512
    grain = field(n, .15, 5, 1.3)
    puddle = field(n, 1, 1, 2.4)
    rgb = (.17 + .02 * grain - .03 * np.clip(puddle, 0, None))[..., None] * np.array([.95, 1, 1.08])
    return material('Neon • wet deck', rgb, .2, .2)


walls = stained_concrete()
steel, black, floor = gunmetal(), enamel(), wet_deck()
leather_black = leather('Neon • worn black leather', (.15, .13, .12), (.22, .18, .15))
leather_normal = next(x for x in leather_black.node_tree.nodes if x.type == 'TEX_IMAGE' and x.image.name.endswith('normal')).image
leather_ox = leather('Neon • oxblood leather', (.40, .09, .07), (.2, .09, .06), leather_normal)
throw_wool = wool('Neon • amber wool', (.52, .25, .09))
brass = material('Neon • amber brass', np.full((8, 8, 3), (.78, .60, .32)), .34, 1.0)
fabric = {'moss': leather_black, 'linen': leather_black, 'forest': leather_ox, 'paper': M['leather_white'], 'clay': M['M_Pin']}


def pick(o, fam):
    if o.name == 'Finish_Folded_Throw':
        return throw_wool
    if fam == 'brass':
        return brass
    if fam == 'iron':
        return M['Neon Satin Alloy']
    if fam in fabric:
        return fabric[fam]
    return black if fam == 'joinery' else steel


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


def world_project(o, tile):
    """Box-project in world space, so neighbouring wall pieces line up block for block."""
    me = o.data
    uv = me.uv_layers.active or me.uv_layers.new(name='UVMap')
    mw = o.matrix_world
    for f in me.polygons:
        nrm = (mw.to_3x3() @ f.normal)
        dom = max(range(3), key=lambda i: abs(nrm[i]))
        axes = [i for i in range(3) if i != dom]
        if dom == 2:  # floor and ceiling: x, y
            axes = [0, 1]
        else:         # walls: horizontal, then up (Blender z)
            axes = [axes[0], 2]
        for li in f.loop_indices:
            co = mw @ me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co[axes[0]] / tile, co[axes[1]] / tile)


def assign(o, m):
    o.data.materials.clear()
    o.data.materials.append(m)
    for f in o.data.polygons:
        f.material_index = 0


count = 0
for o in bpy.context.scene.objects:
    fam = o.get('ks_family')
    if not fam or o.type != 'MESH':
        continue
    assign(o, pick(o, fam))
    project(o, (.3, .3) if fam in fabric else (.8, .8))
    count += 1
# Kept parts of the cabinet and shelf match the new steel.
for n in ['ks_archive_drawer', 'Archive_Back', 'Archive_Deck', 'Archive_Header', 'ks_shelf_board_0', 'ks_shelf_board_1', 'ks_shelf_board_2']:
    o = O.get(n)
    if o:
        assign(o, steel)
        project(o, (.8, .8))

# Room shell: stained concrete walls, a wet deck floor and black wainscot boards with steel rails.
for o in bpy.context.scene.objects:
    if o.type != 'MESH':
        continue
    if o.name.startswith('Room_Wall_'):
        assign(o, walls)
        world_project(o, 2.4)
    elif o.name.startswith('Woodland_Static_oak_plank_'):
        assign(o, floor)
        project(o, (1.2, 1.2))
    elif o.name == 'Woodland_Static_smoked_oak':
        assign(o, black)
        project(o, (.8, .8))
    elif o.name == 'Woodland_Static_moss_painted_joinery' or o.name.startswith('Trim_'):
        assign(o, steel)
        project(o, (.8, .8))

# The lava lamp's glass and cap reached 3 cm into the window sill's front edge (owner): move it 5 cm forward
# on the desk, so they clear the sill by 2 cm. The wax blobs are not parented to the lamp, so they move too.
LAMP_FORWARD = .05
for o in [O['ks_lamp']] + [o for o in O if o.name.startswith('Neon_Lava_')]:
    o.location.y -= LAMP_FORWARD  # web +z, toward the room

# CRT and clock in Neon City colours (owner): smoked graphite plastic shells, black enamel bezel and clock
# case, amber brass knobs and clock lip, a glowing cyan power toggle and a magenta clock inlay.
plastic = material('Neon • smoked graphite plastic', (.27 + .01 * field(256, 8, 8, 1.2))[..., None] * np.array([.95, .98, 1.08]), .5, .1)
for name, m in [('CRT_Body', plastic), ('CRT_Base', plastic), ('CRT_Back', black), ('CRT_Bezel', black),
                ('CRT_Knob_1', brass), ('CRT_Knob_2', brass), ('CRT_Toggle', M['Neon Cyan']),
                ('Clock_Back', black), ('Clock_Bottom', black), ('Clock_Left', black), ('Clock_Right', black), ('Clock_Top', black),
                ('Clock_BrassLip', brass), ('Clock_Inlay', M['Neon Magenta'])]:
    o = O[name]
    assign(o, m)
    project(o, (.3, .3))

# Thin light strips: cyan under the desk top's front lip, amber under the shelf crown.
desk_strip = box('Neon_Desk_Underglow', (-.15, .7105, -1.3095), (1.70, .005, .007), .002, 'neon', O['Desk'])
shelf = O['ks_shelf']
sz = -shelf.matrix_world.translation.y
shelf_strip = box('Neon_Shelf_Glow', (2.054, 1.806, sz), (.006, .006, 1.36), .002, 'neon', shelf)
assign(desk_strip, M['Neon Cyan'])
assign(shelf_strip, M['Neon Amber'])


# Stay within the 350-primitive budget: merge small static parts that share a material.
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
                     ('Cozy_Guest_Table_Leg', 'Cozy_Guest_Table_Legs'), ('Desk_Leg_Shoe_', 'Desk_Leg_Shoes'),
                     ('Woodland_Static_oak_plank_', 'Woodland_Static_oak_planks')]:
    merge(prefix, name)

bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath, compress=True)
out = ROOT / 'public' / 'room' / 'cyberpunk' / 'cyberpunk.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True, export_apply=True, export_cameras=False,
                          export_lights=False, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('BLADE_REMODEL', count, 'parts', out.stat().st_size, 'bytes')

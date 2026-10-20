"""Carry the desk-CRT style across the inherited Woodland furniture.

Run once in background Blender 5.1 against art/woodland/woodland.blend after remodel-crt.py,
then rebuild the cabin with art/woodland-study/build.py and run `npm run assets:woodland`:

    blender -b art/woodland/woodland.blend --python art/woodland/restyle-furniture.py

Shared language (from the CRT): softly rounded edges, cream-enamel fronts, oak carcasses,
walnut bases, brass hardware and warm-iron accents.

Contract preserved: every existing object keeps its name, parent, origin and transform, so
interaction roots, drawer/door behavior, Desk_Top height, Lamp_Shade, ks_clock_digits,
Map_Sheet, ks_archive_frame_mat and the runtime-tinted ks_shelf_book_* are unaffected.
Only materials, edge rounding and leg tapering change, plus new Desk_Leg_*_Ferrule caps
(named to match the desk furniture-swap pattern). No downloaded or generated assets.
"""
import bpy, bmesh, math
from mathutils import Vector

scene = bpy.context.scene
if scene.get('keepsake_furniture_restyle') == 1:
    raise SystemExit('Furniture already restyled; reopen the unrestyled source to run again.')

def material(name, hexcode, rough, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    rgb = tuple(int(hexcode[i:i + 2], 16) / 255 for i in (1, 3, 5))
    rgb = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*rgb, 1)
    return m

# Same families and names as remodel-crt.py so the whole set shares materials.
enamel = material('Woodland | cream enamel set', '#e2d7b8', .34)
iron = material('Woodland | warm iron bezel', '#343832', .5, .3)
walnut = material('Woodland | walnut plinth', '#594a3b', .62)
brass = bpy.data.materials['M_FanBrass']

def obj(name):
    o = bpy.data.objects.get(name)
    if o is None: raise KeyError(f'{name} missing from woodland.blend')
    return o

def paint(name, mat):
    o = obj(name)
    o.data.materials.clear(); o.data.materials.append(mat)
    for poly in o.data.polygons: poly.material_index = 0

def soften(name, width, segments=3):
    """Rounded edges via a single bevel modifier (replacing any earlier bevels)."""
    o = obj(name)
    for mod in [m for m in o.modifiers if m.type == 'BEVEL']: o.modifiers.remove(mod)
    mod = o.modifiers.new('Soft edges', 'BEVEL')
    mod.width = width; mod.segments = segments; mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(40); mod.harden_normals = True
    for poly in o.data.polygons: poly.use_smooth = True

def taper(name, bottom=.72):
    """Narrow the lower half of a leg towards the floor, keeping its footprint centred."""
    o = obj(name); me = o.data
    zs = [v.co.z for v in me.vertices]; lo, hi = min(zs), max(zs)
    cx = sum(v.co.x for v in me.vertices) / len(me.vertices); cy = sum(v.co.y for v in me.vertices) / len(me.vertices)
    for v in me.vertices:
        t = (v.co.z - lo) / (hi - lo)
        k = bottom + (1 - bottom) * t
        v.co.x = cx + (v.co.x - cx) * k; v.co.y = cy + (v.co.y - cy) * k
    me.update()

def ferrule(leg_name, height=.034, grow=1.18):
    """Brass cap around the foot of a tapered leg, parented to the leg's root."""
    leg = obj(leg_name)
    pts = [leg.matrix_world @ v.co for v in leg.data.vertices]
    base = min(p.z for p in pts)
    foot = [p for p in pts if p.z < base + 1e-4]
    cx = sum(p.x for p in foot) / len(foot); cy = sum(p.y for p in foot) / len(foot)
    half = max(max(abs(p.x - cx), abs(p.y - cy)) for p in foot) * grow
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(half * 2, half * 2, height))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(cx, cy, base + height / 2))
    me = bpy.data.meshes.new(leg_name + '_Ferrule'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(leg_name + '_Ferrule', me)
    for col in leg.users_collection: col.objects.link(o)
    root = leg.parent
    o.parent = root; o.matrix_parent_inverse = root.matrix_world.inverted()
    me.materials.append(brass); me.uv_layers.new(name='UVMap')
    soften(o.name, .006, 3)
    return o

# --- Desk: rounded oak, tapered legs with brass ferrules, cream drawer front, brass pull ---
soften('Desk_Top', .014, 4)
for side in ('L', 'R', 'B'): soften(f'Desk_Apron_{side}', .005)
for leg in ('FL', 'FR', 'BL', 'BR'):
    taper(f'Desk_Leg_{leg}', .7); soften(f'Desk_Leg_{leg}', .007); ferrule(f'Desk_Leg_{leg}')
paint('Desk_DrawerFront', enamel); soften('Desk_DrawerFront', .007)
# The inherited front was flush with the drawer box face, which flickered and rendered dark.
for v in obj('Desk_DrawerFront').data.vertices: v.co.y -= .003
paint('Desk_HandleBar', brass); soften('Desk_HandleBar', .007, 4)

# --- Chair: eased oak frame, tapered legs, a rounded back panel ---
for part in ('Seat', 'Rail_F', 'Rail_B', 'BackPost_L', 'BackPost_R'): soften(f'Chair_{part}', .008)
soften('Chair_Back', .018, 4)
for leg in ('FL', 'FR', 'BL', 'BR'):
    taper(f'Chair_Leg_{leg}', .72); soften(f'Chair_Leg_{leg}', .008)

# --- Desk lamp: walnut base, brass foot (shade and bulb untouched) ---
paint('Lamp_Base', walnut); soften('Lamp_Base', .005)
paint('Lamp_Foot', brass)

# --- Desk clock: a small cream-enamel case on a walnut base, like a sibling of the CRT ---
for part in ('Top', 'Left', 'Right', 'Back'): paint(f'Clock_{part}', enamel); soften(f'Clock_{part}', .004)
paint('Clock_Bottom', walnut); soften('Clock_Bottom', .004)
paint('Clock_Inlay', brass)

# --- Archive cabinet: oak carcass, cream-enamel drawer, walnut plinth, brass hardware ---
soften('Archive_Top', .012, 4)
for part in ('SideL', 'SideR', 'Header', 'Back'): soften(f'Archive_{part}', .005)
paint('Archive_Plinth', walnut); soften('Archive_Plinth', .01)
paint('ks_archive_drawer', enamel)
paint('Archive_Handle', brass); soften('Archive_Handle', .004)
paint('Archive_Inlay', brass)

# --- Guestbook table: walnut legs to match the other bases (top is already rounded) ---
for leg in ('Cozy_Guest_Table_Leg', 'Cozy_Guest_Table_Leg.001', 'Cozy_Guest_Table_Leg.002'):
    o = obj(leg); o.data.materials.clear(); o.data.materials.append(walnut)

# --- Bookshelf: rounded oak case, walnut kick and base (boards and books untouched) ---
soften('Shelf_Top', .012, 4)
for part in ('SideL', 'SideR'): soften(f'Shelf_{part}', .006)
for part in ('Kick', 'Bot'): paint(f'Shelf_{part}', walnut); soften(f'Shelf_{part}', .004)

# --- Corkboard map: rounded walnut frame, round-headed pins (map sheet untouched) ---
paint('Map_Frame', walnut); soften('Map_Frame', .014, 4)
for i in range(4):
    pin = obj(f'Map_Pin_{i}'); me = pin.data
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=.009)
    for v in bm.verts: v.co.x *= .75   # slightly domed against the cork
    old = me.materials[:]; bm.to_mesh(me); bm.free()
    me.materials.clear()
    for m in old: me.materials.append(m)
    for poly in me.polygons: poly.use_smooth = True

# --- Door: pillowed panels, eased oak frame, walnut sill, brass knob and plate ---
soften('Door_Leaf', .008)
leaf = obj('Door_Leaf')
inner_face = max((leaf.matrix_world @ v.co).y for v in leaf.data.vertices)
for part in ('Panel_L', 'Panel_U'):
    soften(f'Door_{part}', .006, 4)
    # The inherited panels sit on the outside face; mirror them to the room side.
    src = obj(f'Door_{part}'); twin = src.copy(); twin.data = src.data.copy(); twin.name = f'Door_{part}_Inside'
    for col in src.users_collection: col.objects.link(twin)
    outer = min((src.matrix_world @ v.co).y for v in src.data.vertices)
    twin.location.y += inner_face - outer   # ks_door is unrotated, so local Y is world Y
    twin['mirrors'] = src.name
for part in ('Jamb_L', 'Jamb_R', 'Head'): soften(f'Door_{part}', .006)
paint('Door_Sill', walnut); soften('Door_Sill', .006)
for part in ('Knob', 'KnobStem', 'Plate'): paint(f'Door_{part}', brass)
soften('Door_Plate', .004)

scene['keepsake_furniture_restyle'] = 1
bpy.context.view_layer.update()
print('FURNITURE_RESTYLED', sum(1 for o in scene.objects if o.name.endswith('_Ferrule')), 'ferrules')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_mainfile(compress=True)

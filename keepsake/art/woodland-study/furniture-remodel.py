"""Illustrated Nostalgia remodel of the Woodland cabin's furniture (owner request, 2026-10-19).

Run by build.py after keepsakes.py and before materials.py. Each piece is rebuilt inside its old
footprint in the approved CRT family: softly rounded edges, tapered and turned legs, walnut frames,
oak carcasses, cream and moss upholstery, oversized brass hardware (bible: handles 115-120 %).

What the app depends on is kept: every root (name, origin, transform), every named child the code
or checks look up (Desk_Top, Desk_Drawer, Archive_Top, ks_archive_drawer, ks_shelf_board_*,
ks_shelf_book_*, Cozy_Guest_Tabletop, Guestbook_Cover, Map_Sheet, Map_Pin_*, Study_ChairSeat, Lamp_Shade,
ks_lamp_bulb, ks_clock_digits ...), the heights things rest on (desk 0.75, cabinet 0.84, shelf boards,
guestbook table 0.679, seat 0.52), moving parts as children of their drawers, and the CRT (approved).
New parts carry o['ks_family'] for materials.py and o['ks_remodel'] so quality-pass.py leaves them.
Coordinates are web metres (x, y up, z); Blender stores (x, -z, y).
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix

C = bpy.context
scene = C.scene


def w(p):
    return Vector((p[0], -p[2], p[1]))


def obj(name):
    return bpy.data.objects.get(name)


def drop(*names):
    for n in names:
        o = obj(n)
        if o:
            bpy.data.objects.remove(o, do_unlink=True)


def finish(o, family, parent=None, smooth=True, keep=None):
    """Material family, remodel flag, parent (keeping the world transform) and an optional final name."""
    o['ks_family'] = family
    o['ks_remodel'] = True
    if smooth and o.type == 'MESH':
        for f in o.data.polygons:
            f.use_smooth = True
    if parent:
        C.view_layer.update()
        mw = o.matrix_world.copy()
        o.parent = parent
        o.matrix_world = mw
    if keep:
        drop(keep)
        o.name = keep
        o.data.name = keep
    return o


def mesh_from(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    C.scene.collection.objects.link(o)
    return o


def soften(o, r, seg=3):
    """Rounded edges where they catch light (bible): bevel + weighted normals, applied on export."""
    if r <= 0:
        return o
    b = o.modifiers.new('Soft edge', 'BEVEL')
    b.width = r
    b.segments = seg
    b.limit_method = 'ANGLE'
    b.harden_normals = True
    n = o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    n.keep_sharp = True
    return o


def box(name, c, s, r=0.0, family='oak', parent=None, keep=None, seg=3):
    """Box centred at web point c, web size s = (x, y, z)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(s[0], s[2], s[1]), verts=bm.verts)
    bmesh.ops.translate(bm, vec=w(c), verts=bm.verts)
    o = mesh_from(name, bm)
    soften(o, min(r, min(s) * .45), seg)
    return finish(o, family, parent, keep=keep)


def frustum(name, bottom, top, bsize, tsize, r=0.0, family='joinery', parent=None, keep=None):
    """Tapered square leg: web centres of the bottom and top faces, (x, z) sizes at each end."""
    bm = bmesh.new()
    vs = []
    for c, (sx, sz) in [(bottom, bsize), (top, tsize)]:
        for dx, dz in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
            vs.append(bm.verts.new(w((c[0] + dx * sx / 2, c[1], c[2] + dz * sz / 2))))
    for f in [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_from(name, bm)
    soften(o, r)
    return finish(o, family, parent, keep=keep)


def lathe(name, profile, c, seg=32, family='brass', parent=None, keep=None, scale=(1, 1), smooth=True, caps=True):
    """Solid of revolution about a vertical axis through web point c; profile = [(radius, height)]
    from bottom to top. A zero radius closes the end. scale stretches it in (x, z) for ovals."""
    bm = bmesh.new()
    rings = []
    for r, h in profile:
        if r <= 1e-6:
            rings.append([bm.verts.new(w((c[0], c[1] + h, c[2])))])
            continue
        ring = []
        for i in range(seg):
            a = i / seg * math.tau
            ring.append(bm.verts.new(w((c[0] + r * math.cos(a) * scale[0], c[1] + h, c[2] + r * math.sin(a) * scale[1]))))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(seg):
                bm.faces.new((a[0], b[(i + 1) % seg], b[i]))
        elif len(b) == 1:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[0]))
        else:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    for ring in (rings[0], rings[-1]) if caps else ():
        if len(ring) > 2:
            bm.faces.new(ring if ring is rings[-1] else list(reversed(ring)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_from(name, bm)
    return finish(o, family, parent, smooth=smooth, keep=keep)


def tube(name, pts, r, family='brass', parent=None, keep=None, seg=10, taper=None):
    """Round bar along web points (a pull, a wire, a stretcher, a bent post)."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = max(1, seg // 4)
    cu.use_fill_caps = True
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*w(p), 1)
        if taper:
            sp.points[i].radius = taper[i]
    o = bpy.data.objects.new(name, cu)
    C.scene.collection.objects.link(o)
    me = bpy.data.meshes.new_from_object(o.evaluated_get(C.evaluated_depsgraph_get()))
    bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.curves.remove(cu)
    m = bpy.data.objects.new(name, me)
    C.scene.collection.objects.link(m)
    return finish(m, family, parent, keep=keep)


def pillow(name, c, s, r, puff, family='moss', parent=None, keep=None, cuts=10, tilt=0.0):
    """Upholstered cushion: a rounded box whose top and bottom swell by `puff` in the middle.
    tilt leans it back about x (radians), for back cushions."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=cuts, use_grid_fill=True)
    hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
    ry = min(r * .6, hy * .9)
    for v in bm.verts:
        # Unit cube -> web local (x, y up, z), then onto a rounded box with corner radii (r, ry, r).
        p = Vector((v.co.x * s[0], v.co.z * s[1], -v.co.y * s[2]))
        inner = Vector((max(-hx + r, min(hx - r, p.x)), max(-hy + ry, min(hy - ry, p.y)), max(-hz + r, min(hz - r, p.z))))
        d = p - inner
        q = Vector((d.x / r, d.y / ry, d.z / r))
        if q.length > 1e-9:
            q.normalize()
            p = inner + Vector((q.x * r, q.y * ry, q.z * r))
        if p.y > hy * .3:
            p.y += puff * max(0, (1 - (p.x / hx) ** 2) * (1 - (p.z / hz) ** 2))
        if tilt:
            p = Matrix.Rotation(tilt, 3, 'X') @ p
        v.co = w((c[0] + p.x, c[1] + p.y, c[2] + p.z))
    o = mesh_from(name, bm)
    return finish(o, family, parent, keep=keep)


def bounds(o):
    pts = [o.matrix_world @ Vector(b) for b in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    # Returned as web min/max (x, y, z).
    return Vector((lo.x, lo.z, -hi.y)), Vector((hi.x, hi.z, -lo.y))


# ---------------------------------------------------------------- Desk
desk = obj('Desk')
drawer = obj('Desk_Drawer')
for n in ['Desk_Apron_B', 'Desk_Apron_L', 'Desk_Apron_R', 'Desk_Leg_BL', 'Desk_Leg_BR', 'Desk_Leg_FL', 'Desk_Leg_FR',
          'Desk_Leg_BL_Ferrule', 'Desk_Leg_BR_Ferrule', 'Desk_Leg_FL_Ferrule', 'Desk_Leg_FR_Ferrule', 'Desk_HandleBar', 'Desk_DrawerFront']:
    drop(n)
# Top surface 0.5 mm under 0.75, so the CRT, lamp, clock and book rest on it without touching faces.
box('Desk_Top_New', (-.15, .7315, -1.685), (1.85, .036, .76), .014, 'oak', desk, 'Desk_Top', seg=4)
for side, x in [('L', -1.037), ('R', .737)]:
    for end, z in [('B', -2.009), ('F', -1.361)]:
        frustum('Desk_Leg_' + end + side, (x, .028, z), (x, .714, z), (.034, .034), (.05, .05), .006, 'oak', desk)
        frustum('Desk_Leg_' + end + side + '_Ferrule', (x, 0, z), (x, .032, z), (.038, .038), (.036, .036), .003, 'brass', desk)
box('Desk_Apron_B', (-.15, .669, -2.0), (1.73, .09, .022), .004, 'oak', desk)
for side, x in [('L', -1.037), ('R', .737)]:
    box('Desk_Apron_' + side, (x, .669, -1.685), (.022, .09, .60), .004, 'oak', desk)
# Front: a centred drawer under the scrapbook between two apron panels.
box('Desk_Apron_FL', (-.761, .669, -1.326), (.502, .09, .022), .004, 'oak', desk)
box('Desk_Apron_FR', (.461, .669, -1.326), (.502, .09, .022), .004, 'oak', desk)
box('Desk_Apron_Rail', (-.15, .618, -1.326), (.72, .012, .022), .003, 'oak', desk)
# Drawer box 2 mm narrower than its front each side, so their ends are not flush (overlap check).
drawer_old = drawer.matrix_world.copy()
box('Desk_Drawer_Box', (-.15, .669, -1.585), (.70, .07, .50), .002, 'oak', desk, 'Desk_Drawer')
drawer = obj('Desk_Drawer')
box('Desk_DrawerFront', (-.15, .669, -1.326), (.716, .082, .022), .006, 'oak', drawer)
box('Desk_DrawerPanel', (-.15, .669, -1.314), (.62, .052, .004), .002, 'oak', drawer)
pull = [(-.15 + dx, .672, -1.308 + .02 * math.sin(math.pi * (dx + .07) / .14)) for dx in [i * .14 / 10 - .07 for i in range(11)]]
tube('Desk_HandleBar', pull, .0055, 'brass', drawer)
for side in (-1, 1):
    rose = lathe('Desk_HandleRose', [(0, 0), (.012, 0), (.012, .003), (.008, .006), (0, .006)], (0, 0, 0), 20, 'brass')
    rose.data.transform(Matrix.Rotation(math.pi / 2, 4, 'X'))  # axis -> web +z, into the room
    rose.location = w((-.15 + side * .07, .672, -1.312))
    finish(rose, 'brass', drawer)

# ---------------------------------------------------------------- Chair (authored facing the desk; materials.py turns it 20 degrees)
chair = obj('ks_chair')
for n in ['Study_ChairBack', 'Study_ChairLeg', 'Study_ChairLeg.001', 'Study_ChairLeg.002', 'Study_ChairLeg.003']:
    drop(n)
seat_old = obj('Study_ChairSeat')
cx, cz = -.54, -.78
leg = [(.0, 0), (.0145, 0), (.016, .03), (.019, .30), (.022, .345), (.022, .36), (.019, .372), (.02, .40), (0, .40)]
for i, (x, z) in enumerate([(-.74, -.97), (-.34, -.97), (-.74, -.60), (-.34, -.60)]):
    lathe('Study_ChairLeg', leg, (x, 0, z), 18, 'joinery', chair)
box('Study_ChairRail', (cx, .385, cz), (.46, .05, .43), .008, 'joinery', chair)
for x in (-.74, -.34):
    tube('Study_ChairStretcher', [(x, .13, -.95), (x, .13, -.62)], .0085, 'joinery', chair)
tube('Study_ChairStretcher', [(-.73, .13, cz), (-.35, .13, cz)], .0085, 'joinery', chair)
# Back posts rise from the rear legs and lean back a little; an arched crest rail joins them.
for x in (-.74, -.34):
    tube('Study_ChairPost', [(x, .40, -.60), (x, .66, -.585), (x, .93, -.56)], .016, 'joinery', chair, taper=[1, .92, .8])
crest = [(-.74 + i * .40 / 10, .925 + .018 * math.sin(math.pi * i / 10), -.56 + .025 * math.sin(math.pi * i / 10)) for i in range(11)]
tube('Study_ChairCrest', crest, .02, 'joinery', chair)
tube('Study_ChairBackRail', [(-.74, .56, -.594), (-.34, .56, -.594)], .011, 'joinery', chair)
pillow('Study_ChairSeat_New', (cx, .459, cz - .005), (.50, .098, .47), .05, .012, 'moss', chair, 'Study_ChairSeat')
pillow('Study_ChairBack', (cx, .745, -.58), (.35, .27, .065), .03, .01, 'moss', chair, tilt=-.09)
# Piping round the seat's top edge.
seat = obj('Study_ChairSeat')
lo, hi = bounds(seat)
rr, y = .05, .459 + .049 - .03
ring = []
for (qx, qz, a0) in [(hi.x - rr, hi.z - rr, 0), (lo.x + rr, hi.z - rr, 90), (lo.x + rr, lo.z + rr, 180), (hi.x - rr, lo.z + rr, 270)]:
    for j in range(7):
        a = math.radians(a0 + j * 15)
        ring.append((qx + rr * math.cos(a), y, qz + rr * math.sin(a)))
tube('Study_ChairPiping', ring + ring[:1], .0035, 'moss', seat)

# ---------------------------------------------------------------- Lamp (slightly oversized shade, bible)
lamp = obj('ks_lamp')
for n in ['Lamp_Base', 'Lamp_Foot', 'Lamp_Neck', 'Lamp_Pole', 'Lamp_Shade']:
    drop(n)
lx, lz = -.9, -1.76
lathe('Lamp_Foot', [(0, 0), (.067, 0), (.068, .004), (.066, .007), (0, .007)], (lx, .75, lz), 40, 'brass', lamp)
lathe('Lamp_Base', [(0, .007), (.064, .007), (.063, .016), (.056, .026), (.04, .036), (.022, .043), (.014, .05), (0, .05)], (lx, .75, lz), 40, 'joinery', lamp)
lathe('Lamp_Pole', [(0, .05), (.0065, .05), (.0065, .205), (0, .205)], (lx, .75, lz), 14, 'brass', lamp)
lathe('Lamp_Neck', [(0, .195), (.012, .195), (.0155, .225), (.0115, .247), (0, .247)], (lx, .75, lz), 24, 'brass', lamp)
sh = lathe('Lamp_Shade', [(.094, .262), (.093, .27), (.06, .352), (.057, .356)], (lx, .75, lz), 48, 'enamel', lamp, smooth=True, caps=False)
sol = sh.modifiers.new('Shade wall', 'SOLIDIFY')
sol.thickness = .0025
sol.offset = -1
# Harp and finial over the shade.
for side in (-1, 1):
    tube('Lamp_Harp', [(lx + side * .012, .99, lz), (lx + side * .05, 1.06, lz), (lx + side * .03, 1.11, lz), (lx, 1.118, lz)], .0018, 'brass', lamp)
lathe('Lamp_Finial', [(0, 0), (.006, 0), (.011, .006), (.009, .013), (.004, .017), (0, .019)], (lx, 1.116, lz), 20, 'brass', lamp)

# ---------------------------------------------------------------- Clock (a small sibling of the CRT)
clock = obj('ks_clock')
for n in ['Clock_Top', 'Clock_Bottom', 'Clock_Left', 'Clock_Right', 'Clock_Back']:
    drop(n)
ox, oz = -.73, -1.99
box('Clock_Bottom', (ox, .7575, oz), (.172, .015, .082), .006, 'joinery', clock)
box('Clock_Top', (ox, .8085, oz), (.166, .014, .078), .006, 'veneer', clock)
for side, x in [('Left', ox - .073), ('Right', ox + .073)]:
    box('Clock_' + side, (x, .783, oz), (.018, .038, .074), .007, 'veneer', clock)
box('Clock_Back', (ox, .783, oz - .028), (.132, .038, .016), .004, 'veneer', clock)
for i, (fx, fz) in enumerate([(-.068, -.03), (.068, -.03), (-.068, .03), (.068, .03)]):
    lathe('Clock_Foot', [(0, 0), (.007, 0), (.008, .002), (.006, .004), (0, .004)], (ox + fx, .746, oz + fz), 14, 'brass', clock)
# Feet lift the whole clock (digits and glass too) by 4 mm onto the desk.
clock.location.z += .004

# ---------------------------------------------------------------- Archive cabinet
arc = obj('ks_archive')
adr = obj('ks_archive_drawer')
for n in ['Archive_Top', 'Archive_SideL', 'Archive_SideR', 'Archive_Plinth', 'Archive_Handle', 'Archive_HandlePostL', 'Archive_HandlePostR']:
    drop(n)
ax, az = 1.22, -1.805
box('Archive_Top', (ax, .8175, az + .006), (.624, .045, .516), .016, 'oak', arc, seg=4)
for side, x in [('L', ax - .282), ('R', ax + .282)]:
    box('Archive_Side' + side, (x, .4375, az - .006), (.022, .715, .48), .006, 'oak', arc)
    box('Archive_SidePanel' + side, (x + (-.011 if side == 'L' else .011), .45, az - .006), (.008, .52, .34), .004, 'oak', arc)
box('Archive_Plinth', (ax, .055, az), (.616, .05, .492), .008, 'joinery', arc)
for i, (fx, fz) in enumerate([(-.27, -.21), (.27, -.21), (-.27, .21), (.27, .21)]):
    frustum('Archive_Foot', (ax + fx, 0, az + fz), (ax + fx, .03, az + fz), (.05, .05), (.06, .06), .006, 'joinery', arc)
dlo, dhi = bounds(adr)
fz = dhi.z
box('Archive_DrawerPanel', (ax, .46, fz + .002), (.46, .56, .006), .004, 'honey', adr)
box('Archive_LabelFrame', (ax, .66, fz + .006), (.13, .05, .004), .002, 'brass', adr)
box('Archive_LabelCard', (ax, .66, fz + .0085), (.11, .034, .001), 0, 'paper', adr)
handle = [(ax + dx, .56, fz + .006 + .03 * math.sin(math.pi * (dx + .085) / .17)) for dx in [i * .17 / 10 - .085 for i in range(11)]]
tube('Archive_Handle', handle, .007, 'brass', adr)
for side, dx in [('L', -.085), ('R', .085)]:
    p = lathe('Archive_HandlePost' + side, [(0, 0), (.013, 0), (.013, .004), (.009, .008), (0, .008)], (0, 0, 0), 20, 'brass')
    p.data.transform(Matrix.Rotation(math.pi / 2, 4, 'X'))
    p.location = w((ax + dx, .56, fz + .002))
    finish(p, 'brass', adr)

# ---------------------------------------------------------------- Guestbook table and guestbook
gb = obj('ks_guestbook')
for n in ['Cozy_Guest_Tabletop', 'Cozy_Guest_LowerShelf', 'Cozy_Guest_Table_Leg', 'Cozy_Guest_Table_Leg.001', 'Cozy_Guest_Table_Leg.002',
          'Guestbook_Cover', 'Guestbook_Pages']:
    drop(n)
gx, gz = -1.48, -1.61
top_profile = [(0, .637), (.24, .637), (.25, .640), (.255, .65), (.255, .666), (.25, .675), (.24, .679), (0, .679)]
lathe('Cozy_Guest_Tabletop', top_profile, (gx, 0, gz), 64, 'oak', gb, scale=(1, .8))
lathe('Cozy_Guest_LowerShelf', [(0, .195), (.16, .195), (.165, .2), (.165, .214), (.16, .219), (0, .219)], (gx, 0, gz), 48, 'oak', gb, scale=(1, .8))
for i in range(3):
    a = math.radians(90 + i * 120)
    tx, tz = gx + .14 * math.cos(a), gz + .112 * math.sin(a)
    bx, bz = gx + .185 * math.cos(a), gz + .15 * math.sin(a)
    tube('Cozy_Guest_Table_Leg', [(bx, .0, bz), ((bx + tx) / 2, .3, (bz + tz) / 2), (tx, .637, tz)], .019, 'joinery', gb, taper=[.7, .9, 1])
# Guestbook: cloth boards a little larger than the page block, with a rounded spine.
boards = [box('Guestbook_Cover', (gx, .68075, gz), (.26, .0035, .328), .0015, 'forest', gb),
          box('Guestbook_CoverTop', (gx, .71725, gz), (.26, .0035, .328), .0015, 'forest', gb)]
with C.temp_override(active_object=boards[0], selected_editable_objects=boards, selected_objects=boards):
    bpy.ops.object.join()
spine = lathe('Guestbook_Spine', [(0, 0), (.0195, 0), (.0195, .328), (0, .328)], (0, 0, 0), 16, 'forest')
spine.data.transform(Matrix.Rotation(math.pi / 2, 4, 'X'))
spine.data.transform(Matrix.Diagonal((.6, 1, 1, 1)))
spine.location = w((gx - .127, .699, gz - .164))
finish(spine, 'forest', gb)
box('Guestbook_Pages', (gx + .006, .699, gz), (.244, .033, .31), .0015, 'paper', gb)

# ---------------------------------------------------------------- Bookshelf
sh_root = obj('ks_shelf')
for n in ['Shelf_Top', 'Shelf_SideL', 'Shelf_SideR', 'Shelf_Bot', 'Shelf_Kick', 'Shelf_Back']:
    drop(n)
sx, sz = 2.2, -.34
for side, z in [('L', .359), ('R', -1.039)]:
    box('Shelf_Side' + side, (sx, .93, z), (.28, 1.86, .028), .008, 'oak', sh_root)
box('Shelf_Top', (sx - .012, 1.846, sz), (.304, .028, 1.484), .01, 'oak', sh_root)
box('Shelf_Crown', (sx - .004, 1.822, sz), (.29, .02, 1.46), .008, 'joinery', sh_root)
box('Shelf_Bot', (sx, .015, sz), (.28, .03, 1.384), .004, 'joinery', sh_root)
box('Shelf_Kick', (2.08, .03, sz), (.02, .06, 1.365), .006, 'joinery', sh_root)
for i in range(6):
    z = sz - .6825 + (i + .5) * 1.365 / 6
    box('Shelf_Back', (2.331, .93, z), (.016, 1.8, 1.365 / 6 - .004), .002, 'oak', sh_root)
for i in range(3):
    b = obj('ks_shelf_board_%d' % i)
    if b and not b.modifiers:
        soften(b, .006)
# Books: softer spines read better at shelf distance (bible: clearer book silhouettes).
for o in list(sh_root.children):
    if o.name.startswith('ks_shelf_book_') and not o.modifiers:
        soften(o, .003, 2)

# ---------------------------------------------------------------- Corkboard map
mp = obj('ks_map')
for n in ['Map_Frame', 'Map_Pin_0', 'Map_Pin_1', 'Map_Pin_2', 'Map_Pin_3']:
    drop(n)
mx = -2.447  # back of the frame, on the log crowns (check-woodland-study-assets.mjs)
ylo, yhi, zlo, zhi, bw = 1.1725, 2.5075, -.8725, .9725, .07
for name, c, size in [('Map_Frame_T', (mx + .035, yhi - bw / 2, .05), (.07, bw, 1.845)), ('Map_Frame_B', (mx + .035, ylo + bw / 2, .05), (.07, bw, 1.845)),
                     ('Map_Frame_L', (mx + .035, 1.84, zhi - bw / 2), (.07, 1.335 - 2 * bw, bw)), ('Map_Frame_R', (mx + .035, 1.84, zlo + bw / 2), (.07, 1.335 - 2 * bw, bw))]:
    box(name, c, size, .014, 'joinery', mp)
parts = [obj(n) for n in ['Map_Frame_T', 'Map_Frame_B', 'Map_Frame_L', 'Map_Frame_R']]
frame = parts[0]
with C.temp_override(active_object=frame, selected_editable_objects=parts, selected_objects=parts):
    bpy.ops.object.join()
frame.name = 'Map_Frame'
frame.data.name = 'Map_Frame'
for i, (y, z) in enumerate([(2.29, .68), (2.26, -.52), (1.51, .2), (1.39, -.28)]):
    pin = lathe('Map_Pin_%d' % i, [(0, 0), (.0015, 0), (.0015, .012), (.009, .012), (.011, .017), (.008, .022), (.0085, .031), (0, .034)], (0, 0, 0), 16, 'clay')
    pin.data.transform(Matrix.Rotation(math.pi / 2, 4, 'Y'))  # axis -> +x, into the room
    pin.location = w((-2.387, y, z))
    finish(pin, 'clay', mp)
# The frame hangs on a cord from a nail driven into the crown of the log above it.
from mathutils.bvhtree import BVHTree
lv, lp = [], []
for o in scene.objects:
    if o.type == 'MESH' and o.name.startswith('Cabin_Side_Log') and o.matrix_world.translation.x < 0:
        m = o.evaluated_get(C.evaluated_depsgraph_get()).to_mesh()
        base = len(lv)
        lv += [o.matrix_world @ v.co for v in m.vertices]
        lp += [[base + k for k in f.vertices] for f in m.polygons]
logs = BVHTree.FromPolygons(lv, lp)
hits = []
for k in range(15):
    y = yhi + .1 + k * .01
    hit = logs.ray_cast(w((0, y, .05)), Vector((-1, 0, 0)), 3)
    if hit[0] is not None:
        hits.append((hit[0].x, y))
nx, ny = max(hits)  # the log crown: the point closest to the room
tube('Map_Cord', [(mx + .006, yhi - .01, -.55), (max(nx, mx) + .004, ny, .05), (mx + .006, yhi - .01, .65)], .0016, 'clay', mp)
nail = lathe('Map_Nail', [(0, 0), (.0015, 0), (.0015, .012), (.006, .012), (.006, .016), (0, .017)], (0, 0, 0), 12, 'iron')
nail.data.transform(Matrix.Rotation(math.pi / 2, 4, 'Y'))
nail.location = w((max(nx, mx) + .0005, ny, .05))  # on the crown, never behind the frame's back plane
finish(nail, 'iron', mp)

# ---------------------------------------------------------------- Door
door = obj('ks_door')
for n in ['Door_Head', 'Door_Jamb_L', 'Door_Jamb_R', 'Door_Leaf', 'Door_Panel_L', 'Door_Panel_U', 'Door_Panel_L_Inside', 'Door_Panel_U_Inside',
          'Door_Knob', 'Door_KnobStem', 'Door_Plate', 'Door_Sill']:
    drop(n)
box('Door_Head', (.15, 2.13, 2.095), (1.02, .06, .11), .01, 'oak', door)
for side, x in [('L', -.33), ('R', .63)]:
    box('Door_Jamb_' + side, (x, 1.05, 2.095), (.06, 2.1, .11), .01, 'oak', door)
box('Door_Leaf', (.15, 1.05, 2.07), (.86, 2.04, .036), .006, 'oak', door)
for face, z in [('', 2.0505), ('_Inside', 2.0895)]:
    for tag, y, h in [('L', .58, .78), ('U', 1.52, .78)]:
        box('Door_Panel_' + tag + face, (.15, y, z), (.60, h, .006), .004, 'oak', door)
        box('Door_Field_' + tag + face, (.15, y, z + (-.004 if not face else .004)), (.50, h - .1, .008), .02, 'oak', door)
for o in (lathe('Door_Rose', [(0, 0), (.026, 0), (.026, .004), (.02, .008), (0, .008)], (0, 0, 0), 28, 'brass'),
          lathe('Door_Knob', [(0, .008), (.008, .008), (.009, .02), (.022, .03), (.026, .042), (.02, .054), (0, .057)], (0, 0, 0), 28, 'brass')):
    o.data.transform(Matrix.Rotation(-math.pi / 2, 4, 'X'))  # axis -> web -z, into the room
    o.location = w((-.21, 1.0, 2.052))
    finish(o, 'brass', door)
box('Door_Plate', (-.21, .92, 2.0505), (.034, .07, .004), .012, 'brass', door)
box('Door_Keyhole', (-.21, .915, 2.048), (.006, .02, .002), .002, 'iron', door)
for y in (.25, 1.05, 1.85):
    box('Door_Hinge', (.585, y, 2.05), (.02, .1, .006), .003, 'brass', door)
    lathe('Door_HingePin', [(0, 0), (.006, 0), (.006, .106), (0, .106)], (.595, y - .053, 2.05), 12, 'brass', door)  # knuckle ends stand 3 mm past the leaf
box('Door_Sill', (.15, .015, 2.105), (.92, .03, .12), .01, 'joinery', door)

# ---------------------------------------------------------------- Window joinery
win = obj('ks_window')
for o in list(win.children):
    if o.name.startswith(('Study_WindowJamb', 'Study_WindowRail', 'Study_TransomFrame')) and not o.modifiers:
        if o.name.startswith('Study_WindowJamb'):
            o.data.transform(Matrix.Diagonal((1, .976, 1, 1)))  # .17 -> .166 deep
        soften(o, .008)
sill = obj('Win_Sill')
if sill:
    for m in list(sill.modifiers):
        sill.modifiers.remove(m)
    soften(sill, .012, 4)

# ---------------------------------------------------------------- Beanbag (original; replaces the CC BY Sketchfab model)
bean = obj('Beanbag')
drop('Beanbag_StitchedSeams', 'Finish_Folded_Throw')
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1)


def top_height(x, y):
    """Height of the bag's upper surface over local (x, y); +y is the back, -y the seat front."""
    back = .30 * (1 / (1 + math.exp(-(y - .25) * 5)))
    hollow = .13 * math.exp(-((x / .5) ** 2 + ((y + .05) / .45) ** 2))
    return .36 + back - hollow


sphere = [v.co.copy() for v in bm.verts]
for v in bm.verts:
    x, y, z = v.co
    if z >= 0:
        k = z ** .6
        h = top_height(x * .9, y * .9)
        nz = k * h + (1 - k) * .14
        sag = 1 + .07 * math.sin(math.pi * min(1, nz / .5))  # the bag bulges at mid height
    else:
        nz = .14 * (1 + z) ** 1.6  # flat base that turns up softly at the edge
        sag = 1 + .05 * (1 + z)
    v.co = Vector((x * .47 * sag, y * .45 * sag, nz + .012))  # the object sits 12 mm below the floor
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new('Beanbag')
bm.to_mesh(me)
bm.free()
old = bean.data
bean.data = me
bpy.data.meshes.remove(old)
bean['ks_family'] = 'linen'
bean['ks_remodel'] = True
for f in me.polygons:
    f.use_smooth = True
# Panel seams: piping on four half-meridians that meet at the top, and round the base.
pos = [me.vertices[i].co + me.vertices[i].normal * .002 for i in range(len(me.vertices))]
seams = []
for k in range(4):
    a = k * math.pi / 2
    line = [i for i, o in enumerate(sphere) if o.z > -.35 and o.xy.length > 1e-6 and abs((math.atan2(o.y, o.x) - a + math.pi) % math.tau - math.pi) < 1e-3]
    line.sort(key=lambda i: -sphere[i].z)
    top = max(range(len(sphere)), key=lambda i: sphere[i].z)
    seams.append([pos[top]] + [pos[i] for i in line])
ring_z = min({round(o.z, 4) for o in sphere}, key=lambda z: abs(z + .55))
ring = sorted((i for i, o in enumerate(sphere) if abs(o.z - ring_z) < 1e-3), key=lambda i: math.atan2(sphere[i].y, sphere[i].x))
seams.append([pos[i] for i in ring + ring[:1]])
mw = bean.matrix_world
for i, line in enumerate(seams):
    pts = [mw @ p for p in line]
    tube('Beanbag_StitchedSeams' if i == 0 else 'Beanbag_Seam', [(p.x, p.z, -p.y) for p in pts], .0035, 'linen', bean)
# A folded moss throw left on the seat.
ty = -.12
tz = top_height(.05 / .47 * .9, ty / .45 * .9) + .012
throw = pillow('Finish_Folded_Throw', (0, 0, 0), (.34, .04, .24), .018, .005, 'moss', None, cuts=6)
throw.data.transform(Matrix.Translation((.05, ty, tz + .016)) @ Matrix.Rotation(.10, 4, 'X') @ Matrix.Rotation(.35, 4, 'Z'))
throw.matrix_world = bean.matrix_world.copy()
finish(throw, 'moss', bean)

C.view_layer.update()
print('FURNITURE_REMODEL', sum(1 for o in scene.objects if o.get('ks_remodel')), 'parts')

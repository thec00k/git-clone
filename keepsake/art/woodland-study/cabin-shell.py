"""Solid log walls and a log-beam ceiling for the Woodland study. Run by build.py after the
sealed shell, window, door and hearth exist, and before materials.py / quality-pass.py.

References (owner, 2026-10-17): stacked logs that touch each other with no visible backing,
logs that run straight into the door and window frames, and a plank ceiling carried on log
joists and two heavy support beams, with the ceiling fan hanging clear between them.

All coordinates use Three.js metres (x, y up, z); Blender stores (x, -z, y).
"""
import bpy, bmesh, math, random
from mathutils import Vector

rng = random.Random(1017)
def web(p): return Vector((p[0], -p[2], p[1]))

def mesh_object(name, bm):
    # Origin at the piece's centre, so quality-pass.py can batch it by where it sits.
    centre = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)
    bmesh.ops.translate(bm, verts=bm.verts, vec=-centre)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.location = centre
    return o

# Per-log tones (multiplied over the log texture through the 'Tone' colour attribute): honey,
# amber, weathered tan and a few darker logs, as in the owner's references.
TONES = [(1, .97, .93), (.94, .88, .81), (1.02, .94, .84), (.88, .81, .74), (.98, .96, .91), (.83, .75, .67), (.93, .86, .76)]

def log(name, a, b, radius, back=None, segments=16, taper=0.0, step=.7):
    """Round log from a to b (web metres). `back` = (axis, plane), e.g. ('x', -2.55): the log is
    modelled only in front of that wall plane, as a round barrel closed by a flat back face.
    Barrel, back and end faces are split by sharp edges, so the shading stays round right into
    the crease between two courses. Rings every `step` metres carry a slight swell, and the
    'Tone' colour gives each log its own shade, drifting along its length and darker in the
    creases (or on top, against the ceiling, for free-standing logs)."""
    av, bv = Vector(a), Vector(b); axis = (bv - av).normalized(); length = (bv - av).length
    if back:
        i = 'xyz'.index(back[0]); out = Vector([0, 0, 0]); out[i] = math.copysign(1, back[1])
    else:
        out = Vector((0, 1, 0)) if abs(axis.y) < .9 else Vector((1, 0, 0))
    out = (out - axis * out.dot(axis)).normalized(); m = axis.cross(out)
    rings_n = max(1, round(length / step)); swell, phase = rng.uniform(.004, .009), rng.uniform(0, 6.28)
    tone = Vector(rng.choice(TONES)) * rng.uniform(.96, 1.03)
    bm = bmesh.new(); rings = []; ring_angles = []; ring_t = []
    uv = bm.loops.layers.uv.new('MaterialUV'); col = bm.loops.layers.float_color.new('Tone')
    for j in range(rings_n + 1):
        t = j / rings_n; centre = av.lerp(bv, t)
        r = radius * (1 - taper * t + swell * math.sin(math.pi * t) / radius * .5) + .002 * math.sin(phase + t * 9)
        if back:
            # Angle from the wall-facing direction at which the barrel meets the wall plane.
            start = math.acos(max(-1, min(1, (abs(back[1]) - centre.dot(out)) / r)))
        else: start = 0
        span = 2 * math.pi - 2 * start
        if j == 0: count = segments if not back else max(4, round(segments * span / (2 * math.pi)))
        angles = [start + span * k / count for k in range(count + (1 if back else 0))]
        rings.append([bm.verts.new(web(centre + out * (math.cos(f) * r) + m * (math.sin(f) * r))) for f in angles])
        ring_angles.append((angles, r)); ring_t.append(t)
    closed = not back; n = len(rings[0])
    def shade(j, ang):
        along = .95 + .05 * math.sin(phase * 1.7 + ring_t[j] * 7) * math.cos(phase + ring_t[j] * 3)
        if back:
            front = math.pi; half = (2 * math.pi - 2 * ring_angles[j][0][0]) / 2
            crease = 1 - .2 * min(1, abs(ang - front) / half) ** 3
        else:
            crease = 1 - .14 * max(0, math.cos(ang)) ** 2
        c = tone * along * crease
        return (c.x, c.y, c.z, 1)
    # Grain runs along the log and wraps around it (u: length, v: arc), on the oak tile sizes
    # materials.py uses (1.15 m x .65 m); a per-log offset keeps neighbouring logs from repeating.
    du, dv = rng.random(), rng.random()
    for j in range(rings_n):
        for k in range(n if closed else n - 1):
            k2 = (k + 1) % n
            f = bm.faces.new((rings[j][k], rings[j][k2], rings[j + 1][k2], rings[j + 1][k])); f.smooth = True
            for loop, (jj, kk) in zip(f.loops, [(j, k), (j, k + 1), (j + 1, k + 1), (j + 1, k)]):
                angs, r = ring_angles[jj]
                ang = angs[kk % n] if (closed or kk < n) else angs[-1]
                if closed and kk == n: ang = angs[0] + 2 * math.pi
                loop[uv].uv = (du + ring_t[jj] * length / 1.15, dv + ang * radius / .65)
                loop[col] = shade(jj, ang)
    flat = [bm.faces.new(list(reversed(rings[0]))), bm.faces.new(rings[-1])]
    if not closed:
        for j in range(rings_n): flat.append(bm.faces.new((rings[j][0], rings[j + 1][0], rings[j + 1][-1], rings[j][-1])))
    for f in flat:
        f.smooth = False
        for loop in f.loops:
            loop[uv].uv = (du + loop.vert.co.x * 3, dv + (loop.vert.co.y + loop.vert.co.z) * 3)
            loop[col] = (*(tone * .9), 1)
        for e in f.edges: e.smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_object(name, bm)
    attrs = o.data.color_attributes; attrs.active_color_name = 'Tone'; attrs.render_color_index = attrs.active_color_index
    return o

def cut(o, outline, axis):
    """Remove the part of a wall log inside an opening. `outline` is a convex polygon in the wall
    plane (u, y) and the cutter is extruded through the wall along `axis` ('z' or 'x')."""
    bm = bmesh.new()
    for depth in (-3.0, 3.0):
        for u, y in outline:
            p = (u, y, depth) if axis == 'z' else (depth, y, u)
            bm.verts.new(web(p))
    n = len(outline); v = bm.verts; v.ensure_lookup_table()
    bm.faces.new([v[i] for i in range(n)]); bm.faces.new([v[n + i] for i in reversed(range(n))])
    for i in range(n): bm.faces.new((v[i], v[n + i], v[n + (i + 1) % n], v[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    cutter = mesh_object('Cutter', bm)
    mod = o.modifiers.new('Opening', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cutter; mod.solver = 'EXACT'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

# --- Sealed shell ----------------------------------------------------------------------------
# The flat shell walls stay as the room's backing, but move out so their inner faces sit on the
# logs' back planes (x = +-2.55, z = +-2.19). Before, they stood in front of the creases between
# courses and showed as pale strips, which made the logs look glued on.
for o in bpy.context.scene.objects:
    n = o.name
    if n.startswith('Study_SideWall'): o.location.x += math.copysign(.06, o.location.x)
    elif n.startswith(('Study_WindowWall', 'Study_TransomLeft', 'Study_TransomRight')): o.location.y += .065
    elif n.startswith(('Study_DoorWall', 'Study_DoorLintel')): o.location.y -= .065

# --- Walls ----------------------------------------------------------------------------------
# Courses keep the existing pitch and the same room-side crown as before (furniture, map, shelf
# and camera corridors are unchanged). The radius grows so neighbouring logs overlap 35 mm:
# the seam is a shadowed crease between two round logs instead of a strip of flat wall.
PITCH, R, COURSES = .225, .13, 17
SIDE_CROWN, END_CROWN = 2.453, 2.093         # room-side faces of the logs, as before
# Openings, inset 10 mm under the frames so every log end tucks behind a jamb, rail or head.
# Window: square opening plus the triangular transom (frame centre line (-1.115,3.05)-(-.15,3.69)-(.815,3.05)).
slope = .64 / .965; lift = .025 * math.hypot(1, slope)
WINDOW = [(-1.14, 1.085), (.84, 1.085), (.84, 3.05 + lift - .025 * slope), (-.15, 3.69 + lift), (-1.14, 3.05 + lift - .025 * slope)]
DOOR = [(-.35, -.2), (.65, -.2), (.65, 2.15), (-.35, 2.15)]

for i in range(COURSES):
    y = .115 + i * PITCH
    r = R + rng.uniform(-.004, .004)
    for sx in (-1, 1):
        c = sx * (SIDE_CROWN + r)
        # Side logs run into the end walls' shells, so each inner corner closes on log, not wall.
        log('Cabin_Side_Log', (c, y, -2.19), (c, y, 2.19), r, back=('x', sx * 2.55))
    zw = -(END_CROWN + r)
    o = log('Cabin_Window_Log', (-2.55, y, zw), (2.55, y, zw), r, back=('z', -2.19))
    if y + r > 1.085 and y - r < 3.73: cut(o, WINDOW, 'z')
    zd = END_CROWN + r
    o = log('Cabin_Door_Log', (-2.55, y, zd), (2.55, y, zd), r, back=('z', 2.19))
    if y - r < 2.15: cut(o, DOOR, 'z')

# --- Door and window casing -----------------------------------------------------------------
# Wide walnut casing boards (as in the owner's French-door reference) frame each opening on the
# room side, set 10 mm into the log crowns so the logs read as scribed to them.
def board(name, centre, size, tilt=0.0):
    """Flat board in a wall plane: centre (web), size (width, height, depth), tilt about the wall normal."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=web(centre))
    o = bpy.context.object; o.name = o.data.name = name
    o.dimensions = (size[0], size[2], size[1]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler = (0, -tilt, 0); bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    bev = o.modifiers.new('Eased edges', 'BEVEL'); bev.width = .004; bev.segments = 2
    return o
CASE_W, CASE_T = .12, .04
wz = -END_CROWN + CASE_T / 2 - .01            # window wall casing centre (room side is +z)
for x in (-1.15 - CASE_W / 2, .85 + CASE_W / 2):
    board('Cabin_Trim_Window', (x, 2.09, wz), (CASE_W, 2.05, CASE_T))
board('Cabin_Trim_Window', (-.15, 1.087 - .06, wz), (2.02, .12, CASE_T))          # apron under the sill
d = Vector((.965, .64)).normalized(); nrm = Vector((-d.y, d.x)); off = .035 + CASE_W / 2
for side, extra in ((-1, 0.0), (1, .002)):   # the right board sits 2 mm proud so the apex overlap never flickers
    p0 = Vector((-1.115, 3.05)) if side < 0 else Vector((.815, 3.05)); apex = Vector((-.15, 3.69))
    dd = (apex - p0).normalized(); nn = Vector((-dd.y, dd.x)) if side < 0 else Vector((dd.y, -dd.x))
    a = p0 + nn * off - dd * .1; b = apex + nn * off + dd * .09; mid = (a + b) / 2
    board('Cabin_Trim_Window', (mid.x, mid.y, wz + extra), ((b - a).length, CASE_W, CASE_T + 2 * extra), math.atan2(dd.y, dd.x))
dz = END_CROWN - CASE_T / 2 + .01             # door wall casing centre (room side is -z)
board('Cabin_Trim_Door', (-.36 - .0225, 1.13, dz), (.045, 2.26, CASE_T))          # narrow: the mantel is 5 cm away
board('Cabin_Trim_Door', (.66 + CASE_W / 2 - .02, 1.13, dz), (CASE_W - .04, 2.26, CASE_T))
board('Cabin_Trim_Door', ((-.409 + .76) / 2, 2.16 + .05, dz - .002), (1.169, .10, CASE_T + .004))  # 4 mm past the narrow side board, so their ends never share a face

# --- Ceiling --------------------------------------------------------------------------------
# Tongue-and-groove boards under the sealed ceiling, carried by round log joists, which rest on
# two heavy support beams spanning window wall to door wall. The centre stays open for the fan.
CEIL = 3.85; BOARD_T = .022; board_w, gap = .135, .008
x = -2.55
while x < 2.55 - .01:
    w = min(board_w, 2.55 - x)
    bpy.ops.mesh.primitive_cube_add(size=1, location=web((x + w / 2, CEIL - BOARD_T / 2, 0)))
    o = bpy.context.object; o.name = o.data.name = 'Cabin_Ceiling_Board'; o.dimensions = (w - gap, 4.38, BOARD_T)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    x += w
JOIST_R, JOIST_Y = .11, CEIL - BOARD_T - .085
for z in (-1.6, -.85, .85, 1.6):
    r = JOIST_R + rng.uniform(-.006, .006)
    log('Cabin_Ceiling_Joist', (-2.55, JOIST_Y, z), (2.55, JOIST_Y, z), r, segments=18, taper=.04)
BEAM_R = .15; BEAM_Y = JOIST_Y - JOIST_R - BEAM_R + .03   # joists notch 30 mm into the beams
for xb in (-1.55, 1.55):
    # Beam ends run into the window and door walls' top courses.
    log('Cabin_Ceiling_Beam', (xb, BEAM_Y, -2.19), (xb, BEAM_Y, 2.19), BEAM_R, segments=20, taper=.03)

# --- Ceiling fan ----------------------------------------------------------------------------
# The inherited fan hangs from the centre board between the joists, blades below the beams.
fan = bpy.data.objects.get('ks_ceiling_fan')
if fan:
    BLADES_Y = 3.20
    blades = bpy.data.objects['ks_ceiling_fan_blades']
    fan.location.z += BLADES_Y - blades.matrix_world.translation.z
    bpy.context.view_layer.update()
    top = CEIL - BOARD_T
    canopy = bpy.data.objects['Fan_Canopy']
    canopy_top = max((canopy.matrix_world @ Vector(c)).z for c in canopy.bound_box)
    canopy.location.z += top - canopy_top
    rod = bpy.data.objects['Fan_Rod']; bpy.context.view_layer.update()
    inv = rod.matrix_world.inverted(); zs = [(rod.matrix_world @ v.co).z for v in rod.data.vertices]
    mid = (min(zs) + max(zs)) / 2
    for v, z in zip(rod.data.vertices, zs):
        if z > mid:
            world = rod.matrix_world @ v.co; world.z = top - .01; v.co = inv @ world
    rod.data.update()

bpy.context.view_layer.update()
print('CABIN_SHELL', sum(1 for o in bpy.context.scene.objects if o.name.startswith('Cabin_')), 'log, board and beam pieces')

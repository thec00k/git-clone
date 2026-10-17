"""Illustrated Nostalgia remodel of the inherited desk CRT (ks_crt).

Run once in background Blender 5.1 against the unremodeled art/woodland/woodland.blend,
then publish through `npm run assets:refresh -- --room woodland`:

    blender -b art/woodland/woodland.blend --python art/woodland/remodel-crt.py

Contract preserved: the ks_crt root (transform and interaction properties) and the
CRT_Screen mesh, whose UVs carry the runtime "Keepsake Radio" lettering, are untouched.
Replacement parts keep CRT_* names so furniture swaps still hide them.
All geometry is authored here; no downloaded or generated assets.
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix

root = bpy.data.objects['ks_crt']
if root.get('keepsake_crt_remodel') == 1:
    raise SystemExit('CRT already remodeled; reopen the unremodeled source to run again.')
screen = bpy.data.objects['CRT_Screen']

def local_bounds(objects):
    inv = root.matrix_world.inverted()
    pts = [inv @ (o.matrix_world @ Vector(c)) for o in objects for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

# Measure before replacing anything so the new set keeps the old desk footprint.
foot_lo, foot_hi = local_bounds([o for o in root.children if o.type == 'MESH'])
s_lo, s_hi = local_bounds([screen])
sx, sz = (s_lo.x + s_hi.x) / 2, (s_lo.z + s_hi.z) / 2
shw, shh = (s_hi.x - s_lo.x) / 2, (s_hi.z - s_lo.z) / 2

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

# Same restrained families as the Woodland study: cream enamel, warm iron, aged brass, walnut.
enamel = material('Woodland | cream enamel set', '#e2d7b8', .34)
iron = material('Woodland | warm iron bezel', '#343832', .5, .3)
brass = bpy.data.materials.get('M_FanBrass') or material('Woodland | aged brass', '#bda16b', .36, .72)
walnut = material('Woodland | walnut plinth', '#594a3b', .62)

def merge(target, source):
    tmp = bpy.data.meshes.new('tmp'); source.to_mesh(tmp); source.free()
    target.from_mesh(tmp); bpy.data.meshes.remove(tmp)

def replace(name, bm, mat, bevel=0.0, segments=3):
    """Swap the mesh of a named part (or create it), keeping it parented to ks_crt."""
    ob = bpy.data.objects.get(name)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    if ob is None:
        ob = bpy.data.objects.new(name, me)
        for col in root.users_collection: col.objects.link(ob)
    else:
        old = ob.data; ob.data = me
        if old.users == 0: bpy.data.meshes.remove(old)
    ob.modifiers.clear()
    ob.parent = root; ob.matrix_parent_inverse.identity()
    ob.location = (0, 0, 0); ob.rotation_euler = (0, 0, 0); ob.scale = (1, 1, 1)
    me.materials.append(mat)
    for poly in me.polygons: poly.use_smooth = True
    if bevel:
        mod = ob.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel; mod.segments = segments; mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40); mod.harden_normals = True
    me.uv_layers.new(name='UVMap')
    return ob

def shaped_box(lo, hi, shape):
    """Unit cube mapped into [lo, hi]; shape(x, y, z) returns per-vertex scale factors."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    c = (lo + hi) / 2; d = hi - lo
    for v in bm.verts:
        x, y, z = v.co; kx, kz, dz = shape(x, y, z)
        v.co = Vector((c.x + x * d.x * kx, c.y + y * d.y, c.z + dz + z * d.z * kz))
    return bm

def rounded_rect(hw, hh, r, steps=6):
    pts = []
    for cx, cy, a0 in [(hw - r, hh - r, 0), (-hw + r, hh - r, 90), (-hw + r, -hh + r, 180), (hw - r, -hh + r, 270)]:
        for i in range(steps + 1):
            a = math.radians(a0 + 90 * i / steps)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def disc(center, radius, depth, segments):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector(center))
    return bm

# --- Proportions (ks_crt local metres: x right, -y front, z up) -----------------------
front = s_lo.y + .004                 # screen glass sits 4 mm proud of the cabinet face
plinth_top = foot_lo.z + .028
body_lo = Vector((foot_lo.x + .012, front, plinth_top))
body_hi = Vector((foot_hi.x - .012, front + .245, s_hi.z + .04))

# Plinth: a slightly oversized walnut slab that grounds the set on the desk.
plinth = shaped_box(Vector((foot_lo.x, front - .012, foot_lo.z)), Vector((foot_hi.x, body_hi.y + .01, plinth_top)), lambda x, y, z: (1, 1, 0))
replace('CRT_Base', plinth, walnut, bevel=.008)

# Cabinet: chunky, softly rounded, a touch narrower at the crown.
cabinet = shaped_box(body_lo, body_hi, lambda x, y, z: (.94 if z > 0 else 1, 1, 0))
replace('CRT_Body', cabinet, enamel, bevel=.03, segments=4)

# Tube housing: a tapered hood behind the cabinet, the classic silhouette from above.
hood_lo = Vector((body_lo.x + .03, body_hi.y - .02, body_lo.z + .02))
hood_hi = Vector((body_hi.x - .03, body_hi.y + .085, body_hi.z - .03))
hood = shaped_box(hood_lo, hood_hi, lambda x, y, z: (.62, .62, -.015) if y > 0 else (1, 1, 0))
replace('CRT_Back', hood, enamel, bevel=.022)

# Bezel: rounded frame whose inner corners round off the rectangular screen glass.
outer = rounded_rect(shw + .02, shh + .02, .032); inner = rounded_rect(shw - .004, shh - .004, .02)
bezel = bmesh.new()
rings = [[bezel.verts.new((sx + px, y, sz + pz)) for px, pz in pts]
         for pts in (outer, inner) for y in (s_lo.y - .007, front + .006)]
o_f, o_b, i_f, i_b = rings
for i in range(len(outer)):
    j = (i + 1) % len(outer)
    bezel.faces.new((o_f[i], o_f[j], i_f[j], i_f[i]))   # front
    bezel.faces.new((o_b[j], o_b[i], i_b[i], i_b[j]))   # rear
    bezel.faces.new((o_f[j], o_f[i], o_b[i], o_b[j]))   # outer wall
    bezel.faces.new((i_f[i], i_f[j], i_b[j], i_b[i]))   # inner wall
bmesh.ops.recalc_face_normals(bezel, faces=bezel.faces)
replace('CRT_Bezel', bezel, iron, bevel=.004, segments=2)

# Controls under the screen: two brass knobs and a small iron rocker.
knob_z = (plinth_top + (sz - shh - .02)) / 2
for name, x in [('CRT_Knob_1', sx - shw + .03), ('CRT_Knob_2', sx - shw + .072)]:
    knob = disc((x, front - .006, knob_z), .0125, .016, 20)
    merge(knob, disc((x, front - .016, knob_z), .008, .006, 16))
    replace(name, knob, brass, bevel=.002, segments=2)
toggle = bmesh.new(); bmesh.ops.create_cube(toggle, size=1)
bmesh.ops.scale(toggle, verts=toggle.verts, vec=(.026, .012, .011))
bmesh.ops.translate(toggle, verts=toggle.verts, vec=(sx + shw - .03, front - .004, knob_z))
replace('CRT_Toggle', toggle, iron, bevel=.003, segments=2)

# Rabbit-ear antenna: a brass dome with two splayed rods, the strongest nostalgic read.
antenna = bmesh.new()
dome = Vector(((body_lo.x + body_hi.x) / 2 + .05, body_lo.y + .16, body_hi.z - .004))
bmesh.ops.create_uvsphere(antenna, u_segments=16, v_segments=8, radius=.026)
for v in antenna.verts:
    v.co.z = max(v.co.z, 0) * .7
    v.co += dome
for side in (-1, 1):
    tilt = Vector((side * math.sin(math.radians(24)), .12, math.cos(math.radians(24)))).normalized()
    base, length = dome + Vector((0, 0, .012)), .19
    rod = bmesh.new()
    bmesh.ops.create_cone(rod, cap_ends=True, segments=8, radius1=.0028, radius2=.0018, depth=length)
    bmesh.ops.rotate(rod, verts=rod.verts, cent=(0, 0, 0), matrix=Vector((0, 0, 1)).rotation_difference(tilt).to_matrix())
    bmesh.ops.translate(rod, verts=rod.verts, vec=base + tilt * (length / 2))
    merge(antenna, rod)
    tip = bmesh.new()
    bmesh.ops.create_uvsphere(tip, u_segments=10, v_segments=6, radius=.0055)
    bmesh.ops.translate(tip, verts=tip.verts, vec=base + tilt * length)
    merge(antenna, tip)
replace('CRT_Antenna', antenna, brass)

root['keepsake_crt_remodel'] = 1
bpy.context.view_layer.update()
lo, hi = local_bounds([o for o in root.children if o.type == 'MESH'])
print('CRT_REMODELED', sorted(o.name for o in root.children), 'local bounds', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_mainfile(compress=True)

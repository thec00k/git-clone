"""Builds the holiday props from scratch and exports one small GLB each to public/room/holiday/.

Run headless with Blender 5.1 (or the bpy 5.1 wheel):
    blender -b -P art/holiday/build.py            # or: python art/holiday/build.py
Add `--preview DIR` after the script (blender: after `--`) to also render a PNG of each prop.

Units are metres. glTF is Y-up, so Blender +Y becomes glTF -Z: faces modelled towards +Y face -Z in the app.
Shading comes from vertex colours (multiplied with each material's base colour), so no textures are needed.
"""
import math
import sys
from pathlib import Path

import bpy  # first: the bpy module wheel provides bmesh and mathutils once imported
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'room' / 'holiday'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, rough=0.75, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit:
        p.inputs['Emission Color'].default_value = (*emit, 1)
        p.inputs['Emission Strength'].default_value = strength
    return m


def to_object(name, bm, mats, smooth=True, shade=None):
    """bmesh -> object. `shade(v)` gives a grey 0..1 per vertex for the colour attribute."""
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)  # outward, so the app's back-face culling keeps the outside
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    for poly in me.polygons:
        poly.use_smooth = smooth
    col = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for li, loop in enumerate(me.loops):
        g = shade(me.vertices[loop.vertex_index].co) if shade else 1.0
        col.data[li].color = (g, g, g, 1)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def lathe_grid(bm, rows, closed_top=None, closed_bottom=None):
    """rows: list of rings (lists of Vector), top to bottom, equal lengths. Optional pole vertices."""
    vs = [[bm.verts.new(p) for p in ring] for ring in rows]
    n = len(rows[0])
    for a, b in zip(vs, vs[1:]):
        for j in range(n):
            bm.faces.new((a[j], a[(j + 1) % n], b[(j + 1) % n], b[j]))
    if closed_top is not None:
        t = bm.verts.new(closed_top)
        for j in range(n):
            bm.faces.new((t, vs[0][(j + 1) % n], vs[0][j]))
    if closed_bottom is not None:
        t = bm.verts.new(closed_bottom)
        for j in range(n):
            bm.faces.new((t, vs[-1][j], vs[-1][(j + 1) % n]))
    return vs


def tube(bm, path, radii, sides=8, cap=True):
    """A tube along a list of points (Vectors) with a radius per point."""
    rings = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        a = d.orthogonal().normalized()
        b = d.cross(a)
        rings.append([p + (a * math.cos(2 * math.pi * k / sides) + b * math.sin(2 * math.pi * k / sides)) * radii[i] for k in range(sides)])
    vs = lathe_grid(bm, rings)
    if cap:
        bm.faces.new(list(reversed(vs[0])))
        bm.faces.new(vs[-1])


# ---------------------------------------------------------------- pumpkin
R, H, LOBES = 0.09, 0.072, 8  # matches the old placeholder: radius 9 cm, squashed to 80 %


def lobe(theta):
    return abs(math.cos(LOBES / 2 * theta)) ** 0.5


def pumpkin_rows(seg=48, rings=26):
    rows = []
    for i in range(1, rings):
        phi = math.pi * i / rings  # 0 = top
        r0 = math.sin(phi) * R
        y = math.cos(phi) * H - 0.24 * H * math.exp(-((phi / 0.42) ** 2)) + 0.12 * H * math.exp(-(((math.pi - phi) / 0.4) ** 2))
        ring = []
        for j in range(seg):
            t = 2 * math.pi * j / seg
            r = r0 * (0.9 + 0.1 * lobe(t))
            ring.append(Vector((r * math.cos(t), r * math.sin(t), y)))
        rows.append(ring)
    return rows


def pumpkin_shade(v):
    t = math.atan2(v.y, v.x)
    return 0.7 + 0.3 * lobe(t) - 0.12 * max(0.0, -v.z / H)


def add_pumpkin_body(name, skin):
    bm = bmesh.new()
    lathe_grid(bm, pumpkin_rows(), closed_top=(0, 0, H * 0.76), closed_bottom=(0, 0, -H * 0.88))
    return to_object(name, bm, [skin], shade=pumpkin_shade)


def add_stem(name, mat, top=H * 0.76, scale=1.0):
    bm = bmesh.new()
    pts = [Vector((0.006 * (t ** 2) * scale, 0, top - 0.004 + 0.042 * t * scale)) for t in [i / 6 for i in range(7)]]
    tube(bm, pts, [0.012 * scale * (1 - 0.35 * i / 6) for i in range(7)], sides=6)
    return to_object(name, bm, [mat], smooth=False, shade=lambda v: 0.75 + 0.25 * ((v.z - top) / (0.042 * scale)))


def build_pumpkin():
    skin = material('Pumpkin_Skin', (0.85, 0.32, 0.05), rough=0.6)
    stem = material('Pumpkin_Stem', (0.25, 0.27, 0.1), rough=0.9)
    return [add_pumpkin_body('Pumpkin', skin), add_stem('Pumpkin_Stem', stem)]


# ---------------------------------------------------------------- jack-o'-lantern
def face_polys():
    """Carved face in the XZ plane (x across, z up), metres. Faces +Y."""
    eye = lambda cx: [(cx - 0.017, 0.012), (cx + 0.017, 0.012), (cx + 0.004 * (1 if cx > 0 else -1), 0.04)]
    nose = [(-0.009, -0.004), (0.009, -0.004), (0.0, 0.011)]
    # A grin with two square teeth hanging from the top lip.
    top = [(-0.052, -0.01), (-0.03, -0.021), (-0.022, -0.021), (-0.022, -0.033), (-0.008, -0.033), (-0.008, -0.024),
           (0.008, -0.024), (0.008, -0.033), (0.022, -0.033), (0.022, -0.021), (0.03, -0.021), (0.052, -0.01)]
    bottom = [(0.04 * math.cos(a), -0.02 - 0.03 * math.sin(a)) for a in [math.pi * k / 10 for k in range(1, 10)]]
    mouth = top + bottom
    return [eye(-0.03), eye(0.03), nose, mouth]


def add_cutter(polys, mat):
    bm = bmesh.new()
    for poly in polys:
        front = [bm.verts.new((x, 0.0, z)) for x, z in poly]
        back = [bm.verts.new((x, R * 1.4, z)) for x, z in poly]
        n = len(poly)
        f = bm.faces.new(front)
        bm.faces.new(list(reversed(back)))
        for i in range(n):
            bm.faces.new((front[i], back[i], back[(i + 1) % n], front[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    return to_object('Cutter', bm, [mat], smooth=False)


def build_jack():
    skin = material('Pumpkin_Skin', (0.85, 0.32, 0.05), rough=0.6)
    glow = material('Lantern_Glow', (1.0, 0.55, 0.12), rough=0.9, emit=(1.0, 0.5, 0.12), strength=2.5)
    flesh = material('Lantern_Flesh', (1.0, 0.72, 0.3), rough=0.8, emit=(1.0, 0.6, 0.2), strength=0.6)
    stem = material('Pumpkin_Stem', (0.25, 0.27, 0.1), rough=0.9)
    body = add_pumpkin_body('JackOLantern', skin)
    body.data.materials.append(glow)
    body.data.materials.append(flesh)
    sol = body.modifiers.new('Shell', 'SOLIDIFY')
    sol.thickness = 0.007
    sol.offset = -1
    sol.material_offset = 1  # inner wall glows
    sol.material_offset_rim = 2
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier='Shell')
    cutter = add_cutter(face_polys(), flesh)
    boo = body.modifiers.new('Carve', 'BOOLEAN')
    boo.operation = 'DIFFERENCE'
    boo.solver = 'EXACT'
    boo.object = cutter
    bpy.ops.object.modifier_apply(modifier='Carve')
    bpy.data.objects.remove(cutter)
    # The cut walls take the cutter's material: re-point them at the flesh slot of this mesh.
    idx = {m.name: i for i, m in enumerate(body.data.materials)}
    for poly in body.data.polygons:
        if body.data.materials[poly.material_index].name == 'Lantern_Flesh':
            poly.material_index = idx['Lantern_Flesh']
    return [body, add_stem('JackOLantern_Stem', stem)]


# ---------------------------------------------------------------- Christmas tree
TIERS = [  # base height, tier height, radius. The lowest tips stay above the stand so the trunk shows.
    (0.24, 0.25, 0.27),
    (0.38, 0.23, 0.225),
    (0.51, 0.21, 0.18),
    (0.63, 0.19, 0.135),
    (0.74, 0.2, 0.09),
]


def tier_bm(bm, y0, h, r, twist, points=16):
    rows, tips = [], []
    ring = []
    for k in range(points * 2):
        a = twist + math.pi * k / points
        tip = k % 2 == 0
        rr = r if tip else r * 0.78
        ring.append(Vector((rr * math.cos(a), rr * math.sin(a), y0 - (0.03 if tip else 0.0))))
        if tip:
            tips.append((a, rr, y0 - 0.03))
    mid = [Vector((0.5 * p.x, 0.5 * p.y, y0 + 0.5 * h)) for p in ring]
    rows = [mid, ring]
    lathe_grid(bm, rows, closed_top=(0, 0, y0 + h), closed_bottom=(0, 0, y0 + 0.05))
    return tips


def build_tree():
    needles = material('Tree_Needles', (0.07, 0.2, 0.09), rough=0.85)
    bark = material('Tree_Bark', (0.2, 0.11, 0.05), rough=0.9)
    bucket = material('Tree_Stand', (0.42, 0.05, 0.04), rough=0.55)
    brass = material('Tree_Brass', (0.75, 0.55, 0.22), rough=0.35, metal=0.7)
    soil = material('Tree_Soil', (0.09, 0.06, 0.04), rough=1.0)
    star = material('Tree_Star', (1.0, 0.8, 0.3), rough=0.4, metal=0.3, emit=(1.0, 0.75, 0.3), strength=1.5)
    bulb = material('Tree_Lights', (1.0, 0.85, 0.55), rough=0.5, emit=(1.0, 0.78, 0.45), strength=3.0)
    baubles = [material('Bauble_Red', (0.55, 0.04, 0.04), rough=0.3, metal=0.3),
               material('Bauble_Gold', (0.8, 0.58, 0.2), rough=0.3, metal=0.7),
               material('Bauble_Cream', (0.85, 0.8, 0.68), rough=0.4),
               material('Bauble_Blue', (0.1, 0.2, 0.45), rough=0.3, metal=0.3)]
    obs = []

    bm = bmesh.new()
    tips_all = []
    for i, (y0, h, r) in enumerate(TIERS):
        tips_all.append(tier_bm(bm, y0, h, r, twist=0.37 * i))
    # Shade: the tip ring catches light, the inside and underside sit in shadow.
    def needle_shade(v):
        rr = math.hypot(v.x, v.y)
        tier = min(TIERS, key=lambda t: abs(v.z - t[0]) if v.z <= t[0] + t[1] else 9)
        return max(0.45, min(1.0, 0.55 + 0.5 * rr / max(tier[2], 0.01)))
    obs.append(to_object('Tree_Foliage', bm, [needles], smooth=False, shade=needle_shade))

    bm = bmesh.new()
    tube(bm, [Vector((0, 0, 0.07)), Vector((0, 0, 0.29))], [0.03, 0.025], sides=8)
    obs.append(to_object('Tree_Trunk', bm, [bark], smooth=False, shade=lambda v: 0.8))

    # Bucket stand: a tapered pail with two brass hoops and dark soil just under the rim.
    bm = bmesh.new()
    rows = [[Vector((rr * math.cos(2 * math.pi * k / 24), rr * math.sin(2 * math.pi * k / 24), z)) for k in range(24)]
            for rr, z in [(0.1, 0.095), (0.085, 0.0)]]
    lathe_grid(bm, rows, closed_bottom=(0, 0, 0))
    obs.append(to_object('Tree_Stand', bm, [bucket], shade=lambda v: 0.8 + 0.2 * v.z / 0.095))
    for z, rr in [(0.02, 0.0875), (0.08, 0.098)]:
        bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=0.004, major_segments=32, minor_segments=6, location=(0, 0, z))
        t = bpy.context.object
        t.name = 'Tree_Hoop'
        t.data.materials.append(brass)
        obs.append(t)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.096, depth=0.004, location=(0, 0, 0.088))
    s = bpy.context.object
    s.name = 'Tree_Soil'
    s.data.materials.append(soil)
    obs.append(s)

    # Baubles hang under the tier tips; lights spiral up the tree.
    for i, tips in enumerate(tips_all):
        for k, (a, rr, y) in enumerate(tips):
            if (k + i) % 3:
                continue
            m = baubles[(k // 3 + i) % len(baubles)]
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.016 if i < 3 else 0.013,
                                                  location=(0.92 * rr * math.cos(a), 0.92 * rr * math.sin(a), y - 0.012))
            o = bpy.context.object
            o.name = 'Tree_Bauble'
            o.data.materials.append(m)
            bpy.ops.object.shade_smooth()
            obs.append(o)
    n = 34
    for k in range(n):
        t = k / (n - 1)
        z = 0.26 + 0.64 * t
        rr = 0.235 * (1 - t) + 0.035
        a = t * 2 * math.pi * 4.5
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.0075, location=(rr * math.cos(a), rr * math.sin(a), z))
        o = bpy.context.object
        o.name = 'Tree_Light'
        o.data.materials.append(bulb)
        obs.append(o)

    # Five-pointed star, upright and facing the room (+Y here, -Z in the app).
    bm = bmesh.new()
    pts = [((0.045 if k % 2 == 0 else 0.019) * math.sin(math.pi * k / 5), (0.045 if k % 2 == 0 else 0.019) * math.cos(math.pi * k / 5)) for k in range(10)]
    front = [bm.verts.new((x, 0.006, 0.975 + z)) for x, z in pts]
    back = [bm.verts.new((x, -0.006, 0.975 + z)) for x, z in pts]
    cf = bm.verts.new((0, 0.012, 0.975))
    cb = bm.verts.new((0, -0.012, 0.975))
    for k in range(10):
        bm.faces.new((cf, front[k], front[(k + 1) % 10]))
        bm.faces.new((cb, back[(k + 1) % 10], back[k]))
        bm.faces.new((front[(k + 1) % 10], front[k], back[k], back[(k + 1) % 10]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obs.append(to_object('Tree_Star', bm, [star], smooth=False))
    return obs


# ---------------------------------------------------------------- stocking
def build_stocking():
    """Hangs from its origin (top of the cuff). The toe points +X; the face is +Y (towards the room)."""
    sock = material('Stocking_Sock', (0.5, 0.06, 0.06), rough=0.95)
    cuff = material('Stocking_Cuff', (0.9, 0.88, 0.82), rough=1.0)
    outline = [(-0.035, -0.03), (0.035, -0.03), (0.035, -0.12), (0.055, -0.135), (0.075, -0.15), (0.084, -0.168),
               (0.08, -0.188), (0.062, -0.2), (0.03, -0.205), (-0.012, -0.204), (-0.034, -0.193), (-0.045, -0.17),
               (-0.042, -0.13)]
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new((x, -0.014, z)) for x, z in outline])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, 0.028, 0), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = to_object('Stocking', bm, [sock], smooth=False, shade=lambda v: 0.82 + 0.18 * max(0, v.y) / 0.014)
    bev = ob.modifiers.new('Puff', 'BEVEL')
    bev.width = 0.009
    bev.segments = 3
    bev.limit_method = 'ANGLE'
    ob.modifiers.new('Smooth', 'WEIGHTED_NORMAL')
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    for p in ob.data.polygons:
        p.use_smooth = True
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.022))
    c = bpy.context.object
    c.name = 'Stocking_Cuff'
    c.scale = (0.096, 0.042, 0.044)
    bpy.ops.object.transform_apply(scale=True)
    c.data.materials.append(cuff)
    b = c.modifiers.new('Fluff', 'BEVEL')
    b.width = 0.012
    b.segments = 4
    bpy.ops.object.modifier_apply(modifier='Fluff')
    bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_torus_add(major_radius=0.011, minor_radius=0.0025, major_segments=16, minor_segments=5,
                                     location=(-0.03, 0, 0.006), rotation=(math.pi / 2, 0, 0))
    loop = bpy.context.object
    loop.name = 'Stocking_Loop'
    loop.data.materials.append(cuff)
    return [ob, c, loop]


# ---------------------------------------------------------------- export and preview
def export(name, obs):
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_vertex_color='ACTIVE')
    tris = sum(len(p.vertices) - 2 for o in obs if o.type == 'MESH' for p in o.data.polygons)
    print(f'{name}.glb: {tris} triangles')


def preview(name, obs, out_dir):
    lo = Vector((min(v[i] for o in obs for v in (o.matrix_world @ Vector(c) for c in o.bound_box)) for i in range(3)))
    hi = Vector((max(v[i] for o in obs for v in (o.matrix_world @ Vector(c) for c in o.bound_box)) for i in range(3)))
    centre, size = (lo + hi) / 2, max(hi - lo)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24
    sc.render.resolution_x = sc.render.resolution_y = 480
    sc.render.filepath = str(Path(out_dir) / f'{name}.png')
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.35, 0.3, 0.27, 1)
    sc.world = world
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    sc.collection.objects.link(cam)
    cam.location = centre + Vector((0.35, 1.6, 0.6)).normalized() * size * 2.6
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.data.energy = 3
    sun.rotation_euler = (0.9, 0.2, 0.6)
    sc.collection.objects.link(sun)
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out_dir = argv[argv.index('--preview') + 1] if '--preview' in argv else None
    for name, build in [('pumpkin', build_pumpkin), ('jack-o-lantern', build_jack), ('tree', build_tree), ('stocking', build_stocking)]:
        reset()
        obs = build()
        export(name, obs)
        if out_dir:
            preview(name, obs, out_dir)


main()

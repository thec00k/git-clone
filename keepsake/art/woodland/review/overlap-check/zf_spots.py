# Headless: blender -b -P zf_spots.py -- <glb> <out.json>
# Same coplanar-overlap test as qa_check.py (eps 1 mm, |dot| > 0.999), but every
# object pair is kept (qa_check caps its list at 20) with its overlap area and centre.
import bpy, bmesh, sys, json
from collections import defaultdict
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
glb, out = argv[0], argv[1]
EPS = float(argv[2]) if len(argv) > 2 else 0.001

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
dg = bpy.context.evaluated_depsgraph_get()

verts, tris, meta = [], [], []  # meta: (obname, normal, area, centre)
for ob in bpy.context.scene.objects:
    if ob.type != "MESH":
        continue
    bm = bmesh.new()
    bm.from_object(ob, dg)
    bm.transform(ob.matrix_world)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    base = len(verts)
    verts.extend(v.co.copy() for v in bm.verts)
    for f in bm.faces:
        tris.append(tuple(base + v.index for v in f.verts))
        meta.append((ob.name, f.normal.copy(), f.calc_area(), f.calc_center_median().copy()))
    bm.free()

def in_tri(p, a, b, c, n):
    for u, v in ((a, b), (b, c), (c, a)):
        if (v - u).cross(p - u).dot(n) < -1e-7:
            return False
    return True

bvh = BVHTree.FromPolygons(verts, tris, epsilon=0.0)
sets = [set(t) for t in tris]
pairs = {}
for ti, t in enumerate(tris):
    n = meta[ti][1]
    if n.length < 0.5:
        continue
    a, b, c = (verts[i] for i in t)
    cen = (a + b + c) / 3
    for p in (cen, cen.lerp(a, .6), cen.lerp(b, .6), cen.lerp(c, .6)):
        for _, _, tj, _ in bvh.find_nearest_range(p, EPS):
            if tj is None or tj == ti or sets[ti] & sets[tj]:
                continue
            n2 = meta[tj][1]
            d = n.dot(n2)
            if d < 0.999:  # same-facing only: that is what flickers
                continue
            a2 = verts[tris[tj][0]]
            q = p - n2 * n2.dot(p - a2)
            if in_tri(q, a2, verts[tris[tj][1]], verts[tris[tj][2]], n2):
                pairs[(min(ti, tj), max(ti, tj))] = abs(n2.dot(p - a2))

groups = defaultdict(lambda: {"tri_pairs": 0, "area": 0.0, "pts": [], "gap": [], "tris": []})
for i, j in pairs:
    oa, ob_ = sorted((meta[i][0], meta[j][0]))
    g = groups[f"{oa} <-> {ob_}" if oa != ob_ else oa]
    g["tri_pairs"] += 1
    g["area"] += min(meta[i][2], meta[j][2])
    g["pts"].append(meta[i][3])
    g["gap"].append(pairs[(i, j)])
    for t in (i, j):
        g["tris"].append([[round(c, 5) for c in verts[v]] for v in tris[t]])

# Can someone standing in the room see it? Ray from a grid of eye points to each sample.
eyes = [Vector((x * 0.5, y * 0.45, z)) for x in range(-4, 5) for y in range(-4, 5) for z in (0.9, 1.3, 1.7)]
eyes = [e for e in eyes if (lambda h: h[0] is None or (h[0] - e).length > 0.05)(bvh.ray_cast(e, Vector((0, 0, 1))))
        and (lambda h: h[0] is not None)(bvh.ray_cast(e, Vector((0, 0, -1))))]
def seen(p):
    best = None
    for e in eyes:
        d = p - e
        L = d.length
        loc, _, _, _ = bvh.ray_cast(e, d.normalized(), L + 0.01)
        if loc is not None and (loc - p).length < 0.004:
            best = L if best is None else min(best, L)
    return best
for g in groups.values():
    pts = g["pts"]
    step = max(1, len(pts) // 12)
    ds = [d for d in (seen(p) for p in pts[::step]) if d is not None]
    g["visible"] = len(ds)
    g["samples"] = len(pts[::step])
    g["nearest_m"] = round(min(ds), 2) if ds else None

res = []
for k, g in sorted(groups.items(), key=lambda kv: -kv[1]["area"]):
    pts = g["pts"]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    res.append({"where": k, "tri_pairs": g["tri_pairs"], "area_cm2": round(g["area"] * 1e4, 2),
                "centre": [round(x, 3) for x in (lo + hi) / 2],
                "extent": [round(x, 3) for x in (hi - lo)],
                "visible": f"{g['visible']}/{g['samples']}", "nearest_m": g["nearest_m"],
                "gap_mm": round(sorted(g["gap"])[len(g["gap"]) // 2] * 1000, 2),
                "tris": g["tris"] if g["nearest_m"] is not None else []})
json.dump({"eyes": len(eyes), "glb": glb, "eps": EPS, "meshes": sum(1 for o in bpy.context.scene.objects if o.type == "MESH"),
           "tris": len(tris), "spots": res}, open(out, "w"), indent=1)
print("SPOTS", len(res))

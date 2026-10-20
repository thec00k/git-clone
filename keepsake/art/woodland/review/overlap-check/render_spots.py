# blender -b -P render_spots.py -- <glb> <spots.json> <outdir>
# For each overlap spot a person in the room can see: one close render as it looks,
# one with the overlapping triangles painted magenta.
import bpy, sys, json, os, re
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
glb, spots_path, outdir = argv
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
sc = bpy.context.scene
for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        sc.render.engine = eng
        break
    except TypeError:
        pass
sc.render.resolution_x, sc.render.resolution_y = 640, 480
sc.render.film_transparent = False
sc.view_settings.view_transform = "Standard"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (0.8, 0.78, 0.72, 1); bg.inputs[1].default_value = 0.9
for loc in ((0, 0, 3.0), (-1.2, 1.0, 2.0), (1.2, -1.0, 2.0)):
    L = bpy.data.lights.new("p", "POINT"); L.energy = 250; L.shadow_soft_size = 0.5
    o = bpy.data.objects.new("p", L); o.location = loc; sc.collection.objects.link(o)
cam_d = bpy.data.cameras.new("c"); cam_d.lens = 30; cam_d.clip_start = 0.02
cam = bpy.data.objects.new("c", cam_d); sc.collection.objects.link(cam); sc.camera = cam

mat = bpy.data.materials.new("hl"); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
em = nt.nodes.new("ShaderNodeEmission"); em.inputs[0].default_value = (1, 0, 0.8, 1); em.inputs[1].default_value = 3
out = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(em.outputs[0], out.inputs[0])

spots = [s for s in json.load(open(spots_path))["spots"] if s["nearest_m"] is not None]
# combine repeated parts into one picture
merged = {}
for s in spots:
    key = re.sub(r"\.\d{3}|_(BR|BL|FR|FL)|PostL|PostR|_Side[LR]", "", s["where"])
    merged.setdefault(key, []).append(s)

index = []
for n, (key, group) in enumerate(merged.items()):
    def area(t):
        a, b, c = (Vector(v) for v in t)
        return (b - a).cross(c - a).length
    # tris are stored in pairs; mark only the smaller one so a big floor or desk triangle
    # does not hide where the overlap really is
    tris = [min(s["tris"][k], s["tris"][k + 1], key=area) for s in group for k in range(0, len(s["tris"]), 2)]
    verts, faces = [], []
    for t in tris:
        a, b, c = (Vector(v) for v in t)
        nrm = (b - a).cross(c - a)
        nrm = nrm.normalized() if nrm.length > 0 else Vector((0, 0, 1))
        base = len(verts)
        verts += [tuple(v + nrm * 0.0015) for v in (a, b, c)]
        faces.append((base, base + 1, base + 2))
    me = bpy.data.meshes.new("hl"); me.from_pydata(verts, [], faces); me.materials.append(mat)
    hl = bpy.data.objects.new("hl", me); sc.collection.objects.link(hl)
    pts = [Vector(v) for v in verts]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (lo + hi) / 2
    size = max((hi - lo).length, 0.08)
    eye = Vector((0, 0, 1.35))
    d = (eye - c); d.z = max(d.z, 0.35 * d.length); d.normalize()
    cam.location = c + d * min(max(size * 1.1, 0.35), 2.2)
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    slug = f"{n + 1:02d}-" + re.sub(r"[^A-Za-z0-9]+", "-", key).strip("-").lower()
    for tag, show in (("plain", False), ("marked", True)):
        hl.hide_render = not show
        sc.render.filepath = os.path.join(outdir, f"{slug}-{tag}.png")
        bpy.ops.render.render(write_still=True)
    index.append({"slug": slug, "key": key, "spots": [{k: s[k] for k in s if k != "tris"} for s in group]})
    sc.collection.objects.unlink(hl)
json.dump(index, open(os.path.join(outdir, "index.json"), "w"), indent=1)
print("RENDERED", len(index))

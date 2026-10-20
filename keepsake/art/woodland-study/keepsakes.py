"""Deer and bear wall mounts and the hide rug, kept from the retired Snowy Mountain room (owner, 2026-10-19).

Run by build.py after cabin-shell.py (the mounts are hung on its logs) and before materials.py, which
leaves Keepsake_* objects on their own materials. Source: keepsakes.blend (extract-keepsakes.py).
Coordinates in comments are web metres (x, y up, z); Blender stores (x, -z, y).
"""
import bpy
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

SRC = Path(__file__).with_name('keepsakes.blend')
with bpy.data.libraries.load(str(SRC), link=False) as (src, dst):
    dst.objects = [n for n in src.objects if n.startswith('Keepsake_')]
for o in dst.objects:
    bpy.context.scene.collection.objects.link(o)
bpy.context.view_layer.update()


def world_box(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    return (Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)]))


def move(root, delta):
    root.matrix_world = Matrix.Translation(delta) @ root.matrix_world
    bpy.context.view_layer.update()


# Window-wall logs as one BVH, to find how far their crowns come into the room.
verts, polys = [], []
for o in bpy.context.scene.objects:
    if o.type == 'MESH' and o.name.startswith('Cabin_Window_Log'):
        me = o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
        base = len(verts)
        verts += [o.matrix_world @ v.co for v in me.vertices]
        polys += [[base + i for i in p.vertices] for p in me.polygons]
logs = BVHTree.FromPolygons(verts, polys)

# Same spots as in the Snowy cabin, either side of the window, plaques flat on the log crowns.
for animal, x in [('Deer', -1.73), ('Bear', 1.46)]:
    root = bpy.data.objects['Keepsake_' + animal + '_Mount']
    plaque = bpy.data.objects['Keepsake_' + animal + '_Plaque']
    lo, hi = world_box([plaque])
    centre = (lo + hi) / 2
    move(root, Vector((x - centre.x, 0, 0)))
    lo, hi = world_box([plaque])
    # The nearest crown behind the plaque (Blender +Y is towards the window wall).
    crown = min(
        hit[0].y
        for px in (lo.x + .03, (lo.x + hi.x) / 2, hi.x - .03)
        for pz in (lo.z + .03, (lo.z + hi.z) / 2, hi.z - .03)
        for hit in [logs.ray_cast(Vector((px, 0, pz)), Vector((0, 1, 0)), 4)]
        if hit[0] is not None
    )
    move(root, Vector((0, crown - hi.y, 0)))

# Rug: the Snowy rug, a little smaller, in the open floor between the chair, hearth and beanbag.
for name in ['Keepsake_Hide_Rug', 'Keepsake_Hide_Fibres']:
    o = bpy.data.objects[name]
    # Snowy centre (0, z .43) -> (0.10, z .45), scaled to 85% across the floor.
    o.matrix_world = Matrix.Translation((.10, -.45, 0)) @ Matrix.Diagonal((.85, .85, 1, 1)) @ Matrix.Translation((0, .43, 0)) @ o.matrix_world
bpy.context.view_layer.update()
for o in bpy.context.scene.objects:
    if o.name.startswith('Keepsake_'):
        o['keepsake_from'] = 'snowy-mountain'
print('KEEPSAKES placed', sorted(o.name for o in bpy.context.scene.objects if o.name.startswith('Keepsake_') and o.parent is None))

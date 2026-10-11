"""List the parts of each kept room object in a GLB: mesh name, vertex count, materials.

A Blender default cube exported to glTF has 24 vertices (4 per face, for flat shading).
Run from keepsake/, for the September 7 room that every later room was built from:
  git show 1481572:keepsake/public/room/keepsake.glb > /tmp/keepsake-2026-09-07.glb
  python3 licences/proof/woodland-study-room/list-room-parts.py /tmp/keepsake-2026-09-07.glb
"""
import json, struct, sys

ROOTS = ['Desk', 'ks_book', 'ks_crt', 'ks_archive', 'ks_guestbook', 'ks_map', 'ks_shelf', 'ks_chair',
         'ks_lamp', 'ks_door', 'ks_clock', 'ks_ceiling_switch', 'ks_window', 'Beanbag', 'ks_ceiling_fan']
data = open(sys.argv[1], 'rb').read()
gltf = json.loads(data[20:20 + struct.unpack('<I', data[12:16])[0]])
nodes, meshes, accessors = gltf['nodes'], gltf.get('meshes', []), gltf['accessors']
materials = gltf.get('materials', [])
index = {n.get('name'): i for i, n in enumerate(nodes)}
print('generator:', gltf['asset'].get('generator'))


def walk(i, out):
    node = nodes[i]
    if 'mesh' in node:
        prims = meshes[node['mesh']]['primitives']
        verts = sum(accessors[p['attributes']['POSITION']]['count'] for p in prims)
        mats = sorted({materials[p['material']].get('name') for p in prims if 'material' in p})
        out.append((node.get('name'), verts, mats))
    for child in node.get('children', []):
        walk(child, out)


for root in ROOTS:
    if root not in index:
        print(f'\n{root}: not in this file')
        continue
    parts = []
    walk(index[root], parts)
    boxes = sum(1 for _, v, _ in parts if v == 24)
    print(f'\n{root}: {len(parts)} parts, {boxes} are 24-vertex boxes')
    for name, verts, mats in parts:
        print(f'  {name:28} {verts:6}  {", ".join(mats)}')

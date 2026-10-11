"""Check that the furniture wood maps are the output of art/pipeline/refresh-room.py.

Regenerates the 'Keepsake_Detail_wood_*' tiles with the same maths as make_images('wood')
and compares them with the images embedded in each furniture GLB.
Run from keepsake/: python3 licences/proof/original-furniture/compare-wood-maps.py public/room/furniture/*.glb
Needs numpy and Pillow.
"""
import io, json, math, struct, sys
import numpy as np
from PIL import Image


def generated(size=1024):
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size
    bend = .08 * np.sin(y * 2 * math.pi) + .022 * np.sin(y * 6 * math.pi)
    grain = np.sin((x + bend) * 34 * math.pi + .7 * np.sin(x * 10 * math.pi + y * 2 * math.pi))
    fine = np.sin((x + bend * .7) * 154 * math.pi)
    height = .3 * grain + .1 * fine
    tint = .975 + .012 * grain + .006 * fine
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 2
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 2
    normal = np.stack([-dx, -dy, np.ones_like(dx)], -1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    # Blender stores pixels bottom row first, so the exported image is flipped vertically.
    return {'Keepsake_Detail_wood_normal': (normal * .5 + .5)[::-1],
            'Keepsake_Detail_wood_color': np.repeat(tint[..., None], 3, 2)[::-1]}


reference = generated()
for path in sys.argv[1:]:
    data = open(path, 'rb').read()
    length = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20:20 + length])
    binary = data[20 + length + 8:]
    for image in gltf.get('images', []):
        ref = reference.get(image.get('name'))
        if ref is None:
            continue
        view = gltf['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        pixels = Image.open(io.BytesIO(binary[start:start + view['byteLength']])).convert('RGB')
        actual = np.asarray(pixels, dtype=np.float32) / 255
        expected = np.asarray(Image.fromarray((np.clip(ref, 0, 1) * 255).astype(np.uint8)).resize(pixels.size), dtype=np.float32) / 255
        corr = np.corrcoef(actual[..., 0].ravel(), expected[..., 0].ravel())[0, 1]
        print(f'{path}  {image["name"]}  correlation {corr:.4f}  mean difference {np.abs(actual - expected).mean():.4f}')

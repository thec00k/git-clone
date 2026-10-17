"""Name the source of each 'tmp*' texture embedded in the shipped room GLBs.

Blender MCP's Poly Haven download saved each texture to a temporary file (tmpXXXXXXXX.jpg) but kept
Poly Haven's own file name (for example brown_leather_Diffuse.jpg) as the Blender image name.
The .blend sources still record both, so this script reads that pairing and lists, for each GLB,
which Poly Haven texture every embedded 'tmp*' image came from.
Run from keepsake/: python3 licences/proof/polyhaven-textures/trace-textures.py
Needs the zstandard package (Blender 5 compresses .blend files with Zstandard).
"""
import json, re, struct
from pathlib import Path
import zstandard

BLENDS = ['art/woodland/woodland.blend', 'art/beachfront/beachfront.blend', 'art/cyberpunk/cyberpunk.blend',
          'art/furniture/sources/fabric-pattern-07.blend', 'art/furniture/sources/book-pattern.blend']
GLBS = sorted(Path('public/room').glob('*/*.glb'))


def blend_bytes(path):
    data = Path(path).read_bytes()
    if data[:4] != b'\x28\xb5\x2f\xfd':
        return data
    with zstandard.ZstdDecompressor().stream_reader(data, read_across_frames=True) as reader:
        return reader.read()


pairs = {}
for blend in BLENDS:
    raw = blend_bytes(blend)
    for m in re.finditer(rb'IM([A-Za-z0-9_\-. ]{3,80})\x00', raw):
        found = re.search(rb'(tmp[a-z0-9_]{8})\.jpg', raw[m.end():m.end() + 3000])
        if found:
            pairs.setdefault(found.group(1).decode(), m.group(1).decode())

for glb in GLBS:
    data = glb.read_bytes()
    gltf = json.loads(data[20:20 + struct.unpack('<I', data[12:16])[0]])
    names = [i.get('name', '') for i in gltf.get('images', [])]
    traced = sorted({pairs.get(n, 'UNTRACED') for n in names if n.startswith('tmp')})
    other = sorted(n for n in names if not n.startswith('tmp'))
    print(f'{glb}\n  Poly Haven: {", ".join(traced) or "none"}\n  other images: {", ".join(other) or "none"}')

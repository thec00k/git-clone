"""Blender 5.1 source -> staged portable source + two web GLBs.

Invoked by scripts/refresh-room-assets.mjs. Never publishes directly to public/.
"""
import argparse, math, pathlib, sys, json
import bpy
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--room', choices=['woodland', 'beachfront'], required=True)
parser.add_argument('--output', type=pathlib.Path, required=True)
parser.add_argument('--polish', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
if bpy.app.version < (5, 1, 0):
    raise RuntimeError('Use Blender 5.1 or newer for the current Keepsake asset pipeline.')
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'art' / args.room / f'{args.room}.blend'))

EXCLUDED = {'Outside_View', 'Win_Glass', 'Beanbag_Original_Backup'}
def exportable(ob):
    return (ob.type in {'MESH', 'EMPTY', 'CURVE'} and not ob.hide_get() and not ob.hide_render
            and ob.name not in EXCLUDED and not ob.get('blender_preview_only')
            and not ob.name.startswith('Beachfront_Preview_'))

def family(name):
    name = name.lower()
    if any(s in name for s in ('oatmeal', 'cushion_moss', 'sailcloth')): return 'linen'
    if any(s in name for s in ('oak plank', 'smoked oak', 'guesttable_oak', 'warm teak', 'whitewashed wood', 'painted joinery', 'sea glass joinery')): return 'wood'
    if any(s in name for s in ('warm plaster', 'chalk plaster')): return 'plaster'
    return None

def make_images(kind, size=1024):
    """Original seamless texture tiles; no external assets or new licenses."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size
    rng = np.random.default_rng({'wood': 41, 'linen': 42, 'plaster': 43}[kind])
    if kind == 'wood':
        bend = .08 * np.sin(y * 2 * math.pi) + .022 * np.sin(y * 6 * math.pi)
        grain = np.sin((x + bend) * 34 * math.pi + .7 * np.sin(x * 10 * math.pi + y * 2 * math.pi))
        fine = np.sin((x + bend * .7) * 154 * math.pi)
        height = .3 * grain + .1 * fine
        tint = .975 + .012 * grain + .006 * fine
    elif kind == 'linen':
        warp, weft = np.cos(x * 64 * math.pi), np.cos(y * 64 * math.pi)
        height = .4 * (warp + weft) + .12 * warp * weft
        tint = .965 + .018 * warp + .018 * weft
    else:
        height = np.zeros_like(x)
        for frequency, amplitude in [(7, .3), (19, .2), (53, .12), (113, .06)]:
            height += amplitude * np.sin(x * frequency * 2 * math.pi + rng.random() * 6) * np.cos(y * frequency * 2 * math.pi)
        tint = .975 + .018 * height
    # Central differences wrap at the texture boundary, avoiding visible seams.
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 2
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 2
    normal = np.stack([-dx, -dy, np.ones_like(dx)], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    values = {'color': np.repeat(tint[..., None], 3, axis=2),
              'normal': normal * .5 + .5,
              'roughness': np.repeat((.955 + height * .025)[..., None], 3, axis=2)}
    images = {}
    for channel, rgb in values.items():
        name = f'Keepsake_Detail_{kind}_{channel}'
        image = bpy.data.images.get(name) or bpy.data.images.new(name, size, size, alpha=False)
        if tuple(image.size) != (size, size): image.scale(size, size)
        image.colorspace_settings.name = 'sRGB' if channel == 'color' else 'Non-Color'
        rgba = np.concatenate([rgb, np.ones((size, size, 1), dtype=np.float32)], axis=2)
        image.pixels.foreach_set(rgba.astype(np.float32).ravel())
        image.file_format = 'PNG'; image.pack()
        images[channel] = image
    return images

changed = []
if args.polish:
    tiles = {kind: make_images(kind) for kind in ('wood', 'linen', 'plaster')}
    detailed = set()
    for mat in bpy.data.materials:
        kind = family(mat.name)
        if not kind or not mat.users or not mat.node_tree: continue
        p = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not p: continue
        detailed.add(mat.name)
        if mat.get('keepsake_detail_version') == 1: continue
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        uv = nodes.new('ShaderNodeUVMap'); uv.uv_map = 'KeepsakeDetail'; uv.label = 'Physical scale detail UV'
        def texture(channel):
            node = nodes.new('ShaderNodeTexImage'); node.image = tiles[kind][channel]
            node.label = f'Keepsake {kind} {channel}'; links.new(uv.outputs['UV'], node.inputs['Vector'])
            return node
        # Preserve inherited photographic colors and hand-authored coastal grain.
        painted = 'joinery' in mat.name.lower()
        if not p.inputs['Base Color'].is_linked and not painted:
            multiply = nodes.new('ShaderNodeMix'); multiply.data_type = 'RGBA'; multiply.blend_type = 'MULTIPLY'
            multiply.label = 'Keepsake material tint'
            multiply.inputs[0].default_value = 1
            a = next(s for s in multiply.inputs if s.name == 'A' and s.type == 'RGBA')
            b = next(s for s in multiply.inputs if s.name == 'B' and s.type == 'RGBA')
            a.default_value = p.inputs['Base Color'].default_value[:]
            links.new(texture('color').outputs['Color'], b)
            links.new(next(s for s in multiply.outputs if s.type == 'RGBA'), p.inputs['Base Color'])
        if not p.inputs['Roughness'].is_linked:
            multiply = nodes.new('ShaderNodeMath'); multiply.operation = 'MULTIPLY'
            multiply.inputs[0].default_value = p.inputs['Roughness'].default_value
            links.new(texture('roughness').outputs['Color'], multiply.inputs[1])
            links.new(multiply.outputs[0], p.inputs['Roughness'])
        if not p.inputs['Normal'].is_linked:
            normal = nodes.new('ShaderNodeNormalMap'); normal.uv_map = 'KeepsakeDetail'
            normal.inputs['Strength'].default_value = .06 if painted else {'wood': .22, 'linen': .45, 'plaster': .16}[kind]
            links.new(texture('normal').outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], p.inputs['Normal'])
        mat['keepsake_detail_version'] = 1; mat['keepsake_detail_family'] = kind
        changed.append(mat.name)
    for ob in bpy.context.scene.objects:
        if not exportable(ob) or ob.type != 'MESH' or not any(m and m.name in detailed for m in ob.data.materials): continue
        mesh = ob.data
        # Do not disturb the original UVs used by covers, photographs, or inherited textures.
        if mesh.uv_layers.get('KeepsakeDetail'): continue
        uv = mesh.uv_layers.new(name='KeepsakeDetail')
        if len(mesh.uv_layers) == 1: mesh.uv_layers.new(name='UVMap')
        world = [ob.matrix_world @ vertex.co for vertex in mesh.vertices]
        for poly in mesh.polygons:
            n = ob.matrix_world.to_3x3().inverted().transposed() @ poly.normal
            axes = [i for i in range(3) if i != max(range(3), key=lambda i: abs(n[i]))]
            mat = mesh.materials[poly.material_index] if len(mesh.materials) else None
            kind = family(mat.name) if mat else 'wood'
            scale = {'wood': (2, .7), 'linen': (4, 4), 'plaster': (1.2, 1.2)}.get(kind, (1, 1))
            for loop in poly.loop_indices:
                v = world[mesh.loops[loop].vertex_index]
                uv.data[loop].uv = (v[axes[0]] * scale[0], v[axes[1]] * scale[1])
        mesh.uv_layers.active_index = 0

scene = bpy.context.scene
scene['keepsake_pipeline_version'] = 1
scene['keepsake_room_id'] = args.room
scene['keepsake_source_blender'] = bpy.app.version_string
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'AgX'
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
# Pack image dependencies so moving the repository does not break the source scene.
for image in bpy.data.images:
    if image.users and image.type == 'IMAGE' and image.size[0] and not image.packed_file:
        image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(args.output / f'{args.room}.blend'), compress=True)

for quality, limit in [('high', 1024), ('balanced', 512)]:
    for image in bpy.data.images:
        width, height = image.size
        if image.type == 'IMAGE' and max(width, height) > limit:
            ratio = limit / max(width, height)
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
    bpy.ops.object.select_all(action='DESELECT')
    for ob in scene.objects:
        if exportable(ob): ob.select_set(True)
    suffix = '.high' if quality == 'high' else ''
    bpy.ops.export_scene.gltf(filepath=str(args.output / f'{args.room}{suffix}.glb'),
        export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
        export_tangents=False, export_image_format='AUTO', export_materials='EXPORT',
        export_cameras=False, export_lights=False, export_extras=True,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_draco_position_quantization=20, export_draco_normal_quantization=12,
        export_draco_texcoord_quantization=16)
(args.output / 'source-report.json').write_text(json.dumps({
    'room': args.room, 'blender': bpy.app.version_string, 'polishedMaterials': changed,
    'exportedObjects': [ob.name for ob in scene.objects if exportable(ob)],
    'source': f'art/{args.room}/{args.room}.blend', 'pipelineVersion': 1,
    'materialTints': {m.name: list(next(s for s in n.inputs if s.name == 'A' and s.type == 'RGBA').default_value)
        for m in bpy.data.materials if m.node_tree for n in m.node_tree.nodes
        if n.label == 'Keepsake material tint'},
}, indent=2), encoding='utf-8')

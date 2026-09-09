"""Original articulated Keepsake book. Run with Blender 5.1 --background --python.

Separate from the room sources: furniture and user-authored scene edits remain intact.
Coordinates are metres. GLTF converts Blender Z-up into the application's Y-up.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art' / 'workbench'
OUTPUT = ROOT / 'public' / 'room' / 'shared'
SOURCE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=0.8):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

linen = material('Book_Linen', (0.045, 0.09, 0.063))
paper = material('Book_Paper', (0.82, 0.75, 0.60))
edge = material('Book_Paper_Edges', (0.64, 0.55, 0.40))
thread = material('Book_Binding_Thread', (0.44, 0.36, 0.20))
front = material('Page_Front_Content', (0.9, 0.86, 0.75))
back = material('Page_Back_Content', (0.9, 0.86, 0.75))
front.use_backface_culling = True
back.use_backface_culling = True
with bpy.data.libraries.load(str(ROOT/'art'/'furniture'/'sources'/'book-pattern.blend'),link=False) as (src,dst):
    dst.images=[name for name in src.images if 'nor_gl' in name][:1]
if dst.images and dst.images[0]:
    normal_image=dst.images[0];normal_image.colorspace_settings.name='Non-Color';normal_image.pack()
    nodes=linen.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=normal_image
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.3
    linen.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);linen.node_tree.links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])

def box(name, location, dimensions, mat, bevel=0.002, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft handmade edges', 'BEVEL')
        mod.width, mod.segments = bevel, 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    if parent:
        obj.parent = parent
    return obj

box('Book_Back_Cover', (0.16, 0, 0.004), (0.338, 0.458, 0.008), linen)
box('Book_Right_Block', (0.16, 0, 0.016), (0.320, 0.438, 0.016), paper, 0.001)
left=bpy.data.objects.new('Book_Left_Pages',None);bpy.context.collection.objects.link(left)
box('Book_Left_Block',(-.16,0,.016),(.320,.438,.016),paper,.001,left)
for i in range(8):box('Book_Left_Edge_%02d'%i,(-.16,0,.009+i*.0018),(.3205,.4385,.0003),edge,.0001,left)
box('Book_Spine', (-0.008, 0, 0.020), (0.014, 0.452, 0.038), linen, 0.006)
for i in range(8):
    box('Book_Edge_Layer_%02d' % i, (0.16, 0, 0.009 + i * 0.0018),
        (0.3204 + (i % 3) * 0.0002, 0.4385, 0.0003), edge, 0.0001)

hinge = bpy.data.objects.new('Book_Cover_Hinge', None)
bpy.context.collection.objects.link(hinge)
hinge.location = (0, 0, 0.029)
box('Book_Front_Cover', (0.16, 0, 0), (0.338, 0.458, 0.008), linen, parent=hinge)
for y in (-0.17, 0.17):
    box('Book_Stitch', (0.014, y, 0.0045), (0.024, 0.0013, 0.001), thread, 0.0004, hinge)

# Fine quad leaf, with independent front/back UVs and a thin closed edge.
nx, ny = 48, 12
vertices = []
for side in (0, 1):
    for j in range(ny + 1):
        for i in range(nx + 1):
            vertices.append((i / nx * 0.320, (j / ny - 0.5) * 0.438, 0.026 + side * 0.00024))
stride = (nx + 1) * (ny + 1)
faces = []
for side in (0, 1):
    for j in range(ny):
        for i in range(nx):
            a = side * stride + j * (nx + 1) + i
            face = (a, a + 1, a + nx + 2, a + nx + 1)
            faces.append(face if side else tuple(reversed(face)))
mesh = bpy.data.meshes.new('Flexible_leaf_mesh')
mesh.from_pydata(vertices, [], faces)
mesh.materials.append(back)
mesh.materials.append(front)
uv = mesh.uv_layers.new(name='PageContent')
for poly in mesh.polygons:
    poly.material_index = 0 if poly.index < nx * ny else 1
    poly.use_smooth = True
    for loop in poly.loop_indices:
        x, y, z = vertices[mesh.loops[loop].vertex_index]
        uv.data[loop].uv = (x / 0.320 if poly.material_index else 1 - x / 0.320, 0.5 + y / 0.438)
leaf = bpy.data.objects.new('Book_Turning_Page', mesh)
bpy.context.collection.objects.link(leaf)
leaf.shape_key_add(name='Basis')
for step in range(1, 5):
    progress = step / 4
    key = leaf.shape_key_add(name='Turn_%03d' % (step * 25))
    for v, original in zip(key.data, vertices):
        x, y, z = original
        # Curl relaxes at either rest. Integrating the curved tangent retains
        # paper length instead of stretching a plane across the spine.
        px = pz = 0
        samples = 32
        for k in range(samples):
            s = x * (k + 0.5) / samples
            angle = math.pi * progress + math.sin(math.pi * progress) * 0.62 * math.sin(s / 0.320 * math.pi)
            px += math.cos(angle) * x / samples
            pz += math.sin(angle) * x / samples
        tangent=math.pi*progress+math.sin(math.pi*progress)*.62*math.sin(x/.320*math.pi)
        offset=z-.02612
        v.co = (px-offset*math.sin(tangent), y, .02612+pz+offset*math.cos(tangent))
    key.value = 0

for frame in range(1,33):
    t=(frame-1)/31;angle=math.pi*(t*t*t*(t*(t*6-15)+10))
    hinge.rotation_euler[1]=-angle
    hinge.location.z=.029-.025*angle/math.pi
    hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
    hinge.keyframe_insert(data_path='location',frame=frame)
    # The page block rides the inside face; it cannot pass through the cover.
    left.rotation_euler[1]=math.pi-angle
    left.location=(-math.sin(angle)*.004,0,hinge.location.z+math.cos(angle)*.004)
    left.keyframe_insert(data_path='rotation_euler',frame=frame)
    left.keyframe_insert(data_path='location',frame=frame)
left.animation_data.action.name='OpenPages'
if hinge.animation_data and hinge.animation_data.action:
    hinge.animation_data.action.name = 'OpenBook'
bpy.context.scene.frame_set(1)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.render.fps = 30
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'scrapbook.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUTPUT / 'scrapbook.glb'), export_format='GLB',
    export_animations=True, export_morph=True, export_extras=True)
print('WORKBENCH_BOOK_EXPORTED', OUTPUT / 'scrapbook.glb')

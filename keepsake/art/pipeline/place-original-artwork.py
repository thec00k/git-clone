"""Put the original illustrated print into the named Woodland wall frames."""
import bpy,shutil
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'art'/'woodland'/'woodland.blend'
backup=ROOT/'art'/'.staging'/'woodland-before-original-art.blend'
if not backup.exists():shutil.copy2(source,backup)
bpy.ops.wm.open_mainfile(filepath=str(source))
image=bpy.data.images.load(str(ROOT/'public'/'artwork'/'woodland-fern-v1.png'),check_existing=True);image.pack()
mat=bpy.data.materials.get('Keepsake Botanical Print') or bpy.data.materials.new('Keepsake Botanical Print');mat.use_nodes=True
nodes=mat.node_tree.nodes;shader=nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.95
tex=next((n for n in nodes if n.type=='TEX_IMAGE'),None) or nodes.new('ShaderNodeTexImage');tex.image=image
mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
for side in ['L','R']:
    paper=bpy.data.objects.get(f'Semantic_WallArt_{side}_oatmeal_linen')
    if not paper:continue
    points=[paper.matrix_world@Vector(p) for p in paper.bound_box]
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    name=f'Woodland_Botanical_Print_{side}'
    old=bpy.data.objects.get(name)
    if old:bpy.data.objects.remove(old,do_unlink=True)
    mesh=bpy.data.meshes.new(name)
    y=low.y-.002
    mesh.from_pydata([(low.x,y,low.z),(high.x,y,low.z),(high.x,y,high.z),(low.x,y,high.z)],[],[(0,1,2,3)])
    mesh.materials.append(mat);uv=mesh.uv_layers.new(name='PrintUV')
    for loop,value in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=value
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    paper.hide_render=True;paper.hide_set(True)
    fern=bpy.data.objects.get(f'Semantic_WallDecor_{side}_fern')
    if fern:fern.hide_render=True;fern.hide_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
print('ORIGINAL_BOTANICAL_PRINTS_PLACED')

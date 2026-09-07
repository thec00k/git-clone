import bpy, math, random, contextlib, io
from mathutils import Vector, Matrix
random.seed(41)
# Project the two display surfaces in their own coordinates, preserving their tilt.
for name in ['CRT_Screen','ks_archive_frame_mat']:
 o=bpy.data.objects.get(name)
 if not o:continue
 me=o.data;uv=me.uv_layers.active or me.uv_layers.new(name='DisplayUV')
 xs=[v.co.x for v in me.vertices];zs=[v.co.z for v in me.vertices]
 for p in me.polygons:
  for li in p.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co
   uv.data[li].uv=((v.x-min(xs))/(max(xs)-min(xs)),(v.z-min(zs))/(max(zs)-min(zs)))
# A folded throw conforms to the existing beanbag; keep its settled footprint.
for o in list(bpy.data.objects):
 if o.name.startswith('Finish_'):bpy.data.objects.remove(o,do_unlink=True)
bean=bpy.data.objects['Beanbag'];verts=[];faces=[];N=24
for layer in range(2):
 for j in range(N+1):
  for i in range(N+1):
   x=-.30+i/N*.29;y=-.10+j/N*.39
   hit,loc,normal,idx=bean.ray_cast(Vector((x,y,2)),Vector((0,0,-1)))
   z=loc.z if hit else .35
   verts.append((x,y,z+.009+layer*.009+.0025*math.sin(i*1.7+j*.8)))
 off=layer*(N+1)**2
 for j in range(N):
  for i in range(N):
   a=off+j*(N+1)+i;faces.append((a,a+1,a+N+2,a+N+1))
me=bpy.data.meshes.new('FoldedThrow');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Finish_Folded_Throw',me);bpy.context.collection.objects.link(o);o.parent=bean;me.materials.append(bpy.data.materials['Woodland_Cushion_Moss'])
for p in me.polygons:p.use_smooth=True
solid=o.modifiers.new('Soft cloth edge','SOLIDIFY');solid.thickness=.003
# Small coffee ring on the existing desk, underneath the mug's footprint edge.
bpy.ops.mesh.primitive_torus_add(major_radius=.048,minor_radius=.0011,major_segments=48,minor_segments=6,location=(.147,1.982,.7518))
o=bpy.context.object;o.name='Finish_Coffee_Ring';o.scale.z=.15;o.data.materials.append(bpy.data.materials['Woodland | smoked oak'])
# A longer fabric bookmark peeks over the guestbook edge.
guest=bpy.data.objects['ks_guestbook']
me=bpy.data.meshes.new('Bookmark');me.from_pydata([(-.028,-.04,.746),(-.013,-.04,.746),(-.013,-.15,.739),(-.015,-.19,.706),(-.023,-.184,.709),(-.028,-.19,.706),(-.028,-.15,.739)],[],[(0,1,2,6),(6,2,3,4,5)]);me.update();o=bpy.data.objects.new('Finish_Guestbook_Bookmark',me);bpy.context.collection.objects.link(o);o.parent=guest;me.materials.append(bpy.data.materials['Woodland_Cushion_Moss']);mod=o.modifiers.new('Ribbon thickness','SOLIDIFY');mod.thickness=.001
# Ease tiny furniture edges, retaining the authored silhouettes and placements.
for o in bpy.context.scene.objects:
 if o.type=='MESH' and (o.name.startswith('ks_shelf_board') or o.name in ['Shelf_Top','ks_archive_frame','Cozy_Guest_Tabletop']):
  if not o.modifiers.get('Finish softened edges'):
   mod=o.modifiers.new('Finish softened edges','BEVEL');mod.width=.002;mod.segments=2
for name in ['Woodland_Cushion_Moss','Woodland | oatmeal linen','Woodland | oatmeal woven beanbag']:
 m=bpy.data.materials.get(name)
 if m and m.use_nodes:
  p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.96
  if 'Sheen' in p.inputs:p.inputs['Sheen'].default_value=.22
# Leaf islands get slight individual changes, keeping the stems and settled pot.
o=bpy.data.objects.get('Woodland_Static_fern')
if o:
 me=o.data;neighbors={i:set() for i in range(len(me.vertices))}
 for e in me.edges:
  a,b=e.vertices;neighbors[a].add(b);neighbors[b].add(a)
 seen=set()
 for index in range(len(me.vertices)):
  if index in seen:continue
  todo=[index];island=[];seen.add(index)
  while todo:
   v=todo.pop();island.append(v)
   for n in neighbors[v]:
    if n not in seen:seen.add(n);todo.append(n)
  center=sum((me.vertices[i].co for i in island),Vector())/len(island);world=o.matrix_world@center
  if .80<world.x<1.34 and 1.6<world.y<2.07 and world.z>1.04:
   rotation=Matrix.Rotation(random.uniform(-.12,.12),3,'X')@Matrix.Rotation(random.uniform(-.12,.12),3,'Z')
   for i in island:me.vertices[i].co=center+rotation@(me.vertices[i].co-center)
 me.update()
print('Applied display UVs, conforming folded blanket, bookmark, coffee ring, softened edges and varied foliage.')
root=r'C:\Users\iront\Desktop\keepsakeproject\git-clone-main\keepsake'
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type not in {'CAMERA','LIGHT'} and o.name not in {'Outside_View','Win_Glass','Beanbag_Original_Backup'}:o.select_set(True)
with contextlib.redirect_stdout(io.StringIO()):
 bpy.ops.export_scene.gltf(filepath=root+r'\public\room\woodland\woodland.glb',export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_tangents=False,export_image_format='JPEG')
 bpy.ops.wm.save_as_mainfile(filepath=root+r'\art\woodland\woodland.blend',compress=True)
print('Exported Woodland room and saved Blender source.')

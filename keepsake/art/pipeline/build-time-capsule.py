import bpy, math, random
from mathutils import Vector
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'art/furniture';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(23)
# A packed, exportable grain texture; no Blender-only shader dependencies.
w,h=1024,512
x,y=np.meshgrid(np.linspace(0,1,w),np.linspace(0,1,h))
warp=y+.008*np.sin(x*18+y*4)+.004*np.sin(x*41+y*8)+.002*np.sin(x*91+y*37)
for cx,cy in [(.22,.34),(.73,.72)]:
 d=np.sqrt(((x-cx)*.45)**2+(y-cy)**2);warp+=.025*np.exp(-d*13)*np.sin(np.arctan2(y-cy,(x-cx)*.45)*2)
grain=np.sin(warp*420+x*2+np.sin(x*35+y*11))*.055+np.sin(warp*1150+x*13)*.025
broad=np.sin(warp*48+x*3)*.10+np.sin(x*9+y*7)*.04
rng=np.random.default_rng(5);v=np.clip(.60+grain+broad+rng.normal(0,.016,(h,w)),.2,.95)
a=np.ones((h,w,4),dtype=np.float32);a[:,:,0]=v*.82;a[:,:,1]=v*.49;a[:,:,2]=v*.24
im=bpy.data.images.new('Attic oak grain',width=w,height=h);im.pixels.foreach_set(a.ravel());im.filepath_raw=str(OUT/'time-capsule-oak.png');im.file_format='PNG';im.save();im.pack()
def mat(name,color,metal=0,rough=.55,wood=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if wood:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 return m
wood=mat('Attic warm oak',(.46,.23,.10),wood=True);edge=mat('Dark worn oak edges',(.24,.105,.043));brass=mat('Aged honey brass',(.47,.31,.075),.78,.38);iron=mat('Patinated side handles',(.12,.105,.065),.75,.52);inside=mat('Interior cedar',(.22,.11,.055))
asset=[]
def finish(o,name,m,bevel=0):
 o.name=name;o.data.materials.append(m);asset.append(o)
 if bevel:
  mod=o.modifiers.new('Soft worn edges','BEVEL');mod.width=bevel;mod.segments=3
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o
def box(name,p,size,m,bevel=.003):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m,bevel)
def curve(name,pts,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,co in zip(s.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);asset.append(o);return o
def rivet(name,p,m=brass,r=.004):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=r,location=p);return finish(bpy.context.object,name,m)
# X width, negative Y front, Z up. Hollow body and genuine segmented boards.
box('Chest_floor',(0,0,.035),(.55,.35,.035),inside)
for side in [-1,1]:
 for n in range(4):box('Body_plank',(0,side*.164,.069+n*.049),(.536,.018,.048),wood,.002)
 for n in range(4):box('End_plank',(side*.267,0,.069+n*.049),(.018,.32,.048),wood,.002)
 for xx in [-.26,.26]:box('Corner_stile',(xx,side*.171,.145),(.019,.018,.215),edge)
for z in [.036,.247]:
 box('Front_back_moulding',(0,-.177,z),(.568,.023,.017),wood)
 box('Front_back_moulding',(0,.177,z),(.568,.023,.017),wood)
 for xx in [-.276,.276]:box('End_moulding',(xx,0,z),(.018,.345,.017),edge)
for xx in [-.235,.235]:
 for yy in [-.13,.13]:box('Low_foot',(xx,yy,.012),(.074,.075,.024),edge,.005)
# Barrel lid: curved shell of individual planks with an inner surface.
lid=[]
def surface(name,x0,x1,t0,t1,m,r=.173):
 verts=[];N=48 if m==brass else 8
 for xx in [x0,x1]:
  for i in range(N+1):
   t=t0+(t1-t0)*i/N;verts.append((xx,-r*math.cos(t),.252+(.119 if m==brass else .115)*math.sin(t)+(.002 if m==brass else 0)))
 faces=[(i,i+1,N+2+i,N+1+i) for i in range(N)];me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);finish(o,name,m)
 uv=me.uv_layers.new()
 for poly in me.polygons:
  for li in poly.loop_indices:
   vi=me.loops[li].vertex_index;uv.data[li].uv=((vi//(N+1)),(vi%(N+1))/N)
 so=o.modifiers.new('Solid lid','SOLIDIFY');so.thickness=.009;be=o.modifiers.new('Soft seams','BEVEL');be.width=.001;be.segments=2
 for p in me.polygons:p.use_smooth=True
 lid.append(o);return o
for i in range(9):surface('Lid_oak_plank',-.27,.27,i*math.pi/9+.002,(i+1)*math.pi/9-.002,wood)
for xx in [-.271,.271]:
 pts=[(xx,-.174*math.cos(i*math.pi/32),.252+.116*math.sin(i*math.pi/32)) for i in range(33)]
 lid.append(curve('Lid_end_rim',pts,.008,edge))
 verts=[(xx,0,.252)]+pts;me=bpy.data.meshes.new('Lid_end');me.from_pydata(verts,[],[(0,i+1,i+2) for i in range(32)]);me.update();o=bpy.data.objects.new('Lid_end_panel',me);bpy.context.collection.objects.link(o);finish(o,o.name,wood);lid.append(o)
 # UV map curved end panel.
 uv=me.uv_layers.new()
 for loop in me.loops:
  co=me.vertices[loop.vertex_index].co;uv.data[loop.index].uv=((co.y+.18)/.36,(co.z-.25)/.12)
for xx in [-.16,.16]:
 surface('Brass_lid_band',xx-.012,xx+.012,0,math.pi,brass,.179)
 for yy in [-.183,.183]:
  box('Strap_lower',(xx,yy,.225),(.026,.006,.085),brass,.004)
  for zz in [.197,.255]:rivet('Strap_rivet',(xx,yy*1.025,zz))
box('Latch_backplate',(0,-.188,.232),(.045,.007,.055),brass,.006)
box('Latch_hasplate',(0,-.196,.207),(.029,.007,.045),brass,.008)
rivet('Latch_pin',(0,-.204,.249),r=.009)
curve('Latch_pull_ring',[(.019*math.cos(t),-.203,.192+.024*math.sin(t)) for t in np.linspace(0,2*math.pi,33)],.0027,brass)
for xx in [-.286,.286]:
 box('Handle_plate',(xx,0,.175),(.005,.027,.04),iron)
 curve('Side_drop_handle',[(xx,yy,zz) for yy,zz in [(-.013,.167),(-.031,.146),(-.023,.121),(.023,.121),(.031,.146),(.013,.167)]],.0032,iron)
 for yy in [-.145,.145]:
  for zz in [.05,.238]:rivet('Wood_peg',(xx,yy,zz),edge,.003)
# Editable lid pivot for later opening animation.
pivot=bpy.data.objects.new('TimeCapsule_LidPivot',None);bpy.context.collection.objects.link(pivot);pivot.location=(0,.174,.252)
bpy.context.view_layer.update()
for o in lid:o.parent=pivot;o.matrix_parent_inverse=pivot.matrix_world.inverted()
asset.append(pivot)
# Convert curves and apply export modifiers, retaining lid hierarchy.
bpy.ops.object.select_all(action='DESELECT')
for o in asset:
 if o.type in {'MESH','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  if o.type=='CURVE':bpy.ops.object.convert(target='MESH')
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  o.select_set(False)
# Merge by finish and lid membership: a handful of draw calls, editable lid retained.
groups={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':groups.setdefault((o.parent,o.data.materials[0].name),[]).append(o)
for (parent,name),objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=('Lid_' if parent else 'Body_')+name.replace(' ','_')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'time-capsule.blend'))
for o in bpy.context.scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/room/furniture/time-capsule.glb'),export_format='GLB',use_selection=True)
# Preview is separate from the saved asset scene.
bpy.ops.object.camera_add(location=(.72,-.95,.63));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.18))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.84;bpy.context.scene.camera=cam
for pos,power,size in [((.1,-.6,1.2),110,1),((-.7,-.2,.6),65,.7),((.2,.6,.8),90,.7)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power*.3;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.18))-o.location).to_track_quat('-Z','Y').to_euler()
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.render.resolution_x=1000;s.render.resolution_y=800;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Preview world');s.world.color=(.15,.15,.15);s.render.filepath=str(OUT/'time-capsule-preview.png');bpy.ops.render.render(write_still=True)
print('CHEST_COMPLETE')




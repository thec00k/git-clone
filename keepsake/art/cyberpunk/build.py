"""Author Neon City from the shared interaction shell. Coordinates below are web XYZ."""
import bpy, bmesh, math, random, os
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/room/woodland/woodland.glb'))
random.seed(47)
def xyz(p): return (p[0],-p[2],p[1])
def mat(name,c,glow=0,alpha=1):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,alpha);p.inputs['Roughness'].default_value=.42;p.inputs['Metallic'].default_value=.25
 p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=glow;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 return m
dark=mat('Neon Graphite',(.055,.065,.10));purple=mat('Neon Upholstery',(.10,.055,.16));metal=mat('Neon Satin Alloy',(.15,.19,.24));cyan=mat('Neon Cyan',(.04,.8,1),2);pink=mat('Neon Magenta',(.8,.025,.38),2);amber=mat('Neon Amber',(1,.38,.045),1.5);glass=mat('Neon Glass',(.07,.27,.4),.1,.12);holo=mat('Neon Hologram',(.08,.85,.95),1.6,.65)
def box(name,p,s,m):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)],[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=xyz(p);o.scale=(s[0],s[2],s[1]);o.data.materials.append(m);return o
def ball(name,p,s,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=xyz(p));o=bpy.context.object;o.name=name;o.scale=(s[0],s[2],s[1]);o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def cylinder(name,p,r,h,m,r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r if r2 is None else r2,depth=h,location=xyz(p));o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
def tube(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=1;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for v,p in zip(s.points,points):v.co=(*xyz(p),1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def group(name,objs):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
 for x in objs:x.parent=o
 return o
# Keep anchors and interactive furniture; replace decorative geometry in this new scene only.
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 if o.name.startswith(('Lamp_','Semantic_WallDecor_','Woodland_Botanical_Print','Cozy_Woodland','Cozy_Vine','Cozy_Fern')):
  bpy.data.objects.remove(o,do_unlink=True);continue
 if any(k in o.name for k in ['Room_','Desk_','Archive_','ks_archive_drawer','Shelf_','Woodland_Static','Map_Cork','Map_Frame','Win_','Door_']):
  if o.name not in ['Map_Sheet','CRT_Screen']:
   o.data.materials.clear();o.data.materials.append(metal if any(k in o.name for k in ['Handle','Pole','Frame']) else dark)
 if any(k in o.name for k in ['Chair_','Beanbag','Rug','Curtain']):o.data.materials.clear();o.data.materials.append(purple)
# Remove old cabinet greenery and flat wall prints from merged source meshes.
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(o.data);remove=[]
 for f in bm.faces:
  c=o.matrix_world@f.calc_center_median();x,y,z=c.x,c.z,-c.y
  if (.89<x<1.19 and .89<y<1.60 and -1.99<z<-1.62) or (abs(x)>1.7 and 1.45<y<2.15 and -2.2<z<-2.06 and not o.name.startswith('Room_')):remove.append(f)
 if remove:bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(o.data)
 bm.free()
# Ceiling height is 3.15 m, window head 2.681 m. Keep channels inside the
# projecting wall rails/baseboards, with a continuous floor-to-ceiling frame.
led_x,led_z,led_top,led_bottom=2.36,1.96,3.00,.018
for x in [-led_x,led_x]:
 tube('Neon_Static_ceiling',[(x,led_top,-led_z),(x,led_top,led_z)],.012,cyan if x<0 else pink)
 for z in [-led_z,led_z]:tube('Neon_Static_corner',[(x,led_bottom,z),(x,led_top,z)],.008,pink if x<0 else cyan)
for z in [-led_z,led_z]:tube('Neon_Static_ceiling',[(-led_x,led_top,z),(led_x,led_top,z)],.012,pink)
# Fixed door jambs: x [-.36,-.30] and [.60,.66], head y [2.10,2.16].
# Channels sit 12 mm in front of the jamb face, separate from the moving leaf.
tube('Neon_Door_Left',[(-.33,.045,2.028),(-.33,2.13,2.028)],.007,cyan)
tube('Neon_Door_Right',[(.63,.045,2.028),(.63,2.13,2.028)],.007,pink)
tube('Neon_Door_Head',[(-.33,2.13,2.028),(.63,2.13,2.028)],.007,cyan)
# Honeycomb panels on the window wall directly above the time-capsule chest.
for i,(x,y) in enumerate([(1.72,1.62),(1.72,1.90),(1.72,2.18),(1.965,1.76),(1.965,2.04)]):
 pts=[(x+.08+math.cos(a*math.pi/3)*.15,y+math.sin(a*math.pi/3)*.15,-2.07) for a in range(7)]
 tube('Neon_Static_hex_frame',pts,.025,dark);tube('Neon_Static_hex_light',[(xx,yy,zz+.025) for xx,yy,zz in pts],.008,cyan if i%2 else pink)
# Lava lamp with individually animated wax blobs.
lx,ly,lz=-.965,.75,-1.96
cylinder('Neon_Lamp_base',(lx,ly+.04,lz),.073,.08,metal,.046)
cylinder('Neon_Lamp_glass',(lx,ly+.21,lz),.058,.28,glass,.035)
cylinder('Neon_Lamp_cap',(lx,ly+.38,lz),.037,.06,metal,.018)
for i in range(4):
 o=ball('Neon_Lava_'+str(i),(lx+.009*math.sin(i),ly+.13+i*.05,lz),(.020,.025,.017),pink if i%2 else cyan)
 # Uneven, softly lobed wax rather than repeated ellipsoids; keep clear of glass.
 for v in o.data.vertices:
  a=math.atan2(v.co.y,v.co.x)
  bulge=1+.19*math.sin(3*a+i*1.7)+.12*math.cos(v.co.z*3.2+i)
  v.co.x*=bulge;v.co.y*=bulge
  v.co.x+=.12*math.sin(v.co.z*3+i)
  v.co.z*=1+.13*math.sin(a*2+i)
anchor=bpy.data.objects.get('ks_lamp')
if anchor:anchor.location=xyz((lx,ly+.2,lz))
cylinder('Neon_Lamp_foot',(lx,ly+.005,lz),.075,.01,dark)
for o in list(bpy.data.objects):
 if o.name.startswith('Neon_Lamp') and anchor:
  world=o.matrix_world.copy();o.parent=anchor;o.matrix_world=world
# Jellyfish aquarium replaces cabinet plant; photo remains beside it.
for o in list(bpy.data.objects):
 if o.type=='MESH' and ('plant' in o.name.lower() or 'fern' in o.name.lower()):
  b=[o.matrix_world@Vector(v) for v in o.bound_box]
  if b and min(v.x for v in b)>.8:bpy.data.objects.remove(o,do_unlink=True)
jx,jy,jz=1.07,.86,-1.8
cylinder('Neon_Static_jelly_base',(jx,jy+.025,jz),.085,.05,metal)
cylinder('Neon_Static_jelly_tank',(jx,jy+.19,jz),.079,.29,glass)
for y in [jy+.055,jy+.345]:cylinder('Neon_Static_jelly_ring',(jx,y,jz),.083,.015,cyan)
for i in range(2):
 parts=[];cx=jx+(-.027 if i==0 else .025);cy=jy+.22+i*.085
 parts.append(ball('Neon_Jelly_bell',(cx,cy,jz),(.029,.018,.027),holo))
 for k in range(7):
  a=k*math.pi*2/7;parts.append(tube('Neon_Jelly_tentacle',[(cx+math.cos(a)*.022+math.sin(t*.9+k)*.008,cy-t*.011,jz+math.sin(a)*.02) for t in range(9)],.0013,pink if k%3==0 else cyan))
 group('Neon_Jelly_'+str(i),parts)
exec(compile(open(os.path.join(os.path.dirname(__file__),'holograms.py')).read(),'holograms.py','exec'))
exec(compile(open(os.path.join(os.path.dirname(__file__),'infinity.py')).read(),'infinity.py','exec'))
exec(compile(open(os.path.join(os.path.dirname(__file__),'window.py')).read(),'window.py','exec'))
exec(compile(open(os.path.join(os.path.dirname(__file__),'mushrooms.py')).read(),'mushrooms.py','exec'))
# Layered skyline, lit window bands and signs. Entire vista is original geometry.
for i in range(42):
 x=-17+(i%12)*3.1;z=-8-(i//12)*8;h=random.uniform(6,17);w=random.uniform(1.1,2.1)
 if i<12 and abs(x)<4:x+=6 if x>=0 else -6
 box('Neon_Static_tower',(x,h/2-3,z),(w,h,2),dark)
 for j in range(int(h*2)):
  if random.random()<.22:continue
  for col in range(4):
   if random.random()<.25:continue
   box('Neon_Static_windows',(x-w*.35+col*w*.23,-2.7+j*.49,z+1.011),(w*.13,.18,.008),cyan if (j+i)%3 else amber)
 glow=pink if i%3 else cyan
 tube('Neon_Static_tower_edge',[(x-w/2,-3,z+1.02),(x-w/2,h-3,z+1.02),(x+w/2,h-3,z+1.02)],.025,glow)
 for level in [1.5,4.3]:
  if level>h-3:continue
  box('Neon_Static_sign',(x,level,z+1.04),(w*.92,.57,.03),metal)
  tube('Neon_Static_sign_edge',[(x-w*.46,level-.29,z+1.07),(x+w*.46,level-.29,z+1.07),(x+w*.46,level+.29,z+1.07),(x-w*.46,level+.29,z+1.07),(x-w*.46,level-.29,z+1.07)],.025,glow)
  c=bpy.data.curves.new('Neon_Sign','FONT');c.body=['NEON','ARCADE','LUNA','NIGHT','CAFE'][i%5];c.align_x='CENTER';c.size=w*.17;c.extrude=.002;o=bpy.data.objects.new('Neon_Static_type',c);bpy.context.collection.objects.link(o);o.location=xyz((x,level-.1,z+1.09));o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(glow)
# Convert and batch static accent geometry by material to keep draw calls bounded.
for o in list(bpy.data.objects):
 if o.type in ['CURVE','FONT']:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
for m in [dark,purple,metal,cyan,pink,amber,glass]:
 objects=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('Neon_Static') and o.data.materials and o.data.materials[0]==m]
 if objects:
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='Neon_Static_'+m.name
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art/cyberpunk/cyberpunk.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/room/cyberpunk/cyberpunk.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('NEON CITY SAVED')


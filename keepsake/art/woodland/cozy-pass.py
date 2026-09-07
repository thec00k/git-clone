import bpy, math
from mathutils import Vector
def mat(name,color):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.85
 return m
linen=mat('Woodland_Cushion_Moss',(.26,.34,.20));wood=mat('Woodland_GuestTable_Oak',(.27,.14,.063));cord=mat('Woodland_Light_Cord',(.08,.10,.05));leaf=mat('Woodland_Vine_Leaf',(.16,.25,.09));glow=mat('Woodland_Fairy_Bulbs',(1,.65,.23))
p=glow.node_tree.nodes.get('Principled BSDF')
for key in ['Emission Color','Emission']:
 if key in p.inputs:p.inputs[key].default_value=(1,.47,.12,1)
if 'Emission Strength' in p.inputs:p.inputs['Emission Strength'].default_value=2.5
for o in list(bpy.data.objects):
 if o.name.startswith('Cozy_'):bpy.data.objects.remove(o,do_unlink=True)
def tube(name,pts,r,m,parent=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,v in zip(s.points,pts):p.co=(*v,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);o.parent=parent;return o
def sphere(name,loc,scale,m,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m);o.parent=parent
 for p in o.data.polygons:p.use_smooth=True
 return o
verts=[];faces=[];N=48;R=20;sg=lambda x: math.copysign(abs(x)**.48,x)
for j in range(R+1):
 v=-math.pi/2+math.pi*j/R
 for i in range(N):
  u=2*math.pi*i/N;x=.192*sg(math.cos(u))*math.cos(v);y=.183*sg(math.sin(u))*math.cos(v);z=.515+.046*math.sin(v)
  if v>0:z-=.014*math.exp(-((x/.115)**2+(y/.11)**2))*math.sin(v)
  verts.append((x,y,z))
for j in range(R):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
chair=bpy.data.objects['ks_chair'];me=bpy.data.meshes.new('Cozy_Cushion');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Cozy_Chair_Cushion',me);bpy.context.collection.objects.link(o);o.parent=chair;me.materials.append(linen)
for p in me.polygons:p.use_smooth=True
tube('Cozy_Cushion_Piping',[(.193*sg(math.cos(i*2*math.pi/96)),.184*sg(math.sin(i*2*math.pi/96)),.515) for i in range(97)],.0025,linen,chair)
for x in [-.15,.15]:tube('Cozy_Cushion_Tie',[(x,-.17,.505),(x,-.205,.50),(x+.025,-.218,.47),(x,-.204,.49)],.003,linen,chair)
guest=bpy.data.objects['ks_guestbook'];guest.location.x=-1.48;guest.location.y=1.61
for name in ['Guest_Pedestal','Guest_Top']:
 o=bpy.data.objects.get(name)
 if o:bpy.data.objects.remove(o,do_unlink=True)
sphere('Cozy_Guest_Tabletop',(0,0,.68),(.255,.205,.022),wood,guest)
for a in [math.pi/2,math.pi*7/6,math.pi*11/6]:tube('Cozy_Guest_Table_Leg',[(.19*math.cos(a),.155*math.sin(a),.025),(.13*math.cos(a),.11*math.sin(a),.667)],.019,wood,guest)
sphere('Cozy_Guest_LowerShelf',(0,0,.23),(.17,.135,.012),wood,guest)
pts=[(-1.07+1.84*i/64,2.015,2.60-.14*math.sin(math.pi*i/64)) for i in range(65)]
tube('Cozy_Window_String',pts,.004,cord)
for i in range(13):
 t=(i+.5)/13;x=-1.07+1.84*t;z=2.60-.14*math.sin(math.pi*t)
 tube('Cozy_Bulb_Drop',[(x,2.015,z),(x,2.015,z-.055)],.003,cord);sphere('Cozy_String_Bulb',(x,2.015,z-.068),(.015,.015,.022),glow)
for material in [cord,leaf,glow]:
 bpy.ops.object.select_all(action='DESELECT');obs=[o for o in bpy.data.objects if o.name.startswith('Cozy_') and o.parent is None and o.type in {'CURVE','MESH'} and o.data.materials and o.data.materials[0]==material]
 for o in obs:o.select_set(True)
 if obs:
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name='Cozy_'+material.name
print('Created chair cushion, oak guestbook side table, window string lights.')


# Keep the desk area open; tuck the reading seat by the door.
bpy.data.objects["Beanbag"].location.y = -1.35

b = bpy.data.objects["Beanbag"]
b.rotation_euler.z = math.atan2(-b.location.x, b.location.y)
rug = bpy.data.objects.get("Rug_Oval")
if rug: bpy.data.objects.remove(rug, do_unlink=True)

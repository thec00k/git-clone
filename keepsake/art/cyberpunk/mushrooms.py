"""Small luminous terrarium at the measured cactus footprint. Web XYZ metres."""
for name in ['Accent_Pot','Accent_Leaf1','Accent_Leaf2']:
 o=bpy.data.objects.get(name)
 if o:bpy.data.objects.remove(o,do_unlink=True)
anchor=bpy.data.objects.get('ks_window_cactus')
wood=mat('Mushroom Walnut',(.16,.075,.035));moss=mat('Mushroom Moss',(.035,.12,.075))
stem=mat('Mushroom Pearl',(.28,.68,.72),.45);cap=mat('Mushroom Azure',(.018,.38,.8),1.5)
parts=[]
def mushroom_lathe(name,center,profile,material):
 verts=[];faces=[];n=24
 for r,h in profile:
  for i in range(n):
   a=i*math.tau/n;verts.append(xyz((center[0]+r*math.cos(a),center[1]+h,center[2]+r*math.sin(a))))
 for j in range(len(profile)-1):
  for i in range(n):
   a=j*n+i;b=j*n+(i+1)%n;faces.append((a,a+n,b+n,b))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(material)
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 for f in me.polygons:f.use_smooth=True
 parts.append(o);return o
mushroom_lathe('Neon_Mushroom_Bowl',(.57,1.138,-2.063),[(0,0),(.037,0),(.048,.009),(.055,.025),(.055,.037),(.049,.04),(.046,.03),(.035,.012),(0,.012)],wood)
parts.append(cylinder('Neon_Mushroom_Moss',(.57,1.171,-2.063),.046,.005,moss))
rng=random.Random(822)
for j in range(14):
 a=j*2.4;r=.034*math.sqrt((j+1)/14)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=xyz((.57+r*math.cos(a),1.176,-2.063+r*math.sin(a))))
 o=bpy.context.object;o.name='Neon_Mushroom_Moss_Tuft';o.scale=(.010,.009,.006);o.data.materials.append(moss);parts.append(o)
# Tiny quartz-like light shards nestle below the caps, within the bowl rim.
for x,z,h in [(.542,-2.05,.032),(.57,-2.031,.044),(.60,-2.06,.027)]:
 bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.004,radius2=.002,depth=h,location=xyz((x,1.177+h/2,z)))
 o=bpy.context.object;o.name='Neon_Mushroom_Crystal';o.data.materials.append(stem);parts.append(o)
for k,(x,z,h,r) in enumerate([(.553,-2.069,.112,.023),(.587,-2.082,.156,.025),(.593,-2.04,.098,.021),(.545,-2.038,.065,.017)]):
 y=1.174
 parts.append(tube('Neon_Mushroom_Stem',[(x+.005*math.sin(t*math.pi),y+h*t,z+.003*t) for t in [i/8 for i in range(9)]],.0038,stem))
 mushroom_lathe('Neon_Mushroom_Cap',(x,y+h,z+.003),[(0,-.004),(r*.65,-.005),(r,0),(r*.97,.006),(r*.78,.018),(r*.47,.03),(r*.18,.036),(0,.038)],cap)
 for j in range(10):
  a=j*2.4;v=.28+.53*rng.random();rr=r*v;hh=.038*(1-v*v)**.7
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=xyz((x+rr*math.cos(a),y+h+hh,z+.003+rr*math.sin(a))))
  o=bpy.context.object;o.name='Neon_Mushroom_Spot';o.scale=(.0018,.0018,.001);o.data.materials.append(wood);parts.append(o)
# Batch each material after curves are converted; keep the original interaction anchor.
for o in parts:
 if o.type=='CURVE':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
batches=[(m,[o for o in parts if o.data.materials[0]==m]) for m in [wood,moss,stem,cap]]
for m,objects in batches:
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 o=bpy.context.object;o.name='Neon_Mushroom_'+m.name.replace(' ','_');o.parent=anchor

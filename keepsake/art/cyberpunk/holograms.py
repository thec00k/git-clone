"""Original sculpted sill miniatures. Executed inside build.py's namespace."""
sx,sy,sz=-.45,1.138,-2.06
def sculpt_ball(name,p,s,m=holo):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=xyz(p))
 o=bpy.context.object;o.name=name;o.scale=(s[0],s[2],s[1]);o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def surface(name,vertices,faces,m=holo):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([xyz(v) for v in vertices],[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(m)
 for f in mesh.polygons:f.use_smooth=True
 return o
def merge(parts,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
 o=bpy.context.object;o.name=name;return o
for kind in ['cat','car','flower']:
 parts=[cylinder('Neon_Projector_'+kind,(sx,sy+.012,sz),.074,.024,metal)]
 ring=[(sx+math.cos(a*math.tau/64)*.064,sy+.026,sz+math.sin(a*math.tau/64)*.064) for a in range(65)]
 parts.append(tube('Neon_Projector_Rim_'+kind,ring,.0016,cyan))
 form=[];details=[]
 if kind=='cat':
  # Seated adult cat: shoulders, haunches, straight forelegs and tapered muzzle.
  for name,p,s in [
   ('torso',(sx,sy+.119,sz-.008),(.032,.071,.029)),
   ('chest',(sx,sy+.160,sz+.003),(.028,.042,.026)),
   ('head',(sx,sy+.218,sz+.012),(.033,.034,.028)),
   ('muzzleL',(sx-.011,sy+.206,sz+.036),(.014,.010,.014)),
   ('muzzleR',(sx+.011,sy+.206,sz+.036),(.014,.010,.014))]:form.append(sculpt_ball('cat_'+name,p,s))
  for side in [-1,1]:
   form.append(sculpt_ball('cat_haunch',(sx+side*.024,sy+.074,sz-.008),(.024,.036,.029)))
   form.append(sculpt_ball('cat_foreleg',(sx+side*.016,sy+.094,sz+.022),(.010,.048,.011)))
   form.append(sculpt_ball('cat_paw',(sx+side*.016,sy+.049,sz+.030),(.013,.009,.019)))
   # Ears have a broad root, tapered asymmetric tip and real thickness.
   x=sx+side*.025
   form.append(surface('cat_ear',[(x-side*.018,sy+.237,sz+.022),(x+side*.012,sy+.233,sz+.015),(x+side*.012,sy+.268,sz+.001),(x,sy+.242,sz-.009)],[(0,1,2),(0,2,3),(1,3,2),(0,3,1)]))
   details.append(sculpt_ball('Neon_Holo_Eye',(sx+side*.017,sy+.226,sz+.036),(.007,.0045,.0025),cyan))
   details.append(sculpt_ball('Neon_Holo_Pupil',(sx+side*.017,sy+.226,sz+.039),(.0014,.0035,.001),dark))
   for k in range(3):
    details.append(tube('Neon_Holo_Whisker',[(sx+side*.013,sy+.207,sz+.045),(sx+side*.032,sy+.209+k*.003,sz+.046),(sx+side*.058,sy+.210+k*.006,sz+.035)],.00045,cyan))
  details.append(sculpt_ball('Neon_Holo_Nose',(sx,sy+.210,sz+.049),(.004,.0025,.002),dark))
  form.append(tube('cat_tail',[(sx+.029+math.sin(t*.065)*.024,sy+.052+t*.003,sz-.014-math.sin(t*.12)*.024) for t in range(37)],.007,holo))
  body=merge(form,'Neon_Holo_Cat_Form')
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  rem=body.modifiers.new('Joined anatomy','REMESH');rem.mode='VOXEL';rem.voxel_size=.0028;rem.use_smooth_shade=True
  bpy.ops.object.modifier_apply(modifier=rem.name)
  smooth=body.modifiers.new('Soft contours','SMOOTH');smooth.factor=.8;smooth.iterations=4;bpy.ops.object.modifier_apply(modifier=smooth.name)
  dec=body.modifiers.new('Web budget','DECIMATE');dec.ratio=min(1,10500/max(1,len(body.data.polygons)));bpy.ops.object.modifier_apply(modifier=dec.name)
  parts += [body]+details
 elif kind=='car':
  # Original compact coupe, longitudinal cross sections form a continuous shell.
  sections=[(-.113,.023,.060),(-.102,.041,.072),(-.075,.046,.077),(-.042,.045,.106),(.012,.044,.110),(.051,.043,.080),(.094,.039,.073),(.111,.024,.063)]
  verts=[];faces=[];steps=12
  for x,w,top in sections:
   for z,y in [(w*.8,.040),(w,.052),(w,.067),(w*.9,.075),(w*.6,top),(w*.3,top+.002),(-w*.3,top+.002),(-w*.6,top),(-w*.9,.075),(-w,.067),(-w,.052),(-w*.8,.040)]:
    y=min(y,top)
    verts.append((sx+x,sy+y,sz+z))
  for i in range(len(sections)-1):
   for j in range(steps):a=i*steps+j;b=i*steps+(j+1)%steps;faces.append((a,b,b+steps,a+steps))
  faces += [tuple(reversed(range(steps))),tuple(range((len(sections)-1)*steps,len(sections)*steps))]
  body=surface('Neon_Holo_Coupe_Body',verts,faces)
  sub=body.modifiers.new('Continuous bodywork','SUBSURF');sub.levels=2;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=sub.name);parts.append(body)
  for x in [-.071,.072]:
   for side in [-1,1]:
    wheel=sculpt_ball('Neon_Holo_Tire',(sx+x,sy+.050,sz+side*.043),(.021,.021,.008));parts.append(wheel)
    ring=[(sx+x+math.cos(a*math.tau/40)*.014,sy+.050+math.sin(a*math.tau/40)*.014,sz+side*.0505) for a in range(41)]
    parts.append(tube('Neon_Holo_Wheel_Rim',ring,.0011,cyan))
    for a in range(5):
     angle=a*math.tau/5
     parts.append(tube('Neon_Holo_Spoke',[(sx+x,sy+.050,sz+side*.051),(sx+x+math.cos(angle)*.014,sy+.050+math.sin(angle)*.014,sz+side*.051)],.0006,cyan))
  for side in [-1,1]:
   parts.append(surface('Neon_Holo_Window',[(sx-.030,sy+.080,sz+side*.034),(sx-.026,sy+.097,sz+side*.026),(sx+.006,sy+.099,sz+side*.026),(sx+.025,sy+.081,sz+side*.034)],[(0,1,2,3)],dark))
   parts.append(tube('Neon_Holo_Headlight',[(sx+.098,sy+.067,sz+side*.013),(sx+.101,sy+.067,sz+side*.029)],.002,cyan))
   parts.append(tube('Neon_Holo_Taillight',[(sx-.104,sy+.067,sz+side*.012),(sx-.101,sy+.067,sz+side*.029)],.0015,pink))
 else:
  stem=[(sx+.009*math.sin(t*2.1),sy+.034+t*.168,sz+.007*math.sin(t*3)) for t in [i/24 for i in range(25)]]
  parts.append(tube('Neon_Holo_Stem',stem,.0026,holo))
  # Petals cup upward and flare out; leaves taper around a curved central vein.
  for tier,count,length,width in [(0,7,.053,.021),(1,5,.035,.018)]:
   for k in range(count):
    angle=k*math.tau/count+tier*.5;verts=[];faces=[];rows,cols=14,8
    for i in range(rows+1):
     t=i/rows;rad=.003+length*t
     y=sy+.202+.036*t-.021*t*t+tier*.012
     for j in range(cols+1):
      v=j/cols*2-1;w=width*math.sin(math.pi*t)**.7*v
      verts.append((sx+.009+math.cos(angle)*rad-math.sin(angle)*w,y+.009*v*v*math.sin(math.pi*t),sz+math.sin(angle)*rad+math.cos(angle)*w))
    for i in range(rows):
     for j in range(cols):a=i*(cols+1)+j;faces.append((a,a+1,a+cols+2,a+cols+1))
    parts.append(surface('Neon_Holo_Petal',verts,faces))
  for side,height in [(-1,.105),(1,.142)]:
   verts=[];faces=[]
   for i in range(17):
    t=i/16
    for j in range(5):
     v=j/4*2-1;verts.append((sx+side*.046*t,sy+height+.025*t+v*.012*math.sin(math.pi*t),sz+.005*math.sin(math.pi*t)*(1-v*v)))
   for i in range(16):
    for j in range(4):a=i*5+j;faces.append((a,a+1,a+6,a+5))
   parts.append(surface('Neon_Holo_Leaf',verts,faces))
   parts.append(tube('Neon_Holo_Leaf_Vein',[(sx+side*.046*t,sy+height+.025*t+.0005,sz) for t in [i/16 for i in range(17)]],.0007,cyan))
  parts.append(sculpt_ball('Neon_Holo_Stamen',(sx+.009,sy+.217,sz),(.010,.012,.010),cyan))
 # Batch each miniature's static pieces by material, preserving selection roots.
 converted=[]
 for o in parts:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  if o.type=='CURVE':bpy.ops.object.convert(target='MESH')
  converted.append(bpy.context.object)
 batched=[]
 batches=[(m,[o for o in converted if o.data.materials and o.data.materials[0]==m]) for m in [metal,cyan,pink,holo,dark]]
 for material,selected in batches:
  if selected:batched.append(merge(selected,('Neon_Projector_' if material==metal else 'Neon_Holo_')+kind+'_'+material.name.replace(' ','_')))
 group('Neon_Hologram_'+kind,batched)

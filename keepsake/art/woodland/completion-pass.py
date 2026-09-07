import bpy, math, random, contextlib, io
from mathutils import Vector
random.seed(93)
def material(name,color,rough=.8,metal=0):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m
def tube(name,points,r,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def petal(name,loc,scale,mat,rotation):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler=rotation;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
for o in list(bpy.data.objects):
 if o.name.startswith('Cabinet_Flowers_') or o.name=='Finish_Wood_ContactWear':bpy.data.objects.remove(o,do_unlink=True)
leaf=bpy.data.materials['Woodland | fern'];yellow=bpy.data.materials['Woodland_Golden_Petals'];center=bpy.data.materials['Woodland_Flower_Centers']
for i,(tip,scale,lean) in enumerate([((1.005,1.80,1.30),1,(-.18,.20,0)),((1.17,1.90,1.34),.87,(.22,-.28,.5)),((.945,1.925,1.235),.72,(.34,.13,-.3))]):
 tip=Vector(tip);root=Vector((1.07+(i-1)*.013,1.855,.991));points=[]
 for j in range(25):
  t=j/24;v=root.lerp(tip,t);v.x+=math.sin(t*math.pi)*(.025 if i==1 else -.018);v.y+=math.sin(t*math.pi)*.012;points.append(v)
 tube('Cabinet_Flowers_Stem',points,.0015,leaf)
 q=Vector((lean[0],lean[1],1)).to_track_quat('Z','Y')
 for n in range(5):
  a=n*math.tau/5+i*.41;offset=q@Vector((math.cos(a)*.010*scale,math.sin(a)*.010*scale,0));o=petal('Cabinet_Flowers_Petal',tip+offset,(.0105*scale,.0055*scale,.0022),yellow,(0,0,a));o.rotation_euler=(q@o.rotation_euler.to_quaternion()).to_euler()
 petal('Cabinet_Flowers_Center',tip+q@Vector((0,0,.002)),(.005*scale,.005*scale,.0035),center,q.to_euler())
 for n,t in enumerate([.42,.65]):
  v=points[round(t*24)];a=i*1.7+n*2.3
  petal('Cabinet_Flowers_Leaf',v+Vector((math.cos(a)*.013,math.sin(a)*.013,0)),(.021,.004,.0017),leaf,(.25,-.3,a))
for mat in [leaf,yellow,center]:
 obs=[o for o in bpy.context.scene.objects if o.name.startswith('Cabinet_Flowers_') and o.data.materials[0]==mat]
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name='Cabinet_Flowers_'+mat.name
# Consistent glaze, warm metal and muted accessories; keep the original wood textures.
material('M_MugGlaze',(.66,.59,.46),.5)
material('M_Terracotta',(.34,.16,.09),.83)
material('M_FanBrass',(.32,.24,.10),.55,.68)
material('Woodland | aged brass',(.32,.24,.10),.55,.68)
wear=material('Woodland | contact wear',(.31,.22,.125),.94)
verts=[];faces=[]
for name in ['Desk_Top','Shelf_Top','ks_archive_drawer']:
 o=bpy.data.objects.get(name)
 if not o or o.type!='MESH':continue
 pts=[o.matrix_world@Vector(c) for c in o.bound_box];lo=Vector(tuple(min(v[k] for v in pts) for k in range(3)));hi=Vector(tuple(max(v[k] for v in pts) for k in range(3)))
 for j in range(8):
  # Tiny broken marks on touched front edges, never across whole surfaces.
  x=lo.x+(hi.x-lo.x)*(.12+.76*random.random());w=.008+random.random()*.015;y=lo.y-.0007;z=hi.z-.004-random.random()*.006
  a=len(verts);verts.extend([(x,y,z),(min(x+w,hi.x),y,z+.0007),(min(x+w,hi.x),y,z+.0018),(x,y,z+.001)]);faces.append((a,a+1,a+2,a+3))
me=bpy.data.meshes.new('TouchWear');me.from_pydata(verts,[],faces);me.materials.append(wear);o=bpy.data.objects.new('Finish_Wood_ContactWear',me);bpy.context.collection.objects.link(o)
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.name in ['Desk_Top','CRT_Body','Map_Frame','ks_archive_frame','Shelf_Top'] and not o.modifiers.get('Finish contact bevel'):
  m=o.modifiers.new('Finish contact bevel','BEVEL');m.width=.0015;m.segments=2
print('Natural flower stems, asymmetric blooms, unified finishes and small contact wear applied.')

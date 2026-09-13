# Continuous, folded cotton canopy. Executed in build.py's helper namespace.
from mathutils import noise
# Flush supports; keep the fan mounting area unobstructed.
o=bpy.data.objects.get('Woodland_Static_smoked_oak')
if o:
 bm=bmesh.new();bm.from_mesh(o.data);faces=[f for f in bm.faces if min((o.matrix_world@v.co).z for v in f.verts)>2.80]
 bmesh.ops.delete(bm,geom=faces,context='FACES');bm.to_mesh(o.data);bm.free()
for z in [-1.42,1.42]:box('Neon_Static_support_beam',(0,3.09,z),(5,.12,.10),metal)
for x in [-2.45,2.45]:box('Neon_Static_support_rail',(x,3.09,0),(.10,.12,4.25),metal)


# Shallow ceiling fixture; nested luminous rectangles preview the infinity effect in Blender.
mirror=mat('Infinity smoked mirror',(.006,.008,.016));mirror.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.85
box('Neon_Infinity_Back',(0,3.065,0),(3.90,.07,3.10),dark)
for x in [-1.94,1.94]:box('Neon_Infinity_Frame',(x,3.01,0),(.075,.12,3.16),dark)
for z in [-1.54,1.54]:box('Neon_Infinity_Frame',(0,3.01,z),(3.95,.12,.075),dark)
mesh=bpy.data.meshes.new('Infinity mirror face');mesh.from_pydata([xyz(p) for p in [(-1.90,2.997,-1.50),(1.90,2.997,-1.50),(1.90,2.997,1.50),(-1.90,2.997,1.50)]],[],[(0,1,2,3)]);mesh.update()
o=bpy.data.objects.new('Neon_Infinity_Surface',mesh);bpy.context.collection.objects.link(o);mesh.materials.append(mirror)
for i in range(22):
 f=.88**i;x=1.87*f;z=1.47*f
 m=mat('Infinity reflection '+str(i),(1,.10+.22*i/22,.25+.3*i/22),max(.06,2*.86**i))
 tube('Neon_Infinity_Preview_'+str(i),[(-x,2.994,-z),(x,2.994,-z),(x,2.994,z),(-x,2.994,z),(-x,2.994,-z)],.009*f,m)

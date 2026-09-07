# Original Keepsake coastal adaptation. Run from the saved Woodland source.
import bpy, math, os
from mathutils import Vector
ROOT = r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
bpy.ops.wm.open_mainfile(filepath=ROOT+'/art/woodland/woodland.blend')
# Save under the new identity before editing; Woodland stays untouched.
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
def color(name, rgba, solid=False):
    m=bpy.data.materials.get(name)
    if not m:return
    m.diffuse_color=(*rgba,1)
    if m.use_nodes:
        p=m.node_tree.nodes.get('Principled BSDF')
        if p:
            if solid:
                for link in list(p.inputs['Base Color'].links):m.node_tree.links.remove(link)
            p.inputs['Base Color'].default_value=(*rgba,1)
            p.inputs['Roughness'].default_value=.78
for m in bpy.data.materials:
    n=m.name.lower()
    if 'moss painted' in n: color(m.name,(.43,.67,.64),True)
    elif 'smoked oak' in n: color(m.name,(.57,.46,.32),True)
    elif 'oak plank' in n: color(m.name,(.63,.55,.43),True)
    elif 'warm plaster' in n or 'beige_wall' in n: color(m.name,(.86,.81,.69),True)
    elif 'oatmeal linen' in n: color(m.name,(.85,.83,.72),True)
    elif 'cushion_moss' in n: color(m.name,(.26,.55,.57),True)
    elif 'terracotta' in n: color(m.name,(.63,.34,.23),True)
color('M_CRTPlastic',(.62,.71,.68),True)
color('M_MugGlaze',(.34,.59,.60),True)
color('M_RugKilim',(.59,.73,.71),True)
def mat(name,c):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.85
    return m
plaster=mat('Beachfront | chalk plaster',(.87,.83,.72))
trim=mat('Beachfront | sea glass joinery',(.35,.59,.58))
linen=mat('Beachfront | sailcloth',(.90,.87,.76))
# Remove rectangular upper-window details, keeping the exact sill and interaction roots.
for name in ['Room_Wall_B_Top','Win_Head','Win_Muntin_H','Win_Muntin_V','Win_Lip_L','Win_Lip_R']:
    o=bpy.data.objects.get(name)
    if o:bpy.data.objects.remove(o,do_unlink=True)
for name in ['Win_Jamb_L','Win_Jamb_R']:
    o=bpy.data.objects.get(name)
    if o:
        o.dimensions.z=.95;o.location.z=-.25
# Cut an arch-shaped upper wall from a strip of solid prisms.
verts=[];faces=[]
cx=-.15;r=.95;spring=2.05
for i in range(32):
    a=math.pi*i/32;b=math.pi*(i+1)/32
    x1=cx+r*math.cos(a);x2=cx+r*math.cos(b)
    z1=spring+r*math.sin(a);z2=spring+r*math.sin(b)
    base=len(verts)
    verts += [(x1,y,z1) for y in [2.125,2.25]]+[(x2,y,z2) for y in [2.125,2.25]]+[(x1,y,3.15) for y in [2.125,2.25]]+[(x2,y,3.15) for y in [2.125,2.25]]
    faces += [tuple(base+j for j in f) for f in [(0,2,6,4),(1,5,7,3),(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6)]]
mesh=bpy.data.meshes.new('Coastal arch wall');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Beachfront_Arch_Wall',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(plaster)
def curve(name,points,material,radius):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=2
    poly=data.splines.new('POLY');poly.points.add(len(points)-1)
    for p,co in zip(poly.points,points):p.co=(*co,1)
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(material)
    return obj
curve('Beachfront_Arched_Trim',[(cx+.985*math.cos(i*math.pi/48),2.095,spring+.985*math.sin(i*math.pi/48)) for i in range(49)],trim,.038)
# Replace only curtain faces from the combined linen mesh, preserving rug and picture matting.
import bmesh
obj=bpy.data.objects.get('Woodland_Static_oatmeal_linen')
if obj:
    bm=bmesh.new();bm.from_mesh(obj.data)
    doomed=[v for v in bm.verts if (obj.matrix_world@v.co).y>1.83 and (obj.matrix_world@v.co).z>.45]
    bmesh.ops.delete(bm,geom=doomed,context='VERTS');bm.to_mesh(obj.data);bm.free()
for side in [-1,1]:
    v=[];f=[]
    for iz in range(2):
        for j in range(33):
            x=cx+side*1.12+(j/32-.5)*.28
            v.append((x,2.025+math.sin(j/32*math.pi*10)*.026,1.05+iz*1.77))
    for j in range(32):f.append((j,j+1,34+j,33+j))
    me=bpy.data.meshes.new('Sailcloth pleats');me.from_pydata(v,[],f);me.update()
    ob=bpy.data.objects.new('Beachfront_Curtain_'+str(side),me);bpy.context.collection.objects.link(ob);me.materials.append(linen)
# Keep the familiar small lights, but fit them to the new arch.
for ob in list(bpy.data.objects):
    if ob.type=='MESH' and any(s.material and s.material.name in ['Woodland_Fairy_Bulbs','Woodland_Light_Cord'] for s in ob.material_slots):bpy.data.objects.remove(ob,do_unlink=True)
cord=bpy.data.materials.get('Woodland_Light_Cord') or trim
bulb=bpy.data.materials.get('Woodland_Fairy_Bulbs') or linen
points=[(cx+1.075*math.cos(i*math.pi/48),2.045,spring+1.075*math.sin(i*math.pi/48)) for i in range(49)]
curve('Beachfront_Window_Lights_Cord',points,cord,.004)
for i in range(17):
    a=i*math.pi/16;bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.013,location=(cx+1.075*math.cos(a),2.035,spring+1.075*math.sin(a)-.015))
    bpy.context.view_layer.objects.active.name='Beachfront_Window_Bulb';bpy.context.view_layer.objects.active.data.materials.append(bulb)
# Small original wall mementos: a coral fan sketch, made of raised ink strokes.
ink=mat('Beachfront | coral ink',(.56,.29,.22))
for i in range(7):
    a=(i-3)*.22
    curve('Beachfront_Coral_Study',[(1.68,2.108,1.68),(1.68+math.sin(a)*.12,2.108,1.84),(1.68+math.sin(a)*.25,2.108,2.01)],ink,.006)
# Export only the room and functional roots. Do not export the legacy opaque view or backup beanbag.
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
    if not ob.hide_get() and not ob.hide_render and ob.type in ['MESH','EMPTY','CURVE'] and ob.name not in ['Outside_View','Win_Glass','Beanbag_Original_Backup']:
        ob.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
# Run coastal-palette.py and export-beachfront.py in subsequent Blender calls after the file change settles.
print('Beachfront source saved; apply the coastal palette and export in the next call. Woodland unchanged.')

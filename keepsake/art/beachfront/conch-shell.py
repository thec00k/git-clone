"""Knobbed conch modeled from the user's reference; baked colors export to glTF."""
import bpy, math
from mathutils import Vector, noise
ROOT=r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\','/'), 'Only edit Beachfront'
for ob in list(bpy.data.objects):
    if ob.name.startswith('Beachfront_Prop_Seashell'):bpy.data.objects.remove(ob,do_unlink=True)
def material(name,color):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.47
    m.diffuse_color=(*color,1);return m
outside=material('Coastal | knobbed conch',(.7,.52,.3))
inside=material('Coastal | conch aperture',(.65,.32,.10))
verts=[];faces=[];colors=[];nr=112;na=96
for j in range(nr+1):
    u=j/nr
    bend=max(0,(u-.77)/.23);bend=bend*bend*(3-2*bend)
    axis=Vector((1-.68*bend,-.62*bend,.68*bend)).normalized()
    rotation=Vector((1,0,0)).rotation_difference(axis)
    center=Vector((-.13+.25*u,-.016*bend,.012*bend))
    radius=.003+.060*math.sin(u*math.pi*.61)**1.55
    for i in range(na):
        a=i*2*math.pi/na
        whorl=a-u*math.pi*14
        ridge=(.5+.5*math.cos(whorl))**9
        knobs=(.5+.5*math.cos(a*9+u*3))**18
        growth=(.5+.5*math.cos(whorl*5))**7
        flare=max(0,(u-.91)/.09)**2
        r=radius*(1+.13*ridge+.15*ridge*knobs+.018*growth)+.008*flare*(.65+.35*math.sin(a*7))
        p=center+rotation@Vector((0,r*math.cos(a),r*math.sin(a)*1.12))
        grain=noise.noise_vector(p*950)[0]
        fleck=noise.noise_vector(p*250)[1]
        stripe=(.5+.5*math.sin(whorl*2.6+fleck*2))**8
        brown=min(.85,max(0,stripe*.72+max(0,grain-.06)*.65))
        cream=Vector((.78,.62,.39));ochre=Vector((.19,.077,.023))
        c=cream.lerp(ochre,brown)*(1+grain*.10)
        verts.append(tuple(p));colors.append((*c,1))
# Fit the entire shell to the sill, keeping its fuller body and raised mouth.
depth=max(p[1] for p in verts)-min(p[1] for p in verts)
mid=(max(p[1] for p in verts)+min(p[1] for p in verts))/2
bottom=min(p[2] for p in verts)
verts=[(.56+x,2.061+(y-mid)*min(1,.13/depth),1.140+z-bottom) for x,y,z in verts]
for j in range(nr):
    for i in range(na):
        a=j*na+i;b=j*na+(i+1)%na;faces.append((a,b,b+na,a+na))
faces.append(tuple(reversed(range(na))))
data=bpy.data.meshes.new('Knobbed conch with swept amber aperture');data.from_pydata(verts,[],faces);data.update()
ob=bpy.data.objects.new('Beachfront_Prop_Seashell',data);bpy.context.collection.objects.link(ob)
data.materials.append(outside);data.materials.append(inside)
color=data.color_attributes.new(name='ConchMottle',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors):color.data[i].color=c
nodes=outside.node_tree.nodes;vc=nodes.get('Baked shell mottling') or nodes.new('ShaderNodeVertexColor');vc.name='Baked shell mottling';vc.layer_name='ConchMottle'
outside.node_tree.links.new(vc.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
solid=ob.modifiers.new('Thick amber interior and rolled lip','SOLIDIFY');solid.thickness=.0025;solid.material_offset=1;solid.material_offset_rim=1
for p in data.polygons:p.use_smooth=True
ob['asset_role']='Reference-inspired knobbed conch with baked mottling; replaceable sill decoration'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
print('Saved fuller knobbed conch with swept opening and cream/ochre mottling.')

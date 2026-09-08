# Beachfront-only replacement curtains, with an unobstructed arched light strand.
import bpy, math
ROOT=r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\','/'), 'Only edit Beachfront'
for o in list(bpy.data.objects):
    if o.name.startswith(('Beachfront_Curtain','Beachfront_Curtain_Rod','Beachfront_Curtain_Tie')) or o.name=='Woodland_Static_aged_brass':
        bpy.data.objects.remove(o,do_unlink=True)
linen=bpy.data.materials['Beachfront | sailcloth']
trim=bpy.data.materials['Beachfront | sea glass joinery']
def curve(name,points,material,radius):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=2
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for point,co in zip(spline.points,points):point.co=(*co,1)
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);data.materials.append(material)
    return o
cx=-.15
for side in [-1,1]:
    verts=[];faces=[];nx=32;nz=32
    for iz in range(nz+1):
        t=iz/nz
        # Gather near the lower middle; the top and scalloped hem spread gently.
        gather=math.exp(-((t-.42)/.16)**2)
        width=.24-.12*gather
        center=cx+side*(1.30+.025*gather)
        for ix in range(nx+1):
            u=ix/nx
            x=center+(u-.5)*width
            y=2.025-(.026-.012*gather)*(1+math.cos(u*math.pi*10))
            z=1.10+t*1.45+(1-t)**8*.012*math.cos(u*math.pi*10)
            verts.append((x,y,z))
    for iz in range(nz):
        for ix in range(nx):
            a=iz*(nx+1)+ix;faces.append((a,a+1,a+nx+2,a+nx+1))
    me=bpy.data.meshes.new('Gathered coastal sailcloth');me.from_pydata(verts,[],faces);me.update()
    o=bpy.data.objects.new('Beachfront_Curtain_'+str(side),me);bpy.context.collection.objects.link(o);me.materials.append(linen)
    for p in me.polygons:p.use_smooth=True
    solid=o.modifiers.new('Sailcloth thickness','SOLIDIFY');solid.thickness=.003
    center=cx+side*1.30
    curve('Beachfront_Curtain_Rod_'+str(side),[(center-.15,2.018,2.565),(center+.15,2.018,2.565)],trim,.012)
    center=cx+side*1.325
    curve('Beachfront_Curtain_Tie_'+str(side),[(center+math.cos(i*math.pi/16)*.075,2.004+math.sin(i*math.pi/16)*.03,1.71) for i in range(33)],trim,.008)
# Place the strand along the outside of the arch trim, below the ceiling.
r=1.045
cord=bpy.data.objects['Beachfront_Window_Lights_Cord']
for i,p in enumerate(cord.data.splines[0].points):
    a=i*math.pi/(len(cord.data.splines[0].points)-1)
    p.co=(cx+r*math.cos(a),2.035,2.05+r*math.sin(a),1)
lights=sorted([o for o in bpy.data.objects if o.name.startswith('Beachfront_Window_Bulb')],key=lambda o:math.atan2(o.location.z+.015-2.05,o.location.x-cx))
for i,o in enumerate(lights):
    a=i*math.pi/(len(lights)-1);o.location=(cx+r*math.cos(a),2.025,2.05+r*math.sin(a)-.015)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
print('Gathered side curtains and inset arch lights saved.')

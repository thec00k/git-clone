"""Two arched coastal casements, open outward; independent replaceable leaves."""
import bpy, math
ROOT=r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\','/'), 'Only edit Beachfront'
for ob in list(bpy.data.objects):
    if ob.name.startswith('Beachfront_Casement_'):bpy.data.objects.remove(ob,do_unlink=True)
trim=bpy.data.materials['Beachfront | sea glass joinery']
brass=bpy.data.materials['M_FanBrass']
glass=bpy.data.materials.get('Coastal | casement glass') or bpy.data.materials.new('Coastal | casement glass')
glass.use_nodes=True;glass.diffuse_color=(.6,.85,.9,.09);glass.blend_method='BLEND';glass.use_screen_refraction=True
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.6,.85,.9,1);p.inputs['Roughness'].default_value=.12;p.inputs['Alpha'].default_value=.09
def curve(name,points,mat,radius,parent):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=3
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.parent=parent;data.materials.append(mat);return ob
for side in [-1,1]:
    prefix='Beachfront_Casement_'+('Left' if side==-1 else 'Right')
    root=bpy.data.objects.new(prefix+'_Hinge',None);bpy.context.collection.objects.link(root)
    root.location=(-.15+side*.91,2.145,0);root.rotation_euler.z=-side*math.radians(62)
    root['asset_role']='outward-opening arched casement; rotate local Z at hinge'
    root['open_angle_degrees']=62
    # Local inner direction points to the center when closed.
    d=-side;r=.91
    points=[(0,0,1.158),(0,0,2.05)]
    points += [(d*r*(1-math.cos(i*math.pi/80)),0,2.05+r*math.sin(i*math.pi/80)) for i in range(1,41)]
    points += [(d*r,0,1.158),(0,0,1.158)]
    curve(prefix+'_Sash',points,trim,.017,root)
    data=bpy.data.meshes.new(prefix+'_Glass');data.from_pydata(points[:-1],[],[tuple(range(len(points)-1))]);data.update()
    ob=bpy.data.objects.new(prefix+'_Glass',data);bpy.context.collection.objects.link(ob);ob.parent=root;data.materials.append(glass)
    curve(prefix+'_Rail',[(0,0,2.05),(d*r,0,2.05)],trim,.012,root)
    # Two short hinge barrels anchored at the outside jamb.
    for i,z in enumerate([1.37,1.9]):curve(prefix+'_Barrel_'+str(i),[(0,0,z-.028),(0,0,z+.028)],brass,.011,root)
    curve(prefix+'_Handle',[(d*(r-.052),-.023,1.63),(d*(r-.052),-.046,1.63),(d*(r-.052),-.046,1.71)],brass,.006,root)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
print('Saved two outward-open arched casements at 62 degrees.')

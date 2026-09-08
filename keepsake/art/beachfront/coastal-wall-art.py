import bpy,bmesh,math
ROOT=r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\','/'), 'Only edit Beachfront'
for name in ['Woodland_Static_smoked_oak','Woodland_Static_fern']:
    ob=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(ob.data);seen=set();remove=[]
    for v in bm.verts:
        if v in seen:continue
        stack=[v];seen.add(v);part=[]
        while stack:
            q=stack.pop();part.append(q)
            for e in q.link_edges:
                n=e.other_vert(q)
                if n not in seen:seen.add(n);stack.append(n)
        points=[ob.matrix_world@v.co for v in part]
        if all(1.3<p.z<2.8 and p.y>1.9 and ((-2.01<p.x<-1.57) or (1.32<p.x<1.74)) for p in points):remove+=part
    bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(ob.data);bm.free()
for ob in list(bpy.data.objects):
    if ob.name.startswith(('Beachfront_Coral_Study','Beachfront_WallArt_')):bpy.data.objects.remove(ob,do_unlink=True)
frame=bpy.data.materials['Beachfront | warm teak']
for label,x,z in [('boat',-1.85,1.91),('coral',1.61,2.00)]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,2.064,z));ob=bpy.context.view_layer.objects.active;ob.name='Beachfront_WallArt_'+label+'_Frame';ob.scale=(.39,.036,.50)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel=ob.modifiers.new('Soft frame edges','BEVEL');bevel.width=.009;bevel.segments=3;ob.modifiers.new('Frame normals','WEIGHTED_NORMAL');ob.data.materials.append(frame)
    mat=bpy.data.materials.get('Coastal art | '+label) or bpy.data.materials.new('Coastal art | '+label);mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.92
    image=bpy.data.images.load(ROOT+'/art/beachfront/'+label+'-study.png',check_existing=True);image.pack()
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    bpy.ops.mesh.primitive_plane_add(size=1,location=(x,2.044,z),rotation=(math.pi/2,0,0));ob=bpy.context.view_layer.objects.active;ob.name='Beachfront_WallArt_'+label+'_Print';ob.scale=(.35,.46,1);ob.data.materials.append(mat)
bpy.data.objects['ks_ceiling_switch'].location.x=-2.16
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
print('Separate coastal prints and relocated ceiling-light switch saved.')

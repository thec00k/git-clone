import bpy, math
ROOT = r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\','/'), 'Only edit Beachfront'
def wood(name,base):
    image=bpy.data.images.get(name+' grain') or bpy.data.images.new(name+' grain',width=256,height=256)
    pixels=[]
    for y in range(256):
        for x in range(256):
            grain=.95+.035*math.sin(x*.66+math.sin(y*.024)*1.7)+.015*math.sin(x*2.2+y*.025)
            pixels.extend([min(1,c*grain) for c in base]+[1])
    image.pixels=pixels;image.pack()
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    for link in list(p.inputs['Base Color'].links):m.node_tree.links.remove(link)
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);p.inputs['Roughness'].default_value=.76
    m.diffuse_color=(*base,1);return m
teak=wood('Beachfront | warm teak',(.70,.52,.32))
white=wood('Beachfront | whitewashed wood',(.89,.88,.79))
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    for slot in ob.material_slots:
        if not slot.material:continue
        n=slot.material.name
        if n in ['wood_furniture_oak','wood_cabinet_worn_long','Woodland_GuestTable_Oak','M_Oak','M_OakDark']:
            slot.material=white if ob.name.startswith(('Shelf','ks_shelf_board','Archive')) else teak
for m in bpy.data.materials:
    n=m.name.lower();c=None
    if 'smoked oak' in n:c=(.77,.75,.65)
    elif 'oak plank' in n:c=(.74,.65,.51)
    elif 'moss painted' in n:c=(.57,.75,.76)
    elif 'sea glass joinery' in n:c=(.46,.68,.73)
    elif 'cushion_moss' in n:c=(.45,.66,.72)
    if c:
        m.diffuse_color=(*c,1)
        p=m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
        if p:p.inputs['Base Color'].default_value=(*c,1)
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.context.scene.objects:
    if not ob.hide_get() and not ob.hide_render and ob.type in ['MESH','EMPTY','CURVE'] and ob.name not in ['Outside_View','Win_Glass','Beanbag_Original_Backup']:ob.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/room/beachfront/beachfront.glb',export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_tangents=False,export_image_format='JPEG')
print('Coastal palette applied: teak, whitewashed wood, beige floor and pale blue trims.')

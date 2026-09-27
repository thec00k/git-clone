"""Material finishing pass applied before export; all static placement stays in Blender."""
import bpy, math
from pathlib import Path
from mathutils import Vector
TEX=Path(__file__).with_name('textures')
def solid(name,hexcode,rough=.75,metal=0):
    m=bpy.data.materials.new('Woodland_'+name);m.use_nodes=True
    rgb=tuple(int(hexcode[i:i+2],16)/255 for i in (1,3,5))
    rgb=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=(*rgb,1);return m
images={}
def textured(name,tile,tint='#ffffff',rough=.8):
    m=solid(name,tint,rough);nodes=m.node_tree.nodes;links=m.node_tree.links;p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    for kind in ['color','normal','orm']:
        key=tile+('-'+tint[1:] if kind=='color' and tint!='#ffffff' else '')+'-'+kind
        if key not in images:
            im=bpy.data.images.load(str(TEX/(key+'.png')),check_existing=True)
            if kind!='color':im.colorspace_settings.name='Non-Color'
            im.pack();images[key]=im
        n=nodes.new('ShaderNodeTexImage');n.image=images[key]
        if kind=='color':
            links.new(n.outputs['Color'],p.inputs['Base Color'])
        elif kind=='normal':
            bump=nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.5;links.new(n.outputs['Color'],bump.inputs['Color']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
        else:
            channels=nodes.new('ShaderNodeSeparateColor');links.new(n.outputs['Color'],channels.inputs['Color']);links.new(channels.outputs['Green'],p.inputs['Roughness'])
    return m
# Shared maps, restrained material families; colors are authored, not runtime overrides.
oak=textured('Oiled_Oak','oak');floor=textured('Oak_Floorboards','floor');timber=textured('Honey_Timber','timber')
joinery=textured('Walnut_Joinery','oak','#b7a18d');moss=textured('Moss_Woven_Linen','linen','#718466')
linen=textured('Oat_Linen','linen','#e4d3b5');paper=textured('Ivory_Paper','linen','#fff4da');stone=textured('Honed_Limestone','stone')
clay=textured('Terracotta_Bookcloth','linen','#b37d61');forest=textured('Forest_Bookcloth','linen','#62715b')
brass=solid('Aged_Brass','#bda16b',.36,.72);iron=solid('Warm_Iron','#343832',.56,.35)
ceramic=solid('Glazed_Cream','#e2d7b8',.29);enamel=solid('Olive_Enamel','#78816c',.39,.08)
screen=solid('Screen_Glass','#172422',.23);plaster=solid('Warm_Chalk','#e4dac8',.96)
def assign(o,m):
    o.data.materials.clear();o.data.materials.append(m)
    if o.type=='MESH':
        for f in o.data.polygons:f.material_index=0

def project(o,kind):
    if o.type!='MESH':return
    me=o.data;uv=me.uv_layers.active or me.uv_layers.new(name='MaterialUV')
    # Scene-space shell coordinates align adjacent boards across separate wall panels.
    scales=[abs(s) for s in o.matrix_world.to_scale()]
    dims=[max(v.co[i] for v in me.vertices)-min(v.co[i] for v in me.vertices) for i in range(3)]
    for f in me.polygons:
        dominant=max(range(3),key=lambda i:abs(f.normal[i]))
        axes=[i for i in range(3) if i!=dominant]
        axes.sort(key=lambda i:dims[i]*scales[i],reverse=True)
        for loop in f.loop_indices:
            co=me.vertices[me.loops[loop].vertex_index].co
            if kind=='wall':
                w=o.matrix_world@co;normal=o.matrix_world.to_3x3()@f.normal
                u=(w.y if abs(normal.x)>abs(normal.y) else w.x)/3;v=w.z/1.12
            elif kind=='floor':
                w=o.matrix_world@co;u=w.y/3;v=w.x/1.12
            else:
                tile=.24 if kind=='cloth' else .65 if kind=='stone' else 1.15
                u=co[axes[0]]*scales[axes[0]]/tile;v=co[axes[1]]*scales[axes[1]]/(tile if kind!='wood' else .65)
            uv.data[loop].uv=(u,v)

for o in bpy.context.scene.objects:
    if o.type not in {'MESH','CURVE'}:continue
    n=o.name
    if 'glass' in n.lower():continue
    m=oak;kind='wood';preserve_uv=False
    if n=='Study_Floor':m=floor;kind='floor'
    elif n=='Study_Ceiling':m=plaster
    elif n.startswith('Cabin_'):m=oak;kind='wood'
    elif any(k in n for k in ['SideWall','WindowWall','DoorWall','DoorLintel','TransomLeft','TransomRight']):m=timber;kind='wall'
    elif any(k in n for k in ['ChairSeat','ChairBack','Folded_Throw']):m=moss;kind='cloth'
    elif n.startswith('Beanbag'):m=linen;kind='cloth'
    elif any(k in n for k in ['HearthPier','HearthBase','Chimney']):m=stone;kind='stone'
    elif n=='Study_Firebox':m=iron
    elif any(k in n for k in ['WindowJamb','WindowRail','TransomFrame','CornerPost','Baseboard','ChairLeg','HearthMantel','HearthLog']):m=joinery
    elif any(k in n for k in ['Handle','Knob','Brass','Inlay','hinge','Door_Plate','Door_KnobStem']):m=brass
    elif n.startswith('Lamp_'):m=enamel if n=='Lamp_Shade' else brass
    elif n=='ks_lamp_bulb':m=ceramic
    elif n.startswith('CRT_'):m=screen if n=='CRT_Screen' else iron if n in ['CRT_Bezel','CRT_Toggle'] else ceramic;preserve_uv=True
    elif n in ['Accent_Mug']:m=ceramic
    elif any(k in n for k in ['Pages','Map_Sheet','frame_mat','Archive_Tab']):m=paper;kind='cloth';preserve_uv=n=='Map_Sheet'
    elif n.startswith('ks_shelf_book'):m=paper;kind='cloth' # Runtime applies the book's individual cover color.
    elif n in ['ks_book','Guestbook_Cover']:m=forest;kind='cloth'
    elif 'Ribbon' in n or 'Bookmark' in n:m=clay;kind='cloth'
    elif n.startswith('Clock_'):m=iron if n=='Clock_Well' else joinery
    assign(o,m)
    if not preserve_uv:project(o,kind)
# Forward is +Y in Blender (-Z on the web); clockwise turns toward window-right.
chair=bpy.data.objects['ks_chair'];chair.rotation_euler.z=math.radians(-20)
chair['facing_degrees_right_of_window']=20
bpy.context.view_layer.update()
print('WOODLAND_MATERIALS',len(images),'shared texture images; chair 20 degrees clockwise')

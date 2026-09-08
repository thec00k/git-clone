"""Build editable, consistently sized furniture variants from curated sources.

Shared anchors use metres. Generated GLBs are independent of either room shell.
Run Blender 5.1 --background --python this-file. Source attribution is adjacent.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'room' / 'furniture'
ART = ROOT / 'art' / 'furniture'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=.8, metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m

oak=mat('Warm oak',(.27,.14,.067));pale=mat('Pale ash',(.67,.52,.33));cream=mat('Warm painted timber',(.77,.73,.61))
moss=mat('Moss linen',(.12,.20,.14));blue=mat('Sea-glass linen',(.27,.49,.47));oat=mat('Oatmeal weave',(.56,.47,.32))
brass=mat('Aged brass',(.34,.24,.10),.36,.75);ink=mat('Soft charcoal',(.028,.035,.033));paper=mat('Cream paper',(.8,.75,.62))

# Original room grain and CC0 Poly Haven fabric normals survive GLB export.
with bpy.data.libraries.load(str(ROOT/'art'/'woodland'/'woodland.blend'),link=False) as (src,dst):
    dst.images=[n for n in src.images if n.startswith('Keepsake_Detail_wood_')]
wood_images={i.name:i for i in dst.images if i}
with bpy.data.libraries.load(str(ART/'sources'/'fabric-pattern-07.blend'),link=False) as (src,dst):
    dst.images=[n for n in src.images if 'nor_gl' in n or 'Rough' in n]
fabric_images={i.name:i for i in dst.images if i}
for m in [oak,pale,cream,moss,blue,oat]:
    nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
    wood=m in [oak,pale,cream]
    normal=next((im for name,im in (wood_images if wood else fabric_images).items() if 'normal' in name or 'nor_gl' in name),None)
    if normal:
        tex=nodes.new('ShaderNodeTexImage');tex.image=normal;normal.colorspace_settings.name='Non-Color'
        bump=nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.10 if m==cream else .22
        links.new(tex.outputs['Color'],bump.inputs['Color']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    if wood and m!=cream:
        image=wood_images.get('Keepsake_Detail_wood_color')
        if image:
            tex=nodes.new('ShaderNodeTexImage');tex.image=image
            mix=nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
            mix.inputs[6].default_value=tuple(m.diffuse_color);links.new(tex.outputs['Color'],mix.inputs[7]);links.new(mix.outputs[2],bs.inputs['Base Color'])

def box(name, loc, size, material, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    if bevel:
        m=o.modifiers.new('Rounded construction edges','BEVEL');m.width=bevel;m.segments=3
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def ellipsoid(name,loc,size,material,segments=40):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=24,location=loc)
    o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    return o

def tube(name,points,radius,material):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2;c.bevel_depth=radius;c.bevel_resolution=3
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o

def lathe(name,profile,material,center=(0,0,0),segments=64):
    verts=[];faces=[]
    for radius,z in profile:
        for i in range(segments):
            a=i*math.tau/segments;verts.append((center[0]+radius*math.cos(a),center[1]+radius*math.sin(a),center[2]+z))
    for j in range(len(profile)-1):
        for i in range(segments):faces.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(material)
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    for p in me.polygons:p.use_smooth=True
    return o

def empty(name,location):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=location;return o

def desk(style):
    wood=oak if style==0 else pale
    box('Tabletop',(0,0,.732),(1.86,.78,.036),wood,.009)
    box('Rear apron',(0,.31,.64),(1.75,.042,.15),wood)
    if style==0:
        for x in (-.78,.78):
            for y in (-.27,.27):tube('Trestle leg',[(x*1.07,y,.045),(x*.91,y,.712)],.026,wood)
            box('Trestle foot',(x,0,.035),(.11,.69,.05),wood)
        box('Long stretcher',(0,0,.16),(1.63,.045,.045),wood)
    else:
        for x in (-.86,.86):
            for y in (-.30,.30):box('Tapered leg',(x,y,.35),(.045,.045,.70),cream)
        for x in (-.86,.86):box('Side apron',(x,0,.64),(.035,.70,.14),wood)
    empty('Tabletop_Anchor',(0,0,.75));empty('Drawer_Anchor',(0,-.16,.679))

def lamp(style):
    if style==0:
        lathe('Ceramic base',[(0,0),(.075,0),(.08,.02),(.06,.055),(.043,.15),(.028,.18),(0,.18)],blue)
        lathe('Linen shade',[(.105,.17),(.108,.175),(.075,.32),(.071,.32),(.10,.175)],oat)
        tube('Brass neck',[(0,0,.16),(0,0,.24)],.008,brass)
    else:
        lathe('Weighted base',[(0,0),(.075,0),(.075,.015),(0,.025)],ink)
        tube('Articulated stem',[(0,0,.025),(-.045,0,.16),(.025,0,.28)],.009,brass)
        for p in [(-.045,0,.16),(.025,0,.28)]:ellipsoid('Pivot cap',p,(.016,.014,.016),brass,24)
        lathe('Enamel shade',[(.080,.20),(.082,.205),(.044,.29),(.035,.30)],moss,center=(.025,0,0))
    empty('Light_Anchor',(0,0,.22))

def beanbag(style):
    fabric=moss if style==0 else oat
    rings=[(.012,.025,0),(.055,.32,0),(.16,.43,-.025),(.30,.40,.015),(.45,.31,.09),(.61,.19,.17),(.69,.015,.19)]
    if style==1:rings=[(z*.78,r*1.08,y*.7) for z,r,y in rings]
    def surface(t,a,offset=0):
        k=min(len(rings)-2,int(t));f=t-k
        vals=[]
        for axis in range(3):
            p0=rings[max(0,k-1)][axis];p1=rings[k][axis];p2=rings[k+1][axis];p3=rings[min(len(rings)-1,k+2)][axis]
            vals.append(.5*((2*p1)+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f))
        z,r,cy=vals
        ripple=.005*math.sin(a*18+t*3)*math.sin(math.pi*t/6)**2
        r+=ripple+offset;x=r*math.cos(a);y=cy+r*math.sin(a)
        dent=.13*math.exp(-((x/.24)**2+((y+.035)/.24)**2))*max(0,min(1,(z-.20)/.2))
        return (x,y,max(.012,z-dent)+offset*.3)
    verts=[surface(j/48*6,i/96*math.tau) for j in range(49) for i in range(96)]
    faces=[]
    for j in range(48):
        for i in range(96):faces.append((j*96+i,j*96+(i+1)%96,(j+1)*96+(i+1)%96,(j+1)*96+i))
    faces.extend([tuple(reversed(range(96))),tuple(48*96+i for i in range(96))])
    me=bpy.data.meshes.new('Sculpted settled cloth');me.from_pydata(verts,[],faces);me.materials.append(fabric)
    o=bpy.data.objects.new('Beanbag fabric panels',me);bpy.context.collection.objects.link(o)
    for poly in me.polygons:poly.use_smooth=True
    for i in range(6):tube('Stitched panel seam',[surface(j/64*6,i*math.tau/6,.0015) for j in range(65)],.0012,fabric)
    tube('Back zip',[surface(2.2+j/30*1.3,math.pi/2,.002) for j in range(31)],.0025,ink)
    empty('Seat_Anchor',(0,-.07,.30 if style==0 else .23))

def rug(style):
    fabric=oat if style==0 else blue
    if style==0:
        ellipsoid('Woven backing',(0,0,.003),(.99,.67,.003),fabric,64)
        for j in range(54):
            r=.008+j*.0124
            braid=tube('Braided oval',[(1.48*r*math.cos(i*math.tau/128),r*math.sin(i*math.tau/128),.014+.001*math.sin(i*math.pi/3)) for i in range(129)],.0065,fabric if j%12 else moss)
            braid.scale.z=.35;braid.data.bevel_resolution=1
    else:
        box('Woven ground',(0,0,.007),(1.85,1.32,.014),paper,.008)
        for i in range(13):box('Sea-glass stripe',(0,-.60+i*.10,.014),(1.77,.034,.003),blue,.001)
        for x in (-.88,.88):box('Bound edge',(x,0,.015),(.034,1.24,.004),oat,.001)
        for end in (-1,1):
            for i in range(40):tube('Cotton fringe',[(-.87+i*.044,end*.658,.008),(-.87+i*.044+.006,end*.71,.006)],.0018,paper)

def curtains(style):
    material=oat if style==0 else blue
    verts=[];faces=[];nx,ny=40,40
    for j in range(ny+1):
        t=j/ny
        for i in range(nx+1):
            u=i/nx;gather=1-.46*math.exp(-((t-.62)/.19)**2)
            x=(u-.5)*.48*gather
            y=.034*math.sin(u*math.tau*(6 if style==0 else 9))*(.8+.2*t)
            z=1.25*(1-t)+.018*math.cos(u*math.tau*3)*t**8
            verts.append((x,y,z))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
    me=bpy.data.meshes.new('Pleated cloth');me.from_pydata(verts,[],faces);me.materials.append(material)
    o=bpy.data.objects.new('Curtain panel',me);bpy.context.collection.objects.link(o)
    for p in me.polygons:p.use_smooth=True
    m=o.modifiers.new('Fabric thickness','SOLIDIFY');m.thickness=.0015
    for edge in (-1,1):tube('Stitched hem',[(verts[j*(nx+1)+(0 if edge<0 else nx)]) for j in range(ny+1)],.002,paper)
    tube('Gathering tie',[(-.13,-.038,.475),(0,-.045,.466),(.13,-.038,.475)],.006,brass if style else oak)
    empty('Curtain_Rail_Anchor',(0,0,1.25))

def side_table(style):
    wood=oak if style==0 else pale
    if style==0:
        lathe('Round top',[(0,.62),(.26,.62),(.26,.65),(0,.65)],wood)
        for a in range(3):
            angle=a*math.tau/3;tube('Splayed leg',[(.20*math.cos(angle),.20*math.sin(angle),.025),(.13*math.cos(angle),.13*math.sin(angle),.62)],.023,wood)
        lathe('Lower shelf',[(0,.18),(.17,.18),(.17,.20),(0,.20)],wood)
    else:
        box('Tray top',(0,0,.63),(.52,.42,.035),wood)
        for x in (-.24,.24):box('Tray lip',(x,0,.66),(.014,.42,.035),wood)
        for x in (-.19,.19):
            for y in (-.15,.15):box('Leg',(x,y,.315),(.028,.028,.63),cream)
        box('Lower shelf',(0,0,.20),(.42,.34,.02),wood)
    empty('Guestbook_Anchor',(0,0,.65))

def cabinet(style):
    wood=oak if style==0 else cream
    for x in (-.248,.248):box('Cabinet side',(x,0,.43),(.024,.49,.80),wood,.006)
    box('Cabinet back',(0,.233,.43),(.50,.024,.80),wood,.004)
    box('Cabinet top',(0,0,.816),(.54,.51,.028),wood,.007)
    box('Cabinet base',(0,0,.05),(.52,.49,.04),wood,.006)
    for i in range(3):
        z=.17+i*.245;box('Drawer front',(0,-.251,z),(.48,.025,.222),pale if style==0 else blue,.007)
        tube('Drawer pull',[(-.060,-.276,z+.035),(-.060,-.29,z+.035),(.060,-.29,z+.035),(.060,-.276,z+.035)],.006,brass)
        box('Label frame',(0,-.269,z-.04),(.095,.006,.031),brass,.002)
        box('Paper label',(0,-.273,z-.04),(.078,.002,.021),paper,.001)
    for x in (-.19,.19):
        for y in (-.17,.17):box('Foot',(x,y,.028),(.045,.045,.055),wood)
    empty('Top_Anchor',(0,0,.83));empty('Drawer_Anchor',(0,-.25,.415))

def bookshelf(style):
    wood=oak if style==0 else pale
    for x in (-.42,.42):box('Upright',(x,0,.92),(.045,.30,1.84),wood)
    if style==0:box('Back panel',(0,.143,.92),(.84,.018,1.84),wood,.002)
    else:
        for x in (-.25,0,.25):box('Slatted back',(x,.143,.92),(.065,.02,1.84),cream,.003)
    for i in range(5):box('Shelf',(0,0,.025+i*.45),(.88,.33,.035),wood)
    empty('Shelf_Anchor',(0,-.18,1.39))

def printer(style):
    body=cream if style==0 else blue
    box('Printer shell',(0,0,.027),(.145,.178,.054),body,.014)
    box('Output slot',(0,-.090,.022),(.108,.003,.008),ink,.002)
    box('Paper',(0,-.120,.021),(.090,.065,.0015),paper,.0004)
    box('Photo inset',(0,-.123,.022),(.075,.042,.0005),moss,.0001)
    if style==1:box('Lid inset',(0,.01,.055),(.122,.12,.002),paper,.006)
    for i in range(3):box('Status stripe',(-.025+i*.011,.045,.055),(.009,.032,.001),[oak,oat,moss][i],.001)
    empty('Photo_Output_Anchor',(0,-.12,.022))

def crt(style):
    body=cream if style==0 else oak
    box('Rounded CRT body',(0,.02,.18),(.38,.30,.31),body,.035)
    box('Screen bezel',(0,-.143,.19),(.323,.025,.243),ink,.024)
    box('Screen surface',(0,-.158,.19),(.285,.008,.208),moss,.018)
    for x in (-.13,.13):box('Foot',(x,.02,.017),(.06,.19,.034),ink,.008)
    for x in (.105,.14):ellipsoid('Control knob',(x,-.148,.047),(.011,.008,.011),brass,24)
    for i in range(9):box('Top vent',(-.11+i*.027,.04,.337),(.012,.11,.002),ink,.001)
    empty('Screen_Anchor',(0,-.163,.19))

def chair(style):
    names=['chairDesk','chairDesk_1','chair'] if style==0 else ['SchoolChair_01']
    with bpy.data.libraries.load(str(ART/'sources'/'chairs.blend'),link=False) as (src,dst):dst.objects=names
    objects=[o for o in dst.objects if o]
    for o in objects:bpy.context.collection.objects.link(o)
    corners=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    low=Vector(tuple(min(p[i] for p in corners) for i in range(3)));high=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z));scale=.88/(high.z-low.z)
    for o in objects:
        o.location=(o.location-center)*scale;o.scale*=scale
        if style==0:
            o.data=o.data.copy()
            for i,m in enumerate(o.data.materials):o.data.materials[i]=moss if m and 'carpet' in m.name.lower() else ink
            m=o.modifiers.new('Softened timber edges','BEVEL');m.width=.005;m.segments=3
    if style==0:
        ellipsoid('Linen seat cushion',(0,-.015,.445),(.202,.185,.036),moss)
        tube('Cushion piping',[(.201*math.cos(i*math.tau/96),-.015+.184*math.sin(i*math.tau/96),.448) for i in range(97)],.002,oat)
    empty('Seat_Anchor',(0,0,.46));empty('Floor_Anchor',(0,0,0))

BUILDERS={'desk':desk,'chair':chair,'lamp':lamp,'beanbag':beanbag,'rug':rug,'curtains':curtains,'guestbook-stand':side_table,'cabinet':cabinet,'bookshelf':bookshelf,'printer':printer,'crt':crt}
NAMES={'desk':['Oak trestle','Pale writing desk'],'chair':['Moss swivel chair','Collected school chair'],'lamp':['Sea-glass ceramic','Brass task lamp'],'beanbag':['Moss canvas pear','Oatmeal floor lounger'],'rug':['Braided oval','Sea-glass woven stripes'],'curtains':['Oatmeal gathered linen','Sea-glass fine pleats'],'guestbook-stand':['Round oak side table','Pale tray table'],'cabinet':['Oak archive drawers','Painted correspondence cabinet'],'bookshelf':['Oak library shelf','Slatted ash shelf'],'printer':['Cream pocket printer','Sea-glass pocket printer'],'crt':['Cream rounded CRT','Walnut rounded CRT']}
manifest=[]
for category,builder in BUILDERS.items():
    for style in range(2):
        bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
        builder(style)
        # Meshes receive a dedicated UV layer for future material replacements.
        meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.data.uv_layers]
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:o.select_set(True)
        if meshes:
            bpy.context.view_layer.objects.active=meshes[0]
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
        for image in bpy.data.images:
            if image.source=='FILE' and image.has_data and not image.packed_file:
                try:image.pack()
                except Exception:pass
        identity=f'{category}-{style+1}'
        bpy.ops.wm.save_as_mainfile(filepath=str(ART/(identity+'.blend')),compress=True)
        path=OUT/(identity+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,export_extras=True)
        manifest.append({'id':identity,'category':category,'title':NAMES[category][style],'asset':f'/room/furniture/{identity}.glb','bytes':path.stat().st_size})
(OUT/'catalog.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('FURNITURE_VARIANTS_EXPORTED',len(manifest))

"""Woodland composition proof. Run in background with the existing woodland.blend.
All coordinates in helpers use Three.js metres (x, y up, z); Blender stores (x, -z, y).
Original source and published room assets are never overwritten.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/room/woodland-study'
OUT.mkdir(parents=True,exist_ok=True)
keep={'Desk','ks_book','ks_crt','ks_archive','ks_guestbook','ks_map','ks_shelf','ks_chair','ks_lamp','ks_door','ks_clock','ks_ceiling_switch','ks_window','Beanbag'}
def root_of(o):
    while o.parent:o=o.parent
    return o
for o in list(bpy.context.scene.objects):
    if root_of(o).name not in keep:bpy.data.objects.remove(o,do_unlink=True)
for name in ['ks_window','ks_chair']:
    o=bpy.data.objects.get(name)
    for child in list(o.children_recursive):bpy.data.objects.remove(child,do_unlink=True)
def mat(name,hexcode,rough=.85):
    m=bpy.data.materials.new('Study_'+name);m.use_nodes=True
    rgb=tuple(int(hexcode[i:i+2],16)/255 for i in (1,3,5))
    # sRGB swatches -> linear shader values.
    rgb=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough
    m.diffuse_color=(*rgb,1)
    return m
oak=mat('Oak','#967657');dark=mat('Joinery','#594a3b');paper=mat('Linen','#e7decb')
moss=mat('Moss','#657464');wall=mat('Timber','#b8a38a');stone=mat('Stone','#777b73')
brass=mat('Brass','#bfa06a');black=mat('Firebox','#282a29')
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    old=' '.join(m.name.lower() for m in o.data.materials if m)
    material=paper if any(s in old for s in ['linen','paper','cream']) else moss if any(s in old for s in ['moss','green','fern']) else brass if 'brass' in old else oak
    if 'glass' in old or 'glass' in o.name.lower():continue
    o.data.materials.clear();o.data.materials.append(material)
    for f in o.data.polygons:f.material_index=0
def web(p):return (p[0],-p[2],p[1])
def empty(name,p):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=web(p);return o
def cube(name,p,size,material,parent=None,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=web(p));o=bpy.context.object;o.name=name
    o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Soft edges','BEVEL');mod.width=bevel;mod.segments=2
    if parent:
        world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    return o
def panel(name,points,material):
    me=bpy.data.meshes.new(name);me.from_pydata([web(p) for p in points],[],[tuple(range(len(points)))]);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(material)
    mod=o.modifiers.new('Wall thickness','SOLIDIFY');mod.thickness=.13
    return o
# Calm shell with a true square opening and triangular transom.
cube('Study_Floor',(0,-.035,0),(5.2,.07,4.4),oak)
cube('Study_Ceiling',(0,3.91,0),(5.2,.12,4.4),paper)
for x in [-2.55,2.55]:cube('Study_SideWall', (x,1.925,0),(.12,3.85,4.4),wall)
for x,w in [(-1.8075,1.385),(1.6575,1.685)]:cube('Study_WindowWallSide',(x,1.925,-2.19),(w,3.85,.13),wall)
cube('Study_WindowWallLow',(-.15,.555,-2.19),(1.93,1.11,.13),wall)
panel('Study_TransomLeft',[(-1.115,3.05,-2.19),(-.15,3.69,-2.19),(-.15,3.85,-2.19),(-1.115,3.85,-2.19)],wall)
panel('Study_TransomRight',[(-.15,3.69,-2.19),(.815,3.05,-2.19),(.815,3.85,-2.19),(-.15,3.85,-2.19)],wall)
for x,w in [(-1.4925,2.265),(1.6425,1.965)]:cube('Study_DoorWall',(x,1.925,2.188),(w,3.85,.125),wall)
cube('Study_DoorLintel',(.15,3.005,2.188),(1.02,1.69,.125),wall)
window=bpy.data.objects['ks_window']
window.location=web((-.15,2.085,-2.1125))
for x in [-1.115,.815]:cube('Study_WindowJamb',(x,2.085,-2.10),(.07,2.03,.17),dark,window)
for y in [1.11,3.05]:cube('Study_WindowRail',(-.15,y,-2.10),(2,.07,.17),dark,window)
cube('Win_Sill',(-.15,1.112,-2.018),(2.12,.05,.30),oak,window,.008)
for a,b in [((-1.115,3.05,-2.1),(-.15,3.69,-2.1)),((-.15,3.69,-2.1),(.815,3.05,-2.1))]:
    mid=tuple((a[i]+b[i])/2 for i in range(3));length=(Vector(web(b))-Vector(web(a))).length
    o=cube('Study_TransomFrame',mid,(.07,length,.16),dark,window)
    o.rotation_euler=(Vector(web(b))-Vector(web(a))).to_track_quat('Z','Y').to_euler()
# Sparse structural accents, kept clear of the aperture.
for x in [-2.46,2.46]:
    cube('Study_CornerPost',(x,1.91,-2.06),(.13,3.82,.13),dark,bevel=.018)
    cube('Study_Baseboard',(x,.075,0),(.045,.15,4.24),dark)
# Keep the existing desk top and interaction pivots. A stable upholstered chair.
chair=bpy.data.objects['ks_chair'];chair.location=web((-.54,0,-.78));chair.rotation_euler=(0,0,0)
cube('Study_ChairSeat',(-.54,.46,-.78),(.49,.12,.47),moss,chair,.035)
cube('Study_ChairBack',(-.54,.72,-.53),(.49,.48,.11),moss,chair,.035)
for x in [-.74,-.34]:
    for z in [-.97,-.60]:cube('Study_ChairLeg',(x,.21,z),(.055,.42,.055),dark,chair,.008)
# Keep the inherited cushion clear of both the side wall and the new hearth.
bean=bpy.data.objects['Beanbag'];bean.location.x+=.20;bean.location.y+=.55;bean.location.z-=.0567
# Bake existing runtime corrections into this authored asset.
shelf=bpy.data.objects['ks_shelf'];shelf.location.y+=.22
clock=bpy.data.objects.get('ks_clock')
if clock:clock.location.x-=.06
# Compact hearth behind the sitting area, clear of the door sweep.
for x in [-1.28,-.54]:cube('Study_HearthPier',(x,.49,1.90),(.14,.88,.33),stone,bevel=.02)
cube('Study_HearthBase',(-.91,.07,1.83),(.94,.14,.57),stone,bevel=.015)
cube('Study_HearthMantel',(-.91,.98,1.88),(1.0,.12,.46),dark,bevel=.014)
cube('Study_Firebox',(-.91,.48,2.055),(.64,.7,.03),black)
for x in [-1.08,-.81]:cube('Study_HearthLog',(x,.22,1.9),(.24,.07,.16),dark,bevel=.025)
empty('Hearth_Light',(-.91,.48,1.70))
empty('Window_Layer_Origin',(-.15,2.08,-2.24))
empty('ks_window_sun',(-.15,2.70,-2.60))
# Rounded cabin courses sit in front of the sealed shell, with deliberate narrow chinking.
def log(name,a,b,radius=.112):
    av,bv=Vector(web(a)),Vector(web(b));delta=bv-av
    if delta.length<.045:return
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=delta.length,location=(av+bv)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.data.materials.append(wall)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    bevel=o.modifiers.new('Soft log ends','BEVEL');bevel.width=.007;bevel.segments=2
for i in range(17):
    y=.115+i*.225
    for x in [-2.565,2.565]:log('Cabin_Side_Log',(x,y,-2.14),(x,y,2.14))
    low=y-.112;high=y+.112
    # Use the widest aperture intersecting each rounded course so corners stay clear.
    if high>=1.075 and low<=3.085:half=1.015
    elif high>3.085 and low<3.73:half=max(0,.965*(3.69-low)/.64)+.075
    else:half=0
    if half:
        log('Cabin_Window_Log',(-2.51,y,-2.205),(-.15-half,y,-2.205))
        log('Cabin_Window_Log',(-.15+half,y,-2.205),(2.51,y,-2.205))
    else:log('Cabin_Window_Log',(-2.51,y,-2.205),(2.51,y,-2.205))
    if low<2.20:
        log('Cabin_Door_Log',(-2.51,y,2.205),(-.41,y,2.205))
        log('Cabin_Door_Log',(.71,y,2.205),(2.51,y,2.205))
    else:log('Cabin_Door_Log',(-2.51,y,2.205),(2.51,y,2.205))
# Chimney meets the ceiling; broad masonry courses, restrained mortar joints.
cube('Study_Chimney_Core',(-.91,2.44,1.98),(.73,2.88,.35),stone)
for row in range(15):
    y=1.13+row*.19
    # Alternate joints to read as stacked blocks rather than a single stone column.
    cuts=[-.397,0,.397] if row%2==0 else [-.397,-.19,.19,.397]
    for j in range(len(cuts)-1):
        a,b=cuts[j],cuts[j+1]
        cube('Study_Chimney_Stone',(-.91+(a+b)/2,y,1.943),(b-a-.009,.18,.425),stone,bevel=.012)

# Camera / target anchors are exported alongside the model and a typed JSON manifest.
shots={
 'establishing':{'position':[.85,1.65,1.55],'target':[-.20,1.72,-1.65],'fov':60},
 'desk':{'position':[-.15,1.43,-.52],'target':[-.15,.79,-1.70],'fov':42},
 'window':{'position':[-.15,1.90,.25],'target':[-.15,2.10,-2.15],'fov':54},
 'portraitEstablishing':{'position':[.20,1.47,1.72],'target':[-.15,1.67,-1.68],'fov':66},
 'portraitDesk':{'position':[-.15,1.69,.12],'target':[-.15,.84,-1.7],'fov':60},
 'portraitWindow':{'position':[-.15,1.87,.60],'target':[-.15,2.25,-2.15],'fov':68},
}
for name,v in shots.items():
    empty('Camera_'+name,v['position']);empty('Target_'+name,v['target'])
(ROOT/'src/generated/woodlandStudy.json').write_text(json.dumps(shots,indent=2)+'\n')
# Finish materials and chair orientation before publishing the authored scene.
import runpy
runpy.run_path(str(Path(__file__).with_name('materials.py')))
runpy.run_path(str(Path(__file__).with_name('quality-pass.py')))
# Selected export includes only this blockout's scene.
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type not in {'CAMERA','LIGHT'}:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'woodland-study.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True)
bpy.data.orphans_purge(do_recursive=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name('woodland-study.blend')),compress=True)
print('STUDY_EXPORTED',len(bpy.context.scene.objects),'objects', (OUT/'woodland-study.glb').stat().st_size,'bytes')


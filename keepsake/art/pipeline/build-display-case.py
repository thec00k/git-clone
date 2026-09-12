"""Authored empty keepsake cabinet. Blender 5.1; metres, separate replaceable GLB.
Run in background so the artist's open room is never replaced.
"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/room/furniture'
ART = ROOT / 'art/furniture'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.5, metal=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    s = m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value = (*color, 1)
    s.inputs['Roughness'].default_value = roughness
    s.inputs['Metallic'].default_value = metal
    return m

frame = material('Case_PaintedTimber', (.63,.59,.48), .65)
wood = material('Case_Oak', (.24,.145,.075), .64)
brass = material('Case_Brass', (.40,.28,.115), .3, .72)
glass = material('Case_Glass', (.82,.94,.91), .13)
g = glass.node_tree.nodes.get('Principled BSDF')
g.inputs['Transmission Weight'].default_value = .95
g.inputs['IOR'].default_value = 1.45
led = material('Case_LED', (.8,.92,1), .25)
s = led.node_tree.nodes.get('Principled BSDF')
s.inputs['Emission Color'].default_value = (.7,.85,1,1)
s.inputs['Emission Strength'].default_value = 2

# Author in website axes (Y up, +Z front); convert to Blender Z up.
def box(name, p, size, mat, bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(p[0],-p[2],p[1]))
    o=bpy.context.object; o.name=name
    o.dimensions=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Soft joinery edges','BEVEL'); b.width=bevel; b.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

# Quarter-circle rear, with two glazed chamfers and a broad flat double front.
# In plan the rear sweeps exactly 90 degrees; no rectangular backing remains.
import math
R=.44/math.sin(math.pi/4)
arc=[(R*math.sin(-math.pi/4+i*math.pi/64),R/math.sqrt(2)-R*math.cos(-math.pi/4+i*math.pi/64)) for i in range(33)]
outline=arc+[(.39,.20),(-.39,.20)]
def prism(name,points,y,height,mat):
    n=len(points);v=[(x,-z,h) for h in [y-height/2,y+height/2] for x,z in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    faces=[tuple(reversed(f)) for f in faces]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    bevel=o.modifiers.new('Hand-finished edges','BEVEL');bevel.width=.003;bevel.segments=3
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
# Thin concentric arc creates a genuinely rounded rear wall.
inner=[(x*.966,z*.966+.009) for x,z in reversed(arc)]
prism('Case_QuarterCircle_Back',arc+inner,1.095,1.90,frame)
for y in [.115,1.095,2.075]:prism('Case_Shaped_Crossrail',outline,y,.065,frame)
for x,z in [(-.36,.14),(.36,.14),(-.36,-.02),(.36,-.02)]:box('Case_Foot',(x,.043,z),(.085,.086,.075),wood,.008)
for x,z in [(-.44,0),(.44,0),(-.39,.20),(.39,.20)]:box('Case_Vertical_Frame',(x,1.095,z),(.042,1.90,.042),frame)
for side in [-1,1]:
    # Tall side windows follow the chamfer, as in the supplied photographs.
    o=box('Case_AngledSideGlass',(side*.415,1.095,.10),(.006,1.86,.18),glass,.001)
    o.rotation_euler.z=side*math.atan(.25)
for y in [.155,.625,1.125,1.605]:
    prism('Case_QuarterCircle_GlassShelf',[(x*.91,z*.91) for x,z in outline],y,.012,glass)
    box('Case_ShelfFront',(0,y,.186),(.735,.024,.024),frame)
    for side in [-1,1]:box('Case_ShelfSupport',(side*.37,y-.014,.13),(.025,.02,.032),brass)
for y in [.6125,1.5875]:
    for side in [-1,1]:
        box('Case_DoorGlass',(side*.183,y,.205),(.356,.897,.006),glass,.001)
        box('Case_Handle',(side*.022,y,.224),(.022,.038,.017),brass,.004)
        for dy in [-.405,.405]:box('Case_Hinge',(side*.353,y+dy,.215),(.035,.025,.014),brass,.003)
for y in [.605,1.08,1.585,2.04]:
    box('Case_LEDChannel',(0,y,.13),(.70,.018,.028),frame,.003)
    box('Case_LEDDiffuser',(0,y-.011,.13),(.68,.004,.018),led,.001)
box('Case_SwitchPlate',(.389,1.10,.226),(.039,.064,.011),brass,.005)
# Source viewport ready for inspection, with material colors visible.
for area in bpy.context.screen.areas if bpy.context.screen else []:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.region_3d.view_distance=3.5
OUT.mkdir(parents=True,exist_ok=True); ART.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'display-case.blend'))
# Keep editable source parts; batch only opaque export geometry by material.
# Glass stays separate so the browser can sort the front/side/shelf panes.
for mat in [frame,wood,brass,led]:
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.active_material==mat]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        bpy.context.view_layer.objects.active=o
        for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
        o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();bpy.context.object.name=mat.name
bpy.ops.export_scene.gltf(filepath=str(OUT/'display-case.glb'),export_format='GLB',export_yup=True,export_apply=True)
print('Empty display case saved and exported')

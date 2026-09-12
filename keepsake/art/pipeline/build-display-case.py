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

for x in [-.425,.425]:
    for z in [-.205,.205]:
        box('Case_Foot', (x,.043,z),(.09,.086,.09),wood,.008)
for y in [.115,1.095,2.075]:
    box('Case_Crossrail',(0,y,0),(.98,.065,.52),frame,.009)
box('Case_Back',(0,1.095,-.245),(.89,1.90,.023),wood)
for x in [-.465,.465]:
    for z in [-.235,.235]:
        box('Case_Stile',(x,1.095,z),(.05,1.90,.05),frame)
    box('Case_SideGlass',(x,1.095,0),(.006,1.86,.416),glass,.001)
for y in [.145,.625,1.125,1.605]:
    box('Case_Shelf',(0,y,0),(.88,.012,.43),glass,.002)
    box('Case_ShelfFront',(0,y,.22),(.89,.025,.025),frame)
    for x in [-.435,.435]:
        for z in [-.18,.18]:
            box('Case_ShelfSupport',(x,y-.015,z),(.024,.02,.027),brass,.003)
for y in [.6125,1.5875]:
    for side in [-1,1]:
        box('Case_DoorGlass',(side*.221,y,.244),(.434,.897,.005),glass,.001)
        box('Case_Handle',(side*.027,y,.268),(.018,.095,.019),brass,.007)
        for dy in [-.405,.405]:
            box('Case_Hinge',(side*.425,y+dy,.25),(.035,.022,.016),brass,.003)
for y in [.60,1.08,1.58,2.04]:
    box('Case_LEDChannel',(0,y,.115),(.83,.018,.028),brass,.003)
    box('Case_LEDDiffuser',(0,y-.011,.115),(.80,.004,.018),led,.001)
box('Case_SwitchPlate',(.467,1.10,.266),(.04,.065,.012),brass,.006)

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

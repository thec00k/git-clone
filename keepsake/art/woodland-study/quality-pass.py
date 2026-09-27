"""Illustrated Nostalgia desk finish; run after materials.py, before export.
Keeps semantic pivots and camera geometry intact; groups only static architecture.
"""
import bpy, math
from mathutils import Vector

def bevel(o,width):
    if o.type!='MESH': return
    m=o.modifiers.new('Quality edge catchlight','BEVEL');m.width=width;m.segments=3
    m.limit_method='ANGLE'
    n=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');n.keep_sharp=True

for o in list(bpy.context.scene.objects):
    if o.name=='Desk_Top': bevel(o,.003)
    elif o.name.startswith(('Desk_Leg','Desk_Apron','Desk_DrawerFront')): bevel(o,.002)
    elif o.name.startswith('Study_ChairLeg'): bevel(o,.0015)

# Keep brass quiet enough to support, rather than compete with, the paper.
for name in ['Woodland_Aged_Brass','Woodland_Olive_Enamel']:
    m=bpy.data.materials.get(name)
    if m:
        bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bs.inputs['Roughness'].default_value=.48 if 'Brass' in name else .52
for m in bpy.data.materials:
    if m.name.startswith('Woodland_'):
        for n in m.node_tree.nodes:
            if n.type=='NORMAL_MAP': n.inputs['Strength'].default_value=.24 if 'Linen' in m.name or 'Bookcloth' in m.name else .34

# A slim rolled rim gives the lamp a manufactured edge at the approved silhouette.
shade=bpy.data.objects.get('Lamp_Shade')
if shade:
    corners=[shade.matrix_world@Vector(v) for v in shade.bound_box]
    lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
    bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=6,major_radius=(hi.x-lo.x)/2-.001,minor_radius=.0018,location=((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z+.002))
    o=bpy.context.object;o.name='Quality_Lamp_Rolled_Rim';o.data.materials.append(bpy.data.materials['Woodland_Aged_Brass'])
    world=o.matrix_world.copy();o.parent=shade.parent;o.matrix_world=world

# Upholstery piping follows the chair's authored local cushion edges.
seat=bpy.data.objects.get('Study_ChairSeat')
if seat:
    coords=[Vector(v) for v in seat.bound_box]
    lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)));hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    curve=bpy.data.curves.new('Chair stitched welt','CURVE');curve.dimensions='3D';curve.bevel_depth=.0014;curve.bevel_resolution=1
    spline=curve.splines.new('POLY');points=[]
    r=.032
    for cx,cy,start in [(hi.x-r,hi.y-r,0),(lo.x+r,hi.y-r,90),(lo.x+r,lo.y+r,180),(hi.x-r,lo.y+r,270)]:
        for j in range(7):
            a=math.radians(start+j*15);points.append((cx+r*math.cos(a),cy+r*math.sin(a),hi.z-.022,1))
    spline.points.add(len(points)-1)
    for pt,co in zip(spline.points,points):pt.co=co
    spline.use_cyclic_u=True
    o=bpy.data.objects.new('Quality_Chair_Welt',curve);bpy.context.collection.objects.link(o);o.parent=seat;o.matrix_parent_inverse.identity()
    curve.materials.append(bpy.data.materials['Woodland_Moss_Woven_Linen'])

# Merge only non-interactive, static families in spatial groups. Keep the original
# first mesh name so geometry checks and semantic lookups remain meaningful.
groups={}
for o in list(bpy.context.scene.objects):
    if o.type!='MESH':continue
    family=None
    if o.name.startswith('Cabin_Side_Log'):family='side-'+str(round(o.location.x,1))
    elif o.name.startswith('Cabin_Window_Log'):family='window'
    elif o.name.startswith('Cabin_Door_Log'):family='door'
    elif o.name.startswith('Study_Chimney_Stone'):family='chimney'
    if family:
        # Half-metre height bands preserve close-view frustum culling.
        family += '-band-'+str(math.floor(o.matrix_world.translation.z/.5))
        if family.startswith('window'): family += '-side-'+str(o.matrix_world.translation.x>0)
        groups.setdefault(family,[]).append(o)
for items in groups.values():
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:
        bpy.context.view_layer.objects.active=o;o.select_set(True)
        for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
        o.select_set(False)
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    items[0]['quality_static_batch']=True
bpy.context.view_layer.update()
print('QUALITY_PASS: desk bevels, quiet materials, lamp rim, chair welt, spatial architecture batches')

"""Review renders of the Woodland study blend: same cameras and light for before/after."""
import bpy,sys,math
from mathutils import Vector
blend,out,=sys.argv[-2:]
bpy.ops.wm.open_mainfile(filepath=blend)
sc=bpy.context.scene
# Ceiling light on: the fan bowl glows, as it does in the app.
bowl=bpy.data.objects.get('Fan_Bowl')
if bowl:
    m=bowl.data.materials[0].copy();bowl.data.materials[0]=m
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Emission Color'].default_value=(1,.82,.6,1);bs.inputs['Emission Strength'].default_value=6
def web(p):return Vector((p[0],-p[2],p[1]))
for o in list(sc.objects):
    if o.type in {'CAMERA','LIGHT'}:bpy.data.objects.remove(o,do_unlink=True)
w=bpy.data.worlds.new('rv');sc.world=w;w.use_nodes=True
bg=w.node_tree.nodes['Background'];bg.inputs[0].default_value=(.55,.62,.7,1);bg.inputs[1].default_value=.35
def light(kind,p,energy,color,size=.3,rot=None):
    d=bpy.data.lights.new(kind,kind);d.energy=energy;d.color=color
    if kind=='AREA':d.size=size
    else:d.shadow_soft_size=size
    o=bpy.data.objects.new(kind,d);sc.collection.objects.link(o);o.location=web(p)
    if rot:o.rotation_euler=rot
    return o
light('POINT',(0,3.0,0),260,(1,.82,.62),.15)          # ceiling fixture
light('POINT',(-.9,1.2,-1.75),40,(1,.75,.5),.05)       # desk lamp
light('AREA',(-.15,2.1,-2.45),900,(.9,.95,1),2.0,(math.radians(90),0,0))  # window
light('POINT',(-.91,.5,1.6),60,(1,.55,.25),.2)          # hearth
light('POINT',(.3,2.0,1.2),80,(1,.9,.8),.5)            # soft fill
cam=bpy.data.cameras.new('c');co=bpy.data.objects.new('cam',cam);sc.collection.objects.link(co);sc.camera=co
sc.render.engine='CYCLES';sc.cycles.samples=int(sys.argv[-3]) if sys.argv[-3].isdigit() else 48;sc.cycles.use_denoising=True
sc.render.resolution_x=1200;sc.render.resolution_y=750;sc.view_settings.view_transform='AgX'
shots={
 'room':((1.15,1.75,1.75),(-.25,1.9,-1.9),68),
 'ceiling':((.9,1.35,1.5),(-.3,3.7,-1.2),74),
 'door':((.6,1.6,-1.35),(0.1,1.5,2.2),66),
 'corner':((.6,1.7,.2),(-2.5,2.0,-2.2),62),
 'side':((-1.0,1.5,0.6),(2.5,2.2,-.6),66),
}
for name,(p,t,fov) in shots.items():
    co.location=web(p);d=web(t)-web(p);co.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
    cam.angle=math.radians(fov);cam.clip_start=.05
    sc.render.filepath=f'{out}-{name}.png';bpy.ops.render.render(write_still=True)
print('RENDERED')

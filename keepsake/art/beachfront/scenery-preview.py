"""Blender authoring preview of BeachfrontScenery.tsx; excluded from room export.
Set PHASE to day, dusk or night before running. Animation remains in the app.
"""
import bpy, math
ROOT = r'C:/Users/iront/Desktop/keepsakeproject/git-clone-main/keepsake'
assert '/beachfront/' in bpy.data.filepath.replace('\\', '/'), 'Only edit Beachfront'
phase = globals().get('PHASE', 'day')
assert phase in ('day', 'dusk', 'night')
name = 'Beachfront Scenery Preview (Blender only)'
collection = bpy.data.collections.get(name)
if collection:
    for ob in list(collection.objects): bpy.data.objects.remove(ob, do_unlink=True)
else:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
collection['purpose'] = 'Static authoring preview; animated exterior is BeachfrontScenery.tsx'
collection['phase'] = phase

def material(label, color):
    mat = bpy.data.materials.get('Coast preview | '+label) or bpy.data.materials.new('Coast preview | '+label)
    rgb = [int(color[i:i+2],16)/255 for i in (1,3,5)]
    rgb = [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    mat.diffuse_color = (*rgb,1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes; nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial'); emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (*rgb,1)
    mat.node_tree.links.new(emission.outputs[0],out.inputs['Surface'])
    return mat

def finish(label, mat):
    ob = bpy.context.view_layer.objects.active
    ob.name = 'Beachfront_Preview_'+label
    ob['blender_preview_only'] = True
    for c in list(ob.users_collection): c.objects.unlink(ob)
    collection.objects.link(ob); ob.data.materials.append(mat)
    return ob

# App coordinates (x, up, depth) become Blender (x, -depth, up).
def pos(p): return (p[0],-p[2],p[1])
def plane(label,p,size,mat,flat=False):
    bpy.ops.mesh.primitive_plane_add(size=1,location=pos(p),rotation=(0,0,0) if flat else (math.pi/2,0,0))
    ob=finish(label,mat);ob.scale=(size[0],size[1],1);return ob

night=phase=='night';dusk=phase=='dusk'
sky=material('sky','#182c43' if night else '#e9ac8d' if dusk else '#abd8df')
water=material('water','#24485b' if night else '#77a7ac' if dusk else '#4fa5ae')
sand=material('sand','#6b6c63' if night else '#dfcaa8')
foam=material('foam','#688c9a' if night else '#b7d5ce')
rock=material('rock','#6b7d84' if night else '#aaa797')
cloud=material('cloud','#304256' if night else '#eaf1e7')
sun=material('sun moon','#eff4e4' if night else '#ffcf83' if dusk else '#fff0ce')
plane('Sky',(0,6,-30),(65,25),sky)
plane('Beach',(0,.55,-4.7),(35,5),sand,True)
plane('Ocean',(0,.65,-20),(65,31),water,True)
plane('Horizon',(0,-.2,-29),(65,4.8),water)
for i in range(25):
    plane('Wave_%02d'%i,(math.sin(i*3)*2,.665,-5-i*.9),(9+i*.6,.018+(i%3)*.012),foam,True)
bpy.ops.mesh.primitive_circle_add(vertices=48,radius=.43 if night else .55 if dusk else .6,fill_type='NGON',location=pos((-.7,4.2 if night else 2.53 if dusk else 6,-29.4)),rotation=(math.pi/2,0,0))
finish('Moon' if night else 'Sun',sun)
if night or dusk:
    for i in range(22):
        plane('Reflection_%02d'%i,(-.7+math.sin(i)*.04,2.16-i*.065,-28.98),(.16+i*.025+math.sin(i*2)*.055,.011+(i%3)*.006),sun)
# Shore rocks are authored by coastal-props.py and shared with the app export.
for i in range(3):
    for j in range(3):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=pos((-12+i*10+j*.8,6+(i%2)*2+math.sin(j)*.15,-26)))
        ob=finish('Cloud_%s_%s'%(i,j),cloud);ob.scale=(1.4,.6,.35)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/beachfront/beachfront.blend')
print('Saved Blender-only coastal preview: '+phase)

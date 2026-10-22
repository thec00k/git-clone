"""Validate the shipped GLB, not only Blender's source meshes."""
import bpy, os, json, math
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/room/sky-castle/sky-castle.glb'))
source={x['name']:x for x in json.load(open(os.path.join(ROOT,'art/sky-castle/source-inspection.json')))}
def bounds(o):
    points=[o.matrix_world@Vector(v) for v in o.bound_box]
    p=[(v.x,v.z,-v.y) for v in points]
    return [[f(v[k] for v in p) for k in range(3)] for f in [min,max]]
anchors=['Desk','Desk_Drawer','ks_book','ks_archive','ks_archive_drawer','ks_chair','ks_clock','ks_crt','ks_window','ks_window_cactus','ks_lamp','ks_shelf','ks_map','ks_ceiling_fan','ks_ceiling_fan_blades','ks_ceiling_switch','ks_door']
for name in anchors:
    o=bpy.data.objects.get(name);assert o is not None,name
    v=o.matrix_world.translation;position=(v.x,v.z,-v.y)
    assert all(abs(a-b)<.001 for a,b in zip(position,source[name]['position'])),(name,position)
    assert (o.parent.name if o.parent else None)==source[name]['parent'],name+' parenting'
assert abs(bounds(bpy.data.objects['Desk_Top'])[1][1]-.75)<.001,'desk contact height'
assert bpy.data.objects.get('Win_Sill') is None,'no shelf crossing the lower window arc'
trim=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith(('Sky_Window_Moulding','Sky_Window_Diamond'))]
trim_radius=max(math.hypot(p.x+.15,p.z-2.015) for o in trim for v in o.data.vertices for p in [o.matrix_world@v.co])
for side,center,halfwidth in [('Left',-.88,.06),('Right',.57,.065)]:
    sill=bpy.data.objects['Sky_Sill_Shelf_'+side]
    assert abs(bounds(sill)[1][1]-1.115)<.001,'shelf contact height'
    assert sill.parent.name=='ks_window'
    # All shelf/edge geometry stays outside the measured frame's radial envelope.
    for o in [sill,bpy.data.objects['Sky_Sill_Gold_Edge_'+side]]:
        radial=min(math.hypot(p.x+.15,p.z-2.015) for v in o.data.vertices for p in [o.matrix_world@v.co])
        assert radial>trim_radius+.01,(o.name,'frame clearance',radial,trim_radius)
    for x,z in [(center+dx,-2.063+dz) for dx in [-halfwidth,halfwidth] for dz in [-.065,.065]]:
        origin=sill.matrix_world.inverted()@Vector((x,-z,1.5))
        hit,location,normal,index=sill.ray_cast(origin,Vector((0,0,-1)))
        assert hit and abs((sill.matrix_world@location).z-1.115)<.001,('shelf supports prop footprint',side,x,z)
assert abs(bounds(bpy.data.objects['Sky_Sill_Bowl'])[0][1]-1.115)<.001,'planter rests on sill'
for o in bpy.data.objects:
    if o.type=='MESH' and o.name.startswith('Sky_Castle_'):
        assert bounds(o)[1][2]<-20,'castle placed farther back'
assert bpy.data.objects['Shelf_Back'].data.materials[0].name=='Sky • lagoon enamel'
assert bpy.data.objects['Beanbag'].data.materials[0].name=='Sky • lilac satin'
back=bounds(bpy.data.objects['Chair_Back']);assert back[1][1]-back[0][1]>.50,'substantial chair back'
assert bpy.data.objects['Chair_Back'].parent.name=='ks_chair'
floor=bounds(bpy.data.objects['Sky_Cloud_Floor']);assert floor[0][1]>=-.001 and floor[1][1]<.13
assert bpy.data.objects['Sky_Cloud_Floor'].data.uv_layers,'cloud surface has UVs'
for o in bpy.data.objects:
    assert all(math.isfinite(v) for row in o.matrix_world for v in row),o.name
    if o.type=='MESH' and o.name.startswith(('Sky_Window','Sky_Sill')):
        b=bounds(o);assert b[1][2]<-1.97,(o.name,'must remain behind desk props',b)
    assert not o.name.startswith(('Woodland_Botanical','Semantic_Curtain','Fern_Stems')),o.name
meshes=[o for o in bpy.data.objects if o.type=='MESH']
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
assert triangles<180000,triangles
assert len(meshes)<350,len(meshes)
report={'anchors':anchors,'deskBounds':bounds(bpy.data.objects['Desk_Top']),'chairBackBounds':back,'cloudFloorBounds':floor,'triangles':triangles,'meshes':len(meshes),'result':'PASS'}
with open(os.path.join(ROOT,'art/sky-castle/validation.json'),'w') as f:json.dump(report,f,indent=2)
print('SKY_CASTLE_VALIDATION_PASS',triangles,len(meshes))

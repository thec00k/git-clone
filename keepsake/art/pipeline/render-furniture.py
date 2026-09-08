"""Review renders for the furniture drawer. Does not resave editable sources."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public'/'room'/'furniture'
items=json.loads((OUT/'catalog.json').read_text(encoding='utf-8'))
for item in items:
    source=ROOT/'art'/'furniture'/(item['id']+'.blend')
    output=OUT/(item['id']+'.png')
    if output.exists() and output.stat().st_mtime>source.stat().st_mtime:continue
    bpy.ops.wm.open_mainfile(filepath=str(source))
    objects=[o for o in bpy.context.scene.objects if o.type in ('MESH','CURVE')]
    points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    target=(low+high)/2;extent=max(high-low)
    bpy.ops.object.camera_add(location=target+Vector((1.1,-1.8,1.2))*max(extent,.4))
    camera=bpy.context.object;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=extent*1.48;bpy.context.scene.camera=camera
    for location,power,size in [((2,-3,4),350,3),((-3,-1,2),180,3),((0,3,3),240,2)]:
        bpy.ops.object.light_add(type='AREA',location=target+Vector(location)*max(extent,.5))
        light=bpy.context.object;light.data.energy=power*max(extent,.5)**2;light.data.shape='DISK';light.data.size=size*max(extent,.5)
        light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.world.color=(.18,.18,.18)
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=scene.render.resolution_y=384;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(output)
    scene.view_settings.view_transform='AgX';bpy.ops.render.render(write_still=True)
    print('FURNITURE_REVIEW_RENDER',item['id'],flush=True)

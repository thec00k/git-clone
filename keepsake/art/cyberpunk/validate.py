"""Validate the authored Neon City scene without touching the user's open Blender file."""
import bpy, math, json, os
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(root,'art/cyberpunk/cyberpunk.blend'))
required=['Desk','ks_lamp','ks_shelf','Map_Sheet','Neon_Hologram_cat','Neon_Hologram_car','Neon_Hologram_flower','Neon_Jelly_0','Neon_Jelly_1']
missing=[n for n in required if n not in bpy.data.objects]
invalid=[o.name for o in bpy.data.objects if any(not math.isfinite(v) for row in o.matrix_world for v in row)]
meshes=[o for o in bpy.data.objects if o.type=='MESH']
triangles=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in meshes)
report={'objects':len(bpy.data.objects),'meshes':len(meshes),'triangles':triangles,'missing':missing,'invalid_transforms':invalid,'static_batches':len([o for o in meshes if o.name.startswith('Neon_Static')])}
assert not missing and not invalid,report
assert triangles<180000,report
def bounds(name):
 o=bpy.data.objects[name];pts=[o.matrix_world@Vector(v) for v in o.bound_box]
 return [min(v[i] for v in pts) for i in range(3)],[max(v[i] for v in pts) for i in range(3)]
dmin,dmax=bounds('Desk_Top');lmin,lmax=bounds('Neon_Lamp_foot')
assert abs(lmin[2]-dmax[2])<.001,'Lava lamp must rest on the desktop'
assert all(dmin[i]+.01<lmin[i]<lmax[i]<dmax[i]-.01 for i in [0,1]),'Entire lamp base must fit within desktop'
report['lamp_supported']=True
# No replacement structural face may cross the fan's central mounting space.
for o in meshes:
 if not o.name.startswith('Neon_Static'):continue
 for f in o.data.polygons:
  p=[o.matrix_world@o.data.vertices[i].co for i in f.vertices]
  low=[min(v[i] for v in p) for i in range(3)];high=[max(v[i] for v in p) for i in range(3)]
  assert not (low[2]>=3.02 and low[2]<3.15 and low[0]<.5 and high[0]>-.5 and low[1]<.5 and high[1]>-.5),'Support crosses fan mounting space'
report['fan_support_clearance']=True
with open(os.path.join(root,'art/cyberpunk/validation.json'),'w') as f:json.dump(report,f,indent=2)
print(json.dumps(report))


# The window reveal must stay behind desk objects; its opening clears the sill.
wmin,wmax=bounds('Neon_Window_Frame')
for name in ['CRT_Body','CRT_Back','Neon_Lamp_glass','Neon_Lamp_cap']:
 low,high=bounds(name)
 assert wmin[1]-high[1]>.05, 'Window protrudes into '+name
smin,smax=bounds('Win_Sill')
rmin,rmax=bounds('Neon_Window_Reveal')
assert rmin[2]>=smax[2], 'Old sill protrudes into window opening'
assert rmin[0]>-1.1 and rmax[0]<.8 and rmin[2]>1.125 and rmax[2]<2.625, 'Reveal crosses wall aperture'
report['window_desk_clearance']=True
report['window_sill_clearance']=True
with open(os.path.join(root,'art/cyberpunk/validation.json'),'w') as f:json.dump(report,f,indent=2)

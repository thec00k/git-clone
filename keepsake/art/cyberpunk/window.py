# Rounded, recessed Neon City window. Coordinates use web XYZ.
for o in list(bpy.data.objects):
 if 'curtain' in o.name.lower() or (o.name.startswith('Win_') and o.name!='Win_Sill'):
  bpy.data.objects.remove(o,do_unlink=True)
def window_loop(hx,hy,r,z,center_y=1.915):
 points=[]
 for cx,cy,start in [(hx-r,hy-r,0),(-hx+r,hy-r,90),(-hx+r,-hy+r,180),(hx-r,-hy+r,270)]:
  for i in range(13):
   a=math.radians(start+i*90/12)
   points.append((-.15+cx+r*math.cos(a),center_y+cy+r*math.sin(a),z))
 return points
def window_band(name,a,b,m):
 count=len(a);mesh=bpy.data.meshes.new(name)
 mesh.from_pydata([xyz(p) for p in a+b],[],[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(m)
 return o
outer=window_loop(1.075,.875,.075,-2.075)
front=window_loop(.94,.71,.22,-2.075,1.85)
rear=window_loop(.90,.71,.20,-2.295,1.85)
window_band('Neon_Window_Frame',outer,front,dark)
window_band('Neon_Window_Reveal',front,rear,metal)
window_band('Neon_Window_OuterDepth',window_loop(1.075,.875,.075,-2.30),outer,dark)
path=window_loop(.991,.796,.26,-2.061)
tube('Neon_Static_window_border',path+[path[0]],.012,pink)
path=window_loop(.906,.716,.205,-2.28,1.85)
tube('Neon_Static_window_inner',path+[path[0]],.004,cyan)

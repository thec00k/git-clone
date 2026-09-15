def mesh(name,verts,faces,mat,parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    if parent:
        bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    return o
def box(name,p,s,mat,parent=None,bevel=0):
    v=[(p[0]+x*s[0]/2,p[1]+y*s[1]/2,p[2]+z*s[2]/2) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
    o=mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,parent)
    if bevel:
        mod=o.modifiers.new('Polished edges','BEVEL');mod.width=bevel;mod.segments=2
    return o
def tube(name,points,r,mat,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for v,p in zip(s.points,points):v.co=(*xyz(p),1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    if parent:bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=parent;o.matrix_world=w
    return o
def ring(name,p,r,thick,mat,parent=None,plane='xy'):
    return tube(name,[(p[0]+r*math.cos(a*math.tau/96),p[1]+(r*math.sin(a*math.tau/96) if plane=='xy' else 0),p[2]+(r*math.sin(a*math.tau/96) if plane=='xz' else 0)) for a in range(97)],thick,mat,parent)
def cone(name,p,r,h,mat,r2=0,parent=None,n=12):
    verts=[(p[0]+rad*math.cos(i*math.tau/n),p[1]+y,p[2]+rad*math.sin(i*math.tau/n)) for y,rad in [(-h/2,r),(h/2,r2) ] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,parent)
def crystal(name,p,r,h,mat=glass,parent=None):
    cone(name+'_body',(p[0],p[1]+h*.36,p[2]),r,h*.72,mat,r*.81,parent,6)
    cone(name+'_tip',(p[0],p[1]+h*.86,p[2]),r*.81,h*.28,mat,0,parent,6)
def finish(o,m):o.data.materials.clear();o.data.materials.append(m)



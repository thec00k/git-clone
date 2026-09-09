"""Recover textile identities from the original material-batched room meshes.

Keep UVs and materials intact. The asset refresh pipeline subsequently validates
and publishes these sources. Re-running is harmless after the batches are split.
"""
import bpy,bmesh,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
backup=ROOT/'art'/'.staging'/'before-textile-separation'
backup.mkdir(parents=True,exist_ok=True)
for room in ['woodland','beachfront']:
    source=ROOT/'art'/room/(room+'.blend')
    if not (backup/source.name).exists():shutil.copy2(source,backup/source.name)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    count=0
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith('Semantic_Curtain') and not any(s in obj.name for s in ['linen','brass']):
            obj.name=obj.name.replace('Semantic_Curtain','Semantic_WallDecor');count+=1
        if obj.type=='MESH' and obj.name.startswith('Semantic_Curtain') and 'linen' in obj.name:
            # The batched linen also included the small paper faces of wall art.
            # Only the tall connected cloth islands belong to the curtain slot.
            bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table()
            unseen=set(bm.verts);cloth=set()
            while unseen:
                todo=[unseen.pop()];island=set(todo)
                while todo:
                    vertex=todo.pop()
                    for edge in vertex.link_edges:
                        other=edge.other_vert(vertex)
                        if other in unseen:unseen.remove(other);island.add(other);todo.append(other)
                zs=[(obj.matrix_world@v.co).z for v in island]
                if max(zs)-min(zs)>.8:cloth.update(v.index for v in island)
            rejected={f.index for f in bm.faces if any(v.index not in cloth for v in f.verts)}
            bm.free()
            if rejected:
                paper=obj.copy();paper.data=obj.data.copy();paper.name=obj.name.replace('Semantic_Curtain','Semantic_WallArt');bpy.context.collection.objects.link(paper)
                for target,drop in [(obj,rejected),(paper,set(range(len(obj.data.polygons)))-rejected)]:
                    edit=bmesh.new();edit.from_mesh(target.data);edit.faces.ensure_lookup_table()
                    bmesh.ops.delete(edit,geom=[f for f in edit.faces if f.index in drop],context='FACES')
                    bmesh.ops.delete(edit,geom=[v for v in edit.verts if not v.link_faces],context='VERTS')
                    edit.to_mesh(target.data);edit.free();target.data.update()
                count+=1
        if obj.type!='MESH' or '_Static_' not in obj.name or 'oak_plank' in obj.name:continue
        vertices=[obj.matrix_world@v.co for v in obj.data.vertices]
        sets={}
        for face in obj.data.polygons:
            vs=[vertices[i] for i in face.vertices]
            x=sum(v.x for v in vs)/len(vs)
            name=None
            if any(s in obj.name for s in ['terracotta','oatmeal_linen']) and all(v.z>=.001 and v.z<.045 for v in vs):name='Rug'
            elif any(s in obj.name for s in ['linen','brass']) and all(v.z>1.04 and v.y>1.88 for v in vs) and (x<-1.11 or x>.81):name='Curtain_L' if x<0 else 'Curtain_R'
            if name:sets.setdefault(name,set()).add(face.index)
        if not sets:continue
        def keep(mesh,indices):
            bm=bmesh.new();bm.from_mesh(mesh);bm.faces.ensure_lookup_table()
            bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in indices],context='FACES')
            bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
            bm.to_mesh(mesh);bm.free();mesh.update()
        removed=set()
        for name,indices in sets.items():
            part=obj.copy();part.data=obj.data.copy();part.name='Semantic_'+name+'_'+obj.name.split('_Static_')[-1]
            bpy.context.collection.objects.link(part);keep(part.data,indices);removed.update(indices);count+=1
            part['keepsake_customization_slot']='rug' if name=='Rug' else 'curtains'
        keep(obj.data,set(range(len(obj.data.polygons)))-removed)
    if count:bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
    print('TEXTILE_IDENTITIES',room,count)

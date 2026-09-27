import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const url=new URL('../public/room/woodland-study/woodland-study.glb',import.meta.url);
const bytes=await readFile(url);
const {scene}=await new GLTFLoader().register(()=>({name:'geometry-only-materials',loadMaterial:()=>Promise.resolve(new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))})).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
scene.updateMatrixWorld(true);
const poses=JSON.parse(await readFile(new URL('../src/generated/woodlandStudy.json',import.meta.url)));
const required=['Desk','Desk_Top','Desk_Drawer','ks_book','ks_window','Win_Sill','ks_chair','ks_shelf','ks_door','ks_archive','ks_archive_drawer','CRT_Screen','Hearth_Light'];
required.forEach(n=>assert.ok(scene.getObjectByName(n),'Missing functional anchor '+n));
for(const [id,pose] of Object.entries(poses)){
 for(const [prefix,point] of [['Camera_',pose.position],['Target_',pose.target]]){
  const actual=scene.getObjectByName(prefix+id).getWorldPosition(new THREE.Vector3());
  assert.ok(actual.distanceTo(new THREE.Vector3(...point))<.00001,'Manifest must match authored anchor '+prefix+id);
 }
}
const meshes=[];scene.traverse(o=>{if(o.isMesh){meshes.push(o);for(const m of [].concat(o.material))m.side=THREE.DoubleSide;}});
const ray=new THREE.Raycaster();
const trace=(origin,direction,far=4)=>{ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction).normalize());ray.near=.001;ray.far=far;return ray.intersectObjects(meshes,false);};
// Actual mesh raycasts through both apertures, and into the two filled roof corners.
for(const p of [[-.15,2,-1.9],[-.15,3.35,-1.9]])assert.equal(trace(p,[0,0,-1],1).length,0,'Window aperture must remain clear '+p);
for(const p of [[-.85,3.65,-1.9],[.55,3.65,-1.9]])assert.ok(trace(p,[0,0,-1],1).some(h=>h.object.name.startsWith('Study_Transom')),'No roof hole outside the triangular opening');
// Camera paths, including the editor approach: test the centerline and a small body envelope.
const points=[...Object.values(poses).map(p=>p.position),[-.15,1.55,-1.12]];
for(const from of points)for(const to of points){
 const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to),delta=end.clone().sub(start),length=delta.length();if(length<.001)continue;
 for(const offset of [[0,0,0],[.04,0,0],[-.04,0,0],[0,.04,0],[0,-.04,0]]){
  const hits=trace(start.clone().add(new THREE.Vector3(...offset)).toArray(),delta.toArray(),length);
  assert.equal(hits.length,0,'Camera corridor collision: '+from+' to '+to+' / '+hits.map(h=>h.object.name));
 }
}
const bounds=n=>new THREE.Box3().setFromObject(scene.getObjectByName(n));
assert.ok(Math.abs(bounds('Desk_Top').max.y-.75)<.001,'Book support height must match live book placement');
assert.ok(bounds('Win_Sill').min.y>bounds('Desk_Top').max.y+.25,'Sill does not clip the desk');
const hearth=new THREE.Box3();meshes.filter(o=>o.name.startsWith('Study_Hearth')).forEach(o=>hearth.union(new THREE.Box3().setFromObject(o)));
assert.ok(!hearth.intersectsBox(bounds('ks_door')),'Hearth stays clear of door frame');
assert.ok(!hearth.intersectsBox(bounds('Beanbag')),'Hearth stays clear of sitting cushion');
const chair=scene.getObjectByName('ks_chair');
const forward=new THREE.Vector3(0,0,-1).transformDirection(chair.matrixWorld);
assert.ok(Math.abs(THREE.MathUtils.radToDeg(Math.atan2(forward.x,-forward.z))-20)<.01,'Chair faces 20 degrees toward window-right');
const chimney=new THREE.Box3();meshes.filter(o=>o.name.startsWith('Study_Chimney')).forEach(o=>chimney.union(new THREE.Box3().setFromObject(o)));
assert.ok(chimney.max.y>=bounds('Study_Ceiling').min.y-.005,'Chimney reaches ceiling without a gap');
assert.ok(!chimney.intersectsBox(bounds('ks_door')),'Chimney does not intrude into the door');
assert.ok(meshes.some(o=>o.name.startsWith('Cabin_Window_Log')),'Cabin courses are exported geometry');
let triangles=0;for(const mesh of meshes)triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
const report={bytes:bytes.length,meshes:meshes.length,triangles,checks:['Functional anchors','Camera manifest alignment','Square and triangular apertures','Roof closure','All authored camera corridors','Desk and sill clearance','Hearth clearance','Chair heading','Chimney ceiling and door clearance','Rounded log geometry']};
await writeFile(new URL('../art/woodland-study/review/geometry.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));


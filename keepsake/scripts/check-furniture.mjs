import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {furnitureBounds,fitFurniture} from '../src/lib/furnitureGeometry.ts';
import {FURNITURE_ITEMS,validFurnitureChoices} from '../src/lib/furniture.ts';
assert.equal(FURNITURE_ITEMS.length,22);
assert.ok(validFurnitureChoices({woodland:{desk:'desk-1'},beachfront:{desk:'desk-2'}}));
for(const invalid of [{woodland:{desk:'chair-1'}},{woodland:{desk:'../../../x'}},{unknown:{desk:'desk-1'}},[],null])assert.equal(validFurnitureChoices(invalid),false);
for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI]){
  const model=new THREE.Group();model.add(new THREE.Mesh(new THREE.BoxGeometry(.8,.9,.4)));model.rotation.y=yaw;
  const target=new THREE.Box3(new THREE.Vector3(-1.1,.75,-2.1),new THREE.Vector3(.8,1.2,-1.3));
  fitFurniture(model,target);const actual=new THREE.Box3().setFromObject(model);
  assert.ok(actual.min.distanceTo(target.min)<1e-6&&actual.max.distanceTo(target.max)<1e-6,'Rotated replacement fits the authored support');
}
const parent=new THREE.Group();parent.position.set(2,.7,-1);parent.rotation.y=.4;
const body=new THREE.Mesh(new THREE.BoxGeometry(.6,.8,.4));parent.add(body);
const memory=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));memory.position.set(3,4,5);body.add(memory);
const bounds=furnitureBounds([body],parent);assert.ok(bounds.getSize(new THREE.Vector3()).distanceTo(new THREE.Vector3(.6,.8,.4))<1e-6,'Attached memories do not inflate furniture bounds');
for(const item of FURNITURE_ITEMS){
  const file=fs.readFileSync(new URL('../public'+item.asset,import.meta.url));
  assert.ok(file.length<4*1024*1024,`${item.id} exceeds the prototype asset budget`);
  const gltf=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)));
  assert.ok(gltf.meshes?.length,`${item.id} contains geometry`);
  assert.ok((gltf.images??[]).every(image=>image.bufferView!==undefined),'Textures are portable and embedded');
  assert.ok(fs.existsSync(new URL('../public'+item.thumbnail,import.meta.url)),`${item.id} has a review thumbnail`);
}
console.log('PASS furniture allowlist, 22 portable variants, rotated fitting and preserved attached memories.');

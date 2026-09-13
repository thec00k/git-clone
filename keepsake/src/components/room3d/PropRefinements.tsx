import {useEffect} from 'react';
import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {useActiveRoom} from './useActiveRoom';

let pending:Promise<GLTF>|undefined;
function load(){return pending??=new GLTFLoader().loadAsync('/room/furniture/prop-refinements.glb?v=1').catch(error=>{pending=undefined;throw error;});}

/** Refine only the mesh surface. All names, parenting, screens and state remain live. */
export function PropRefinements({scene}:{scene:THREE.Object3D}){
 const room=useActiveRoom().id;
 useEffect(()=>{
  let active=true;const changed:{mesh:THREE.Mesh;original:THREE.BufferGeometry;refined:THREE.BufferGeometry}[]=[];
  load().then(asset=>{
   if(!active)return;
   asset.scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh)||!o.name.startsWith(room+'__'))return;
    const target=scene.getObjectByName(o.name.slice(room.length+2));
    if(!(target instanceof THREE.Mesh))return;
    // glTF's Y-up conversion lives on the exported node. Bake only that rotation
    // into the overlay vertices so the source node's transform remains untouched.
    o.updateWorldMatrix(true,false);
    const refined=o.geometry.clone().applyMatrix4(o.matrixWorld);
    target.geometry.computeBoundingBox();refined.computeBoundingBox();
    const oldBounds=target.geometry.boundingBox!,newBounds=refined.boundingBox!;
    if(oldBounds.min.distanceTo(newBounds.min)>.0002||oldBounds.max.distanceTo(newBounds.max)>.0002){refined.dispose();throw new Error(`Refinement bounds changed for ${target.name}`);}
    changed.push({mesh:target,original:target.geometry,refined});target.geometry=refined;
    target.userData.refinedProp=true;
   });
  }).catch(error=>{if(active)console.warn('Prop refinements unavailable; original surfaces retained.',error);});
  return()=>{active=false;changed.forEach(({mesh,original,refined})=>{if(mesh.geometry===refined)mesh.geometry=original;delete mesh.userData.refinedProp;refined.dispose();});};
 },[scene,room]);
 return null;
}

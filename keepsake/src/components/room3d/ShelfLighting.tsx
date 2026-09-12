import { useMemo } from "react";
import * as THREE from "three";
export function ShelfLighting({scene,on}:{scene?:THREE.Object3D;on:boolean}) {
 const strips=useMemo(()=>{
  if(!scene)return [];
  return ["ks_shelf_board_0","ks_shelf_board_1","ks_shelf_board_2","Shelf_Top"].flatMap(name=>{
   const shelf=scene.getObjectByName(name);if(!shelf)return [];
   const box=new THREE.Box3().setFromObject(shelf);
   return [{name,x:box.max.x-.045,y:box.min.y-.008,z:(box.min.z+box.max.z)/2,length:box.max.z-box.min.z-.10}];
  });
 },[scene]);
 return <>{strips.map(s=><group key={s.name}>
  <mesh position={[s.x,s.y,s.z]}><boxGeometry args={[.018,.009,s.length]}/><meshStandardMaterial color="#70634c" roughness={.8}/></mesh>
  {/* Bounded washes cannot reach the floor, including with Balanced shadows off. */}
  {on&&[-.32,0,.32].map(offset=><pointLight key={offset} position={[s.x-.27,s.y-.025,s.z+offset*s.length]} color="#ffe1ad" intensity={.65} distance={.39} decay={1}/>)}
 </group>)}</>;
}


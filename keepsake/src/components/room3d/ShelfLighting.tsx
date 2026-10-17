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
 // Glowing strips under every board, with two always-mounted washes shared between rows.
 // Mounting/unmounting lights changes the scene's light count, which forces three.js to
 // recompile every material (a multi-second freeze); each extra light also slows every shader.
 return <>
  {strips.map(s=><mesh key={s.name} position={[s.x,s.y,s.z]}><boxGeometry args={[.018,.009,s.length]}/><meshStandardMaterial color="#70634c" roughness={.8} emissive="#ffe1ad" emissiveIntensity={on?.9:0}/></mesh>)}
  {/* Bounded washes cannot reach the floor, including with Balanced shadows off. */}
  {strips.filter((_,i)=>i%2===0).map(s=><pointLight key={s.name} position={[s.x-.27,s.y-.025,s.z]} color="#ffe1ad" intensity={on?1.3:0} distance={.95} decay={1}/>)}
 </>;
}


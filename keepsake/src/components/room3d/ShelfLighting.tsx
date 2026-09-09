import { useMemo } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
RectAreaLightUniformsLib.init();
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
  {on&&<><rectAreaLight position={[s.x,s.y-.008,s.z]} rotation={[-Math.PI/2,0,Math.PI/2]} width={s.length} height={.035} color="#ffe1ad" intensity={11}/>
  <rectAreaLight position={[s.x-.46,s.y-.13,s.z]} rotation={[0,-Math.PI/2,Math.PI/2]} width={s.length} height={.22} color="#ffe1ad" intensity={4}/></>}
 </group>)}</>;
}

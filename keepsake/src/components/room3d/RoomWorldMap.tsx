import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
export function RoomWorldMap({scene,onOpen}:{scene:THREE.Object3D;onOpen:()=>void}) {
 const [texture,setTexture]=useState<THREE.Texture|null>(null);
 useEffect(()=>{
  let live=true;
  const map=new THREE.TextureLoader().load("/maps/world-room.svg",()=>{if(live)setTexture(map);});
  map.colorSpace=THREE.SRGBColorSpace;
  return ()=>{live=false;map.dispose();};
 },[]);
 const surface=useMemo(()=>{
  const sheet=scene.getObjectByName("Map_Sheet");if(!sheet)return null;
  const b=new THREE.Box3().setFromObject(sheet);
  const width=(b.max.z-b.min.z)*.96;
  return {position:[b.max.x+.002,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2] as [number,number,number],width,height:Math.min((b.max.y-b.min.y)*.96,width*620/950)};
 },[scene]);
 if(!surface||!texture)return null;
 return <mesh name="World_Map_Print" position={surface.position} rotation={[0,Math.PI/2,0]} onClick={e=>{e.stopPropagation();if(e.delta<4)onOpen();}}>
  <planeGeometry args={[surface.width,surface.height]}/>
  <meshStandardMaterial map={texture} color="#f6edd7" roughness={1} polygonOffset polygonOffsetFactor={-1}/>
 </mesh>;
}

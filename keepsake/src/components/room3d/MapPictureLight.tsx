import { useMemo } from "react";
import * as THREE from "three";
export function MapPictureLight({scene,night}:{scene?:THREE.Object3D;night:boolean}) {
 const fixture=useMemo(()=>{
  const board=scene?.getObjectByName("ks_map");if(!board)return null;
  const b=new THREE.Box3().setFromObject(board);const z=(b.min.z+b.max.z)/2;
  const target=new THREE.Object3D();target.position.set(b.max.x+.015,(b.min.y+b.max.y)/2,z);
  return {x:b.max.x+.15,y:b.max.y+.055,z,target};
 },[scene]);
 if(!fixture)return null;
 const {x,y,z,target}=fixture;
 return <group>
  <mesh position={[x-.07,y,z]}><boxGeometry args={[.14,.018,.05]}/><meshStandardMaterial color="#7c6540" metalness={.65} roughness={.4}/></mesh>
  <mesh position={[x,y,z]}><boxGeometry args={[.055,.035,.56]}/><meshStandardMaterial color="#7c6540" metalness={.65} roughness={.4}/></mesh>
  <mesh position={[x-.005,y-.019,z]}><boxGeometry args={[.034,.005,.51]}/><meshStandardMaterial color="#f0dfb5" emissive="#ffdc98" emissiveIntensity={night?2:0}/></mesh>
  <primitive object={target}/>
  {night&&<spotLight position={[x,y-.025,z]} target={target} color="#ffe0a3" intensity={4} angle={.95} penumbra={.65} distance={2.3} decay={2}/>}
 </group>;
}

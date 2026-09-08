import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';

/** Animate independent authored pivots; preserve geometry and swap-friendly names. */
export function CoastalInteractions({scene,open}:{scene:THREE.Object3D;open:boolean}){
 const reduced=useReducedMotion();
 const hinges=useMemo(()=>['Left','Right'].map(s=>scene.getObjectByName(`Beachfront_Casement_${s}_Hinge`)),[scene]);
 const fish=useMemo(()=>new THREE.Group(),[]);
 const center=useMemo(()=>new THREE.Vector3(1.075,.944,-1.767),[]);
 useEffect(()=>{
  const objects=['Beachfront_Prop_Fish','Beachfront_Prop_Fish_Tail','Beachfront_Prop_Fish_Fin','Beachfront_Prop_Fish_Eye'].map(n=>scene.getObjectByName(n)).filter((o):o is THREE.Object3D=>!!o);
  const parents=objects.map(o=>o.parent);scene.add(fish);fish.position.copy(center);fish.rotation.set(0,0,0);scene.updateMatrixWorld(true);objects.forEach(o=>fish.attach(o));
  return()=>{fish.position.copy(center);fish.rotation.set(0,0,0);fish.updateMatrixWorld(true);objects.forEach((o,i)=>parents[i]?.attach(o));scene.remove(fish);};
 },[scene,fish,center]);
 useFrame(({clock},dt)=>{
  hinges.forEach((h,i)=>{if(h)h.rotation.y=THREE.MathUtils.damp(h.rotation.y,(open?62*Math.PI/180:0)*(i===0?1:-1),5,reduced?100:Math.min(dt,.05));});
  if(reduced)return;
  const t=clock.elapsedTime;fish.position.set(center.x+Math.sin(t*.38)*.021,center.y+Math.sin(t*.7)*.004,center.z+Math.cos(t*.38)*.012);fish.rotation.y=Math.sin(t*.38)*.3;fish.rotation.z=Math.sin(t*1.1)*.025;
 });
 return null;
}

import {CoastalSky,CoastalWater,CoastalHorizon} from './CoastalWater';
import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import type {Environment} from '../../types/app';
import type {Phase} from '../room/RoomFurniture';

/** A layered coastal view outside the window, independent of the room shell. */
export function BeachfrontScenery({phase,environment}: {phase:Phase;environment:Environment}) {
  const reduced=useReducedMotion(); const boat=useRef<THREE.Group>(null);
  const night=phase==='night', dusk=phase==='dusk', storm=environment.weather!=='clear';
  const rain=useRef<THREE.Points>(null);
  const reflection=useRef<THREE.Group>(null);
  const drops=useMemo(()=>new Float32Array(Array.from({length:270},(_,i)=>i%3===0?Math.sin(i*7)*7:i%3===1?(i*.17)%7:-3-(i*.13)%10)),[]);
  useFrame(({clock},dt)=>{
    if(reduced)return;
    const t=clock.elapsedTime;
    reflection.current?.children.forEach((o,i)=>{o.scale.x=1+Math.sin(t*.7+i*1.8)*.16;o.position.x=-.7+Math.sin(t*.4+i)*.045;});
    if(boat.current){boat.current.position.y=.86+Math.sin(t*.5)*.035;boat.current.rotation.z=Math.sin(t*.4)*.025;}
    if(rain.current){const a=rain.current.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)-Math.min(dt,.05)*(environment.weather==='snow'?.25:2.2);if(y<-.2)y=6.5;a.setY(i,y);}a.needsUpdate=true;}
  });
  return <group>
    <CoastalSky phase={phase} storm={storm}/><CoastalWater phase={phase} storm={storm}/>
    <CoastalHorizon phase={phase}/>
    <mesh position={[-.7,night?4.2:dusk?2.53:6,-29.4]}><circleGeometry args={[night?.43:dusk?.55:.6,48]}/><meshBasicMaterial color={night?'#eff4e4':dusk?'#ffcf83':'#fff0ce'} transparent opacity={storm?.65:1}/></mesh>
    {(night||dusk)&&<group ref={reflection}>{Array.from({length:22},(_,i)=><mesh key={i} position={[-.7+Math.sin(i)*.04,2.16-i*.065,-28.98]}><planeGeometry args={[.16+i*.025+Math.sin(i*2)*.055,.011+(i%3)*.006]}/><meshBasicMaterial color={night?'#d4e8ea':'#ffe3a0'} transparent opacity={(storm?.35:.62)*(1-i*.025)} depthWrite={false}/></mesh>)}</group>}
    {[0,1,2].map(i=><group key={i} position={[-12+i*10,6+(i%2)*2,-26]}>{[0,1,2].map(j=><mesh key={j} position={[j*.8,Math.sin(j)*.15,0]} scale={[1.4,.35,.6]}><sphereGeometry args={[1,12,6]}/><meshBasicMaterial color={night?'#304256':storm?'#b7c5c5':'#eaf1e7'}/></mesh>)}</group>)}
    {[0,1,2,3].map(i=><mesh key={i} position={[-15+i*1.9,.9,-24]} scale={[3,.65+(i%2)*.4,1.5]}><sphereGeometry args={[1,12,6]}/><meshBasicMaterial color={night?'#233b49':'#819c98'}/></mesh>)}
    <group ref={boat} position={[3,.86,-14]}>
      <mesh scale={[.7,.1,.2]}><sphereGeometry args={[1,12,6]}/><meshStandardMaterial color="#85583c"/></mesh>
      <mesh position={[0,.6,0]}><cylinderGeometry args={[.015,.015,1.2,6]}/><meshStandardMaterial color="#d1c1a0"/></mesh>
      <mesh position={[.23,.61,0]}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-.21,-.46,0,-.21,.51,0,.35,-.46,0]),3]}/></bufferGeometry><meshBasicMaterial color={night?'#a0afb5':'#f6edd6'} side={THREE.DoubleSide}/></mesh>
    </group>
    {storm&&<points ref={rain}><bufferGeometry><bufferAttribute attach="attributes-position" args={[drops,3]}/></bufferGeometry><pointsMaterial color="#e4efef" size={environment.weather==='snow'?.025:.013} transparent opacity={.6} depthWrite={false}/></points>}
  </group>;
}

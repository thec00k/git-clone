import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import type {Environment} from '../../types/app';
import type {Phase} from '../room/RoomFurniture';
import {cloudTexture} from './skyTextures';

const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const waterfallFragment=`varying vec2 vUv;uniform float time;uniform vec3 tint;
 void main(){float x=vUv.x;float streak=sin(x*159.+sin(x*27.)*3.+time*.7)*.12+sin(x*67.-time*1.8)*.13;
 float foam=pow(max(0.,sin(vUv.y*50.+time*3.8+x*21.)),12.)*.18;
 float edge=smoothstep(0.,.16,x)*smoothstep(0.,.16,1.-x);float fade=smoothstep(0.,.22,vUv.y);
 gl_FragColor=vec4(tint+foam+streak*.3,(.48+streak+foam)*edge*fade);}`;
const skyFragment=`varying vec2 vUv;uniform vec3 top;uniform vec3 bottom;
 void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(0.,1.,vUv.y)),1.);}`;
export function SkyCastleScenery({phase,environment}:{phase:Phase;environment:Environment}){
  const reduced=useReducedMotion(),night=phase==='night',dusk=phase==='dusk';
  const storm=environment.weather!=='clear',high=environment.roomQuality==='high';
  const cloud=useMemo(()=>cloudTexture(),[]),mist=useRef<THREE.Group>(null);
  const water=useMemo(()=>new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:waterfallFragment,uniforms:{time:{value:0},tint:{value:new THREE.Color('#c8efff')}},transparent:true,depthWrite:false,side:THREE.DoubleSide}),[]);
  const sky=useMemo(()=>new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:skyFragment,uniforms:{top:{value:new THREE.Color()},bottom:{value:new THREE.Color()}},depthWrite:false}),[]);
  const elapsed=useRef(0);
  useEffect(()=>()=>{cloud.dispose();water.dispose();sky.dispose();},[cloud,water,sky]);
  useEffect(()=>{
    sky.uniforms.top.value.set(night?'#081921':dusk?'#5c668e':storm?'#65859b':'#78aed7');
    sky.uniforms.bottom.value.set(night?'#284e59':dusk?'#efbdaf':storm?'#c3d1d8':'#f9ece2');
    water.uniforms.tint.value.set(night?'#79afba':dusk?'#e1c5ee':'#d8f7ff');
  },[sky,water,night,dusk,storm]);
  useFrame((_,dt)=>{
    if(reduced||document.hidden)return;
    elapsed.current+=Math.min(dt,.05);water.uniforms.time.value=elapsed.current;
    if(mist.current)mist.current.position.x=Math.sin(elapsed.current*.035)*.16;
  });
  return <group name="Sky_Castle_Scenery">
    <mesh position={[0,8,-48]} material={sky}><planeGeometry args={[120,65]}/></mesh>
    <mesh position={[night?4.8:-5.5,night?6.5:7,-37]}><circleGeometry args={[night?.65:1.2,48]}/><meshBasicMaterial color={night?'#ddece7':'#fff0cd'} transparent opacity={storm?.45:.9}/></mesh>
    <group ref={mist} name="Sky_Cloud_Sea">
      {([[-6,2.3,-20,10,3.5],[4,3,-24,10,3.8],[-1,6,-30,13,4],[-4,-.35,-9,9,2.5],[5,-.7,-11,8,3],[-7,-1.5,-16,11,4],[0,-2.5,-18,13,4],[1,1.1,-27,10,3],[-11,5,-29,12,3.5],[10,6,-32,12,4],[-.5,-3.2,-7,12,3],...(high?[[-9,1,-13,6,2],[8,0,-18,7,2],[0,7.5,-34,8,2],[2,-4,-12,7,3],[-9,4,-27,6,2]]:[])] as number[][]).map(([x,y,z,w,h],i)=>{
        return <mesh key={i} position={[x,y,z]}>
          <planeGeometry args={[w,h]}/><meshBasicMaterial map={cloud} color={night?'#426876':dusk?'#f0cfe4':'#ffffff'} transparent opacity={.85} depthWrite={false}/>
        </mesh>;
      })}
    </group>
    {/* Matches the castle's framing offset in build.py. */}
    <group name="Sky_Waterfalls" position={[-2.8,2.8,-12]}>
      {[[-3.05,-2.65,-10.35,.42,6.5],[2.15,-2.9,-10.2,.50,7],[-.7,-3.05,-8.3,.75,7.4],[-7,-.4,-19,.32,3.5],[7.2,-.7,-22.7,.28,4.0]].map(([x,y,z,w,h],i)=><mesh name={`Sky_Waterfall_${i}`} key={i} position={[x,y,z]} material={water}><planeGeometry args={[w,h,2,12]}/></mesh>)}
    </group>
    {night&&<points name="Sky_Stars"><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(Array.from({length:240},(_,i)=>i%3===0?Math.sin(i*17.7)*26:i%3===1?4+(i%19)*.7:-35-(i%7))),3]}/></bufferGeometry><pointsMaterial color="#d8eee6" size={.065} sizeAttenuation transparent opacity={.85} depthWrite={false}/></points>}
  </group>;
}

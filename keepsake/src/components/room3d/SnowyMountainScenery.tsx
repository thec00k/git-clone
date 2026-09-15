import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useApp} from '../../store/appStore';
import type {Phase} from '../room/RoomFurniture';
import {createFireplaceAudio,type FireplaceAudio} from '../../lib/fireplaceAudio';

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const riverFragment=`varying vec2 vUv;uniform float time;uniform float strength;
void main(){
 float ripple=sin(vUv.y*145.-time*2.3+sin(vUv.x*19.+vUv.y*53.)*1.5);
 float thread=pow(max(0.,sin(vUv.x*33.+sin(vUv.y*45.-time*.65))),12.);
 float foam=smoothstep(.82,1.,abs(vUv.x*2.-1.))*.3+thread*smoothstep(.65,.97,ripple)*.38;
 vec3 c=mix(vec3(.035,.19,.23),vec3(.17,.39,.43),ripple*.15+.45);
 gl_FragColor=vec4(mix(c,vec3(.70,.83,.83),foam)*strength,1.);
}`;
const auroraFragment=`
varying vec2 vUv;uniform float time;uniform float strength;
void main(){
 vec3 sum=vec3(0.);float alpha=0.;
 for(int i=0;i<3;i++){
  float fi=float(i);float x=vUv.x;
  float arc=.22+fi*.18+.09*sin(x*7.+fi*2.+time*.08)+.035*sin(x*22.-time*.12);
  float d=vUv.y-arc;
  float edge=exp(-abs(d)*65.);
  float curtain=exp(-max(d,0.)*12.)*smoothstep(-.008,.012,d);
  float fold=.42+.35*sin(x*155.+sin(x*17.+time*.10)*7.+fi)+.23*sin(x*287.+fi*9.);
  float a=(edge*.30+curtain*.35)*(.50+fold*.50);
  vec3 color=mix(vec3(.04,.32,.94),vec3(.20,1.,.47),.5+.5*sin(x*6.+fi*2.+time*.035));
  sum+=color*a;alpha+=a;
 }
 float ends=smoothstep(0.,.09,vUv.x)*(1.-smoothstep(.91,1.,vUv.x))*(1.-smoothstep(.93,1.,vUv.y));
 gl_FragColor=vec4(sum*1.65,clamp(alpha,0.,.85)*ends*strength);
}`;

function FireplaceSound(){
 const {camera}=useThree();const {environment}=useApp();
 const sound=useRef<FireplaceAudio|null>(null),elapsed=useRef(0);
 const settings=useRef(environment);
 useEffect(()=>{settings.current=environment;},[environment]);
 const vectors=useMemo(()=>({position:new THREE.Vector3(),forward:new THREE.Vector3(),up:new THREE.Vector3(0,1,0)}),[]);
 useEffect(()=>{
  let alive=true;
  const start=()=>{
   if(!alive||document.hidden||settings.current.fireplaceSound===false||settings.current.ambienceVolume<=0)return;
   try{sound.current??=createFireplaceAudio();sound.current.resume();}catch{ /* Unavailable audio never blocks the room. */ }
  };
  const visibility=()=>{if(document.hidden)sound.current?.suspend();else if(sound.current&&settings.current.fireplaceSound!==false&&settings.current.ambienceVolume>0)sound.current.resume();};
  window.addEventListener('pointerdown',start);window.addEventListener('keydown',start);document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;window.removeEventListener('pointerdown',start);window.removeEventListener('keydown',start);document.removeEventListener('visibilitychange',visibility);sound.current?.dispose();sound.current=null;};
 },[]);
 useEffect(()=>{sound.current?.volume(environment.fireplaceSound===false?0:environment.ambienceVolume);if(environment.fireplaceSound===false||environment.ambienceVolume<=0)sound.current?.suspend();else if(!document.hidden)sound.current?.resume();},[environment.fireplaceSound,environment.ambienceVolume]);
 useFrame((_,dt)=>{
  elapsed.current+=dt;if(elapsed.current<.05)return;elapsed.current=0;
  if(!sound.current)return;
  camera.getWorldPosition(vectors.position);camera.getWorldDirection(vectors.forward);vectors.up.set(0,1,0).applyQuaternion(camera.quaternion);
  sound.current.listener(vectors.position,vectors.forward,vectors.up);
  sound.current.volume(settings.current.fireplaceSound===false?0:settings.current.ambienceVolume);
 });
 return null;
}

export function SnowyMountainScenery({phase}:{phase:Phase}){
 const reduced=useReducedMotion();const aurora=useRef<THREE.ShaderMaterial>(null);
 const uniforms=useMemo(()=>({time:{value:0},strength:{value:0}}),[]);
 const riverUniforms=useMemo(()=>({time:{value:0},strength:{value:1}}),[]);
 const river=useMemo(()=>{
  const geometry=new THREE.BufferGeometry(),positions=[],uvs=[],indices=[];
  for(let i=0;i<=180;i++){
   const z=-33+i/6,x=.35+1.1*Math.sin((z+4)*.16),y=-.18+(-z-3)*.021+Math.max(0,-z-24)*.16;
   for(const side of [-1,1]){positions.push(x+side*.72,y,z);uvs.push((side+1)/2,i/180);}
   if(i){const k=i*2;indices.push(k-2,k,k-1,k-1,k,k+1);}
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
 },[]);
 useEffect(()=>()=>river.dispose(),[river]);
 const stars=useMemo(()=>{
  const a=new Float32Array(360*3);let seed=27;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<360;i++){a[i*3]=(r()-.5)*110;a[i*3+1]=3+r()*48;a[i*3+2]=-77;}
  return a;
 },[]);
 useFrame((_,dt)=>{if(!aurora.current)return;const u=aurora.current.uniforms;if(!reduced&&!document.hidden){u.time.value+=Math.min(dt,.05);riverUniforms.time.value+=Math.min(dt,.05);}u.strength.value=phase==='night'?1:phase==='dusk'?.6:0;riverUniforms.strength.value=phase==='night'?.38:phase==='dusk'?.72:1;});
 return <group name="Cabin_Atmosphere">
  <FireplaceSound/>
  <mesh name="Cabin_Alpine_Sky" position={[0,18,-82]}><planeGeometry args={[170,104]}/><meshBasicMaterial color={phase==='night'?'#07192b':phase==='dusk'?'#344e69':'#afcbdc'}/></mesh>
  <mesh name="Cabin_Aurora" position={[0,21,-74]} visible={phase!=='day'}><planeGeometry args={[125,52]}/><shaderMaterial ref={aurora} uniforms={uniforms} vertexShader={vertex} fragmentShader={auroraFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/></mesh>
  <mesh name="Cabin_River" geometry={river}><shaderMaterial uniforms={riverUniforms} vertexShader={vertex} fragmentShader={riverFragment} side={THREE.DoubleSide}/></mesh>
  <points name="Cabin_Stars" visible={phase!=='day'}><bufferGeometry><bufferAttribute attach="attributes-position" args={[stars,3]}/></bufferGeometry><pointsMaterial size={.028} color="#d5f4ef" transparent opacity={phase==='night'?.8:.3} depthWrite={false}/></points>
 </group>;
}

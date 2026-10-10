import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useApp} from '../../store/appStore';
import {createFireplaceAudio,type FireplaceAudio} from '../../lib/fireplaceAudio';
import type {Phase} from '../room/RoomFurniture';

/** Fire in the Woodland hearth: autumn and winter only (the season engine decides). Adapted from the Snowy Mountain branch. */
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`varying vec2 vUv;uniform float time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 vec2 uv=vUv;float y=uv.y;float n=noise(vec2(uv.x*7.,y*5.-time*1.4))*.65+noise(vec2(uv.x*17.,y*13.-time*2.3))*.35;
 float tongues=0.;
 for(int i=0;i<5;i++){float fi=float(i);float x=.14+fi*.18+.05*sin(y*7.+time*1.9+fi);float h=.55+.22*sin(fi*1.7+time*.65);float width=.10*(1.-y)+.009;float flame=exp(-pow((uv.x-x)/width,2.))*(1.-smoothstep(h-.23,h,y));tongues=max(tongues,flame);}
 float a=clamp(tongues*(.75+n*.7),0.,1.)*smoothstep(0.,.045,y);float core=clamp(tongues*(1.-y)*1.65,0.,1.);
 vec3 c=mix(vec3(1.,.075,.003),vec3(1.,.66,.20),core);gl_FragColor=vec4(c*1.08,a);
}`;
const FIRE=new THREE.Vector3(-.91,.5,1.9);

function HearthSound(){
 const {camera}=useThree();const {environment}=useApp();
 const gesture=useRef(false),sound=useRef<FireplaceAudio|null>(null),elapsed=useRef(0),settings=useRef(environment);
 useEffect(()=>{settings.current=environment;},[environment]);
 const v=useMemo(()=>({p:new THREE.Vector3(),f:new THREE.Vector3(),u:new THREE.Vector3()}),[]);
 const wanted=()=>settings.current.fireplaceSound!==false&&settings.current.ambienceVolume>0&&!document.hidden;
 useEffect(()=>{
  let alive=true;
  // Browsers only allow audio after a gesture; start on the first one.
  const start=()=>{gesture.current=true;if(!alive||!wanted())return;try{sound.current??=createFireplaceAudio();sound.current.resume();}catch{/* audio never blocks the room */}};
  const visibility=()=>{if(document.hidden)sound.current?.suspend();else if(sound.current&&wanted())sound.current.resume();};
  window.addEventListener('pointerdown',start);window.addEventListener('keydown',start);document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;window.removeEventListener('pointerdown',start);window.removeEventListener('keydown',start);document.removeEventListener('visibilitychange',visibility);sound.current?.dispose();sound.current=null;};
 },[]);
 useEffect(()=>{
  if(!sound.current&&gesture.current&&wanted()){try{sound.current=createFireplaceAudio();}catch{/* no audio */}}
  const s=sound.current;if(!s)return;s.volume(environment.fireplaceSound===false?0:environment.ambienceVolume);if(wanted())s.resume();else s.suspend();},[environment.fireplaceSound,environment.ambienceVolume]);
 useFrame((_,dt)=>{
  elapsed.current+=dt;if(elapsed.current<.05)return;elapsed.current=0;
  const s=sound.current;if(!s)return;
  camera.getWorldPosition(v.p);camera.getWorldDirection(v.f);v.u.set(0,1,0).applyQuaternion(camera.quaternion);
  s.listener(v.p,v.f,v.u);s.volume(settings.current.fireplaceSound===false?0:settings.current.ambienceVolume);
 });
 return null;
}

export function HearthFire({phase}:{phase:Phase}){
 const reduced=useReducedMotion();
 const fire=useRef<THREE.ShaderMaterial>(null),light=useRef<THREE.PointLight>(null),elapsed=useRef(0);
 const uniforms=useMemo(()=>({time:{value:0}}),[]);
 useFrame((_,dt)=>{
  if(!reduced&&!document.hidden)elapsed.current+=Math.min(dt,.05);
  const t=elapsed.current,flicker=reduced?1:1+.075*Math.sin(t*7.1)+.04*Math.sin(t*13.7);
  if(fire.current)fire.current.uniforms.time.value=t;
  if(light.current)light.current.intensity=(phase==='day'?.5:1.1)*flicker;
 });
 return <group name="Hearth_Fire">
  <mesh position={[FIRE.x,FIRE.y-.02,FIRE.z-.1]} rotation={[0,Math.PI,0]}><planeGeometry args={[.4,.46]}/><shaderMaterial ref={fire} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide}/></mesh>
  <pointLight ref={light} position={[FIRE.x,FIRE.y+.08,FIRE.z-.2]} color="#ff9f45" intensity={1.1} distance={3.2} decay={2}/>
  <HearthSound/>
 </group>;
}

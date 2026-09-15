import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useApp} from '../../store/appStore';
import type {Phase} from '../room/RoomFurniture';

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

export function SnowyMountainEffects({scene,phase}:{scene:THREE.Object3D;phase:Phase}){
 const reduced=useReducedMotion();const {environment,state}=useApp();
 useEffect(()=>{
  for(const [id,name] of [['cabin-deer','Cabin_Deer_Mount'],['cabin-bear','Cabin_Bear_Mount']]){
   const mount=scene.getObjectByName(name);if(mount)mount.visible=!!state.roomDecor?.owned.includes(id)&&!!state.roomDecor?.cabinMounts?.includes(id);
  }
 },[scene,state.roomDecor?.owned,state.roomDecor?.cabinMounts]);
 const fire=useRef<THREE.ShaderMaterial>(null),hearthLight=useRef<THREE.PointLight>(null),lanternLight=useRef<THREE.PointLight>(null);
 const uniforms=useMemo(()=>({time:{value:0}}),[]);
 const bulbPosition=useMemo(()=>new THREE.Vector3(),[]);
 const lantern=useMemo(()=>scene.getObjectByName('ks_lamp_bulb') as THREE.Mesh|undefined,[scene]);
 const elapsed=useRef(0);const originalLamp=!environment.furniture?.['snowy-mountain']?.lamp;
 useEffect(()=>{if(!lantern)return;const visible=lantern.visible;lantern.visible=originalLamp;return()=>{lantern.visible=visible;};},[lantern,originalLamp]);
 useEffect(()=>{
  const old:{m:THREE.MeshStandardMaterial;c:THREE.Color}[]=[];
  scene.traverse(o=>{if(!(o instanceof THREE.Mesh)||!/^Cabin_(Mountain|Snow_|Pines)/.test(o.name))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){old.push({m,c:m.color.clone()});m.color.multiplyScalar(phase==='night'?.48:phase==='dusk'?.73:1);}});
  return()=>old.forEach(({m,c})=>m.color.copy(c));
 },[scene,phase]);
 useFrame((_,dt)=>{
  if(!reduced&&!document.hidden)elapsed.current+=Math.min(dt,.05);
  const t=elapsed.current,flicker=reduced?1:1+.075*Math.sin(t*7.1)+.04*Math.sin(t*13.7);
  if(fire.current)fire.current.uniforms.time.value=t;
  if(hearthLight.current)hearthLight.current.intensity=(phase==='day'?.85:1.45)*flicker;
  if(lanternLight.current){lanternLight.current.intensity=environment.lampOn&&originalLamp?.42*flicker:0;if(lantern)lanternLight.current.position.copy(lantern.getWorldPosition(bulbPosition));}
  if(lantern?.material instanceof THREE.MeshStandardMaterial&&originalLamp){lantern.material.emissive.set('#ffb54d');lantern.material.emissiveIntensity=environment.lampOn?2.3*flicker:.02;}
 });
 return <group name="Cabin_Warmth">
  <mesh name="Cabin_Flames" position={[-.91,.535,1.687]} rotation={[0,Math.PI,0]}><planeGeometry args={[.50,.64]}/><shaderMaterial ref={fire} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide}/></mesh>
  <pointLight name="Cabin_Hearth_Light" ref={hearthLight} position={[-.91,.58,1.61]} color="#ff9f45" intensity={1.2} distance={3.6} decay={2}/>
  <pointLight name="Cabin_Lantern_Light" ref={lanternLight} position={[-.9,.95,-1.87]} color="#ffd18a" intensity={.42} distance={1.7}/>
 </group>;
}

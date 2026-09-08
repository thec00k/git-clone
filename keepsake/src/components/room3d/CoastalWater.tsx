import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Phase} from '../room/RoomFurniture';
import {useReducedMotion} from '../../hooks/useReducedMotion';

const vertex=`varying vec3 world; void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`;
/** Colors and wave detail are procedural: no external textures or video loops. */
export function CoastalSky({phase,storm}:{phase:Phase;storm:boolean}){
 const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{low:{value:new THREE.Color()},middle:{value:new THREE.Color()},high:{value:new THREE.Color()}},vertexShader:vertex,fragmentShader:`uniform vec3 low,middle,high;varying vec3 world;void main(){float h=clamp((world.y-2.2)/6.,0.,1.);vec3 c=mix(low,middle,smoothstep(0.,.5,h));c=mix(c,high,smoothstep(.45,1.,h));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>
}`.replace('#include','\n#include'),depthWrite:false}),[]);
 useEffect(()=>()=>material.dispose(),[material]);
 const colors=phase==='dusk'?['#f3aa77','#9b76a5','#355783']:phase==='night'?['#293c59','#192c49','#0d1b32']:['#d2e4df','#93c3d2','#608da9'];
 [material.uniforms.low,material.uniforms.middle,material.uniforms.high].forEach((u,i)=>u.value.set(colors[i]).lerp(new THREE.Color('#82949d'),storm?.4:0));
 return <mesh position={[0,6,-30]} material={material}><planeGeometry args={[65,25]}/></mesh>;
}

export function CoastalWater({phase,storm}:{phase:Phase;storm:boolean}){
 const reduced=useReducedMotion();
 const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{time:{value:0},deep:{value:new THREE.Color()},shallow:{value:new THREE.Color()},foam:{value:new THREE.Color()},glint:{value:new THREE.Color()},night:{value:0},swell:{value:1}},vertexShader:`uniform float time,swell;varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);p.y+=(sin(p.x*1.7+p.z*.85+time*.8)*.012+sin(p.z*2.7-time*1.3)*.008)*swell;world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`
 uniform float time,night,swell;uniform vec3 deep,shallow,foam,glint;varying vec3 world;
 void main(){
  float offshore=clamp((-world.z-4.7)/18.,0.,1.);
  float ripple=sin(world.x*5.+world.z*12.+sin(world.x*2.-time)*.7+time*1.5)*sin(world.z*4.-time*.6);
  vec3 color=mix(shallow,deep,smoothstep(0.,.85,offshore));
  color*=.91+ripple*.065;
  float shore=-4.68+sin(world.x*.9)*.11+sin(time*.55)*.18;
  float distanceToShore=abs(world.z-shore);
  float edge=1.-smoothstep(.02,.14,distanceToShore+sin(world.x*21.+time)*.035);
  float wave=pow(max(0.,sin(world.z*3.6+time*.8+sin(world.x*.7)*.3)),24.);
  float lace=(.45+.55*sin(world.x*15.+sin(world.z*12.)));
  color=mix(color,foam,clamp(edge*.8+wave*.13*lace*swell,0.,.9));
  float reflection=exp(-pow((world.x+.7+sin(world.z*7.+time)*.16)/(1.+offshore*2.),2.));
  float sparkle=pow(max(0.,ripple),12.)*reflection;
  color=mix(color,glint,sparkle*(.2+night*.5));
  gl_FragColor=vec4(color,1.);
  #include <colorspace_fragment>
 }`}),[]);
 const sand=useMemo(()=>{
  const geometry=new THREE.PlaneGeometry(35,5,64,24);geometry.rotateX(-Math.PI/2);geometry.translate(0,0,-4.7);
  const pos=geometry.attributes.position;const colors=[];
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,.84+(z+2.2)*.075+Math.sin(x*.9)*.009);const wet=THREE.MathUtils.smoothstep(-z,3.8,4.9);const color=new THREE.Color('#d9c6a6').lerp(new THREE.Color('#8e9583'),wet);color.multiplyScalar(1+Math.sin(x*82+z*65)*.025);colors.push(color.r,color.g,color.b);}
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
 },[]);
 useEffect(()=>()=>{material.dispose();sand.dispose();},[material,sand]);
 const u=material.uniforms;
 u.deep.value.set(phase==='night'?'#203a50':phase==='dusk'?'#4e6c87':'#356b85');
 u.shallow.value.set(phase==='night'?'#385c67':phase==='dusk'?'#809fa5':'#7fbcb8');
 u.foam.value.set(phase==='night'?'#85969e':'#e1e8db');u.glint.value.set(phase==='dusk'?'#ffcf92':'#dae9ee');u.night.value=phase==='day'?0:1;u.swell.value=storm?1.5:1;
 useFrame(({clock})=>{if(!reduced)u.time.value=clock.elapsedTime;});
 return <group><mesh geometry={sand} receiveShadow><meshStandardMaterial vertexColors roughness={.76} color={phase==='night'?'#8295a6':'#ffffff'}/></mesh><mesh position={[0,.65,-20]} rotation={[-Math.PI/2,0,0]} material={material}><planeGeometry args={[65,31,96,128]}/></mesh></group>;
}

export function CoastalHorizon({phase}:{phase:Phase}){
 const reduced=useReducedMotion();
 const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{time:{value:0},color:{value:new THREE.Color()}},vertexShader:vertex,fragmentShader:`uniform float time;uniform vec3 color;varying vec3 world;void main(){float ripple=sin(world.y*140.+sin(world.x*8.+time*.2)*2.+time*.6);float haze=smoothstep(.8,2.2,world.y);gl_FragColor=vec4(color*(.96+ripple*.027)+vec3(.035)*haze,1.);
 #include <colorspace_fragment>
 }`}),[]);
 material.uniforms.color.value.set(phase==='night'?'#203a50':phase==='dusk'?'#4e6c87':'#356b85');
 useFrame(({clock})=>{if(!reduced)material.uniforms.time.value=clock.elapsedTime;});
 useEffect(()=>()=>material.dispose(),[material]);
 return <mesh position={[0,-.2,-29]} material={material}><planeGeometry args={[65,4.8]}/></mesh>;
}

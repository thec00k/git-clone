import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useApp} from '../../store/appStore';
import {CRT_LIGHT_COLORS} from '../../lib/roomMusic';
import {useReducedMotion} from '../../hooks/useReducedMotion';
export function NeonAtmosphere({scene}:{scene:THREE.Object3D}) {
 const {environment,state}=useApp();const reduced=useReducedMotion();

 const mirrorMode=environment.cloudPalette??'multicolor';
 const mirrorColor=CRT_LIGHT_COLORS[environment.crtColor??'blue'];
 useEffect(()=>{
  const surface=scene.getObjectByName('Neon_Infinity_Surface') as THREE.Mesh|undefined;
  if(!surface)return;
  const original=surface.material;
  scene.traverse(o=>{if(o.name.startsWith('Neon_Infinity_Preview_'))o.visible=false;});
  const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{tint:{value:new THREE.Color(mirrorColor)},mode:{value:mirrorMode==='off'?0:mirrorMode==='crt'?1:2}},vertexShader:`varying vec3 world;
   void main(){world=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0);}`,
   fragmentShader:`varying vec3 world;uniform vec3 tint;uniform float mode;
   void main(){
    vec3 ray=normalize(world-cameraPosition);vec3 color=vec3(.003,.004,.009);
    if(mode>0.5){
     for(int i=0;i<28;i++){
      float depth=float(i)*.23;
      vec2 p=world.xz+ray.xz*depth/max(ray.y,.12);
      vec2 edge=vec2(1.87,1.47)-abs(p);
      if(min(edge.x,edge.y)<-.02)break;
      float d=abs(min(edge.x,edge.y));
      float line=exp(-d*d/0.000045)+.16*exp(-d*35.);
      vec3 c=mode<1.5?tint:mix(vec3(1.,.055,.20),vec3(.56,.06,1.),clamp((p.y+1.47)/2.94,0.,1.));
      color+=c*line*pow(.87,float(i))*1.3;
     }
    }
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  surface.material=material;
  return()=>{surface.material=original;material.dispose();};
 },[scene,mirrorMode,mirrorColor]);
 useEffect(()=>{
  const halos:THREE.Mesh[]=[];
  const originals:{mesh:THREE.Mesh;material:THREE.Material|THREE.Material[]}[]=[];
  const hologramMaterials:THREE.Material[]=[];
  scene.traverse(o=>{
   if(!(o instanceof THREE.Mesh))return;
   const materials=Array.isArray(o.material)?o.material:[o.material];
   for(const m of materials){
    if(m instanceof THREE.MeshStandardMaterial&&m.name.startsWith('Neon ')){
     if(m.emissiveIntensity>1)m.emissiveIntensity=.8;
     if(m.transparent){m.depthWrite=false;o.castShadow=false;}
    }
   }
   if(!o.name.startsWith('Neon_Holo_'))return;
   const darkDetail=o.name.endsWith('Neon_Graphite');
   if(darkDetail)return;
   const detail=!o.name.endsWith('Neon_Hologram');
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{detail:{value:detail?1:0}},
    vertexShader:`varying vec3 viewPosition;varying vec3 viewNormal;varying float height;
     void main(){vec4 p=modelViewMatrix*vec4(position,1.);viewPosition=-p.xyz;viewNormal=normalize(normalMatrix*normal);height=(modelMatrix*vec4(position,1.)).y;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 viewPosition;varying vec3 viewNormal;varying float height;uniform float detail;
     void main(){float rim=pow(1.-abs(dot(normalize(viewNormal),normalize(viewPosition))),2.2);
      float scan=.5+.5*sin(height*2100.);vec3 tint=mix(vec3(.07,.72,1.),vec3(.44,.18,.92),.5+.5*sin(height*24.));
      vec3 color=tint*(.34+rim*.9+scan*.13+detail*.5);gl_FragColor=vec4(color,.42+rim*.38+detail*.18);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
     }`});
   originals.push({mesh:o,material:o.material});o.material=material;hologramMaterials.push(material);o.castShadow=false;o.receiveShadow=false;
   if(!detail){
    const haloMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
     vertexShader:`varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position+normal*.0018,1.);vP=-p.xyz;gl_Position=projectionMatrix*p;}`,
     fragmentShader:`varying vec3 vN;varying vec3 vP;void main(){float glow=pow(1.-abs(dot(normalize(vN),normalize(vP))),2.);gl_FragColor=vec4(.15,.65,1.,glow*.16);}`});
    const halo=new THREE.Mesh(o.geometry,haloMaterial);halo.name='Hologram_soft_halo';halo.userData.host=o;halos.push(halo);
   }
  });
  halos.forEach(w=>w.userData.host.add(w));
  return()=>{halos.forEach(w=>{w.removeFromParent();(w.material as THREE.Material).dispose();});originals.forEach(({mesh,material})=>{mesh.material=material;});hologramMaterials.forEach(m=>m.dispose());};
 },[scene]);
 const parts=useMemo(()=>{const lava:THREE.Object3D[]=[],jellies:THREE.Object3D[]=[];scene.traverse(o=>{if(/^Neon_Lava_/.test(o.name))lava.push(o);if(/^Neon_Jelly_\d$/.test(o.name))jellies.push(o);});return {lava:lava.map(o=>({o,y:o.position.y,sy:o.scale.y})),jellies};},[scene]);
 useEffect(()=>{for(const kind of ['cat','car','flower']){const o=scene.getObjectByName('Neon_Hologram_'+kind);if(o)o.visible=state.roomDecor?.sillItem==='holo-'+kind&&state.roomDecor.owned.includes('holo-'+kind);}},[scene,state.roomDecor]);
 useFrame(({clock})=>{const t=reduced?0:clock.elapsedTime;parts.lava.forEach(({o,y,sy},i)=>{o.position.y=y+Math.sin(t*.35+i*1.8)*.014;o.scale.y=sy*(1+Math.sin(t*.5+i)*.08);if(o instanceof THREE.Mesh){const m=o.material;if(m instanceof THREE.MeshStandardMaterial)m.emissiveIntensity=environment.lampOn?2:0;}});parts.jellies.forEach((o,i)=>{o.position.y=Math.sin(t*.65+i*2)*.012;o.rotation.y=Math.sin(t*.24+i)*.012;});});
 return <><pointLight position={[-.45,1.23,-2.02]} color="#6dcfff" intensity={state.roomDecor?.sillItem?.startsWith('holo-')&&state.roomDecor.owned.includes(state.roomDecor.sillItem)?.055:0} distance={.48} decay={2}/><pointLight position={[-1.6,2.68,1.5]} color={mirrorMode==='crt'?mirrorColor:'#d951f3'} intensity={mirrorMode==='off'?0:.75} distance={3}/><pointLight position={[1.3,2.72,-.6]} color={mirrorMode==='crt'?mirrorColor:'#51c9ff'} intensity={mirrorMode==='off'?0:.65} distance={3}/><pointLight position={[-.965,1.02,-1.96]} color="#e94ab7" intensity={environment.lampOn?.7:0} distance={1.3}/><pointLight position={[1.07,1.10,-1.8]} color="#26d8ff" intensity={.5} distance={1.2}/><pointLight position={[-1,2.35,0]} color="#25c9ff" intensity={1.2} distance={5}/><pointLight position={[1.8,2.35,0]} color="#dd37a2" intensity={1.1} distance={5}/></>;
}

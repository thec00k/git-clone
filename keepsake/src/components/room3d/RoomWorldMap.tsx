import {useEffect,useMemo,useRef,useState} from "react";
import {useFrame} from "@react-three/fiber";
import * as THREE from "three";
import {useApp} from '../../store/appStore';
import {CRT_LIGHT_COLORS} from '../../lib/roomMusic';
import {useReducedMotion} from '../../hooks/useReducedMotion';

function hologramTexture(onLoad:(texture:THREE.Texture)=>void) {
 const image=new Image();let disposed=false;let texture:THREE.CanvasTexture|undefined;
 image.onload=()=>{
  if(disposed)return;
  const canvas=document.createElement('canvas');canvas.width=950;canvas.height=620;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);
  for(let i=0;i<pixels.data.length;i+=4){const light=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.max(0,Math.min(238,(light-28)*1.35));}
  context.putImageData(pixels,0,0);texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;onLoad(texture);
 };
 image.src='/maps/world-neon.svg';
 return()=>{disposed=true;texture?.dispose();};
}

export function RoomWorldMap({scene,onOpen}:{scene:THREE.Object3D;onOpen:()=>void}) {
 const {environment}=useApp();const neon=environment.roomTheme==='cyberpunk';const reduced=useReducedMotion();
 const [loaded,setLoaded]=useState<{texture:THREE.Texture;neon:boolean}|null>(null);const material=useRef<THREE.MeshBasicMaterial>(null),scan=useRef<THREE.Mesh>(null),glow=useRef<THREE.MeshBasicMaterial>(null);
 useEffect(()=>{
  if(neon)return hologramTexture(texture=>setLoaded({texture,neon:true}));
  let live=true;const map=new THREE.TextureLoader().load('/maps/world-room.svg',()=>{if(live)setLoaded({texture:map,neon:false});});map.colorSpace=THREE.SRGBColorSpace;
  return()=>{live=false;map.dispose();};
 },[neon]);
 const surface=useMemo(()=>{
  const sheet=scene.getObjectByName("Map_Sheet");if(!sheet)return null;
  const b=new THREE.Box3().setFromObject(sheet),width=(b.max.z-b.min.z)*.96;
  return {position:[b.max.x+.018,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2] as [number,number,number],width,height:Math.min((b.max.y-b.min.y)*.96,width*620/950)};
 },[scene]);
 useEffect(()=>{
  if(!neon)return;
  const hidden=['Map_Cork','Map_Frame','Map_Pin_0','Map_Pin_1','Map_Pin_2','Map_Pin_3','Map_Sheet'].flatMap(name=>{const object=scene.getObjectByName(name);return object?[{object,visible:object.visible}]:[];});
  hidden.forEach(({object})=>{object.visible=false;});return()=>hidden.forEach(({object,visible})=>{object.visible=visible;});
 },[scene,neon]);
 useFrame(({clock})=>{
  if(!neon||!surface)return;const time=clock.getElapsedTime();
  if(material.current)material.current.opacity=reduced ? .72 : .68+Math.sin(time*3.1)*.045+(Math.sin(time*17.3)>.97?-.16:0);
  if(glow.current)glow.current.opacity=reduced ? .09 : .075+Math.sin(time*1.8)*.02;
  if(scan.current)scan.current.position.y=reduced ? 0 : ((time*.19)%(surface.height-.024))-(surface.height-.024)/2;
 });
 if(!surface||!loaded||loaded.neon!==neon)return null;const texture=loaded.texture;
 const color=CRT_LIGHT_COLORS[environment.crtColor??'blue'];
 if(!neon)return <mesh name="World_Map_Print" position={surface.position} rotation={[0,Math.PI/2,0]} onClick={e=>{e.stopPropagation();if(e.delta<4)onOpen();}}><planeGeometry args={[surface.width,surface.height]}/><meshStandardMaterial map={texture} color="#f6edd7" roughness={1} polygonOffset polygonOffsetFactor={-1}/></mesh>;
 const frame=.025,depth=.026;
 return <group name="Hologram_World_Map" position={surface.position} rotation={[0,Math.PI/2,0]} onClick={e=>{e.stopPropagation();if(e.delta<4)onOpen();}}>
  <mesh name="World_Map_Halo" position={[0,0,-.008]}><planeGeometry args={[surface.width*1.03,surface.height*1.05]}/><meshBasicMaterial ref={glow} color={color} transparent opacity={.08} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
  <mesh name="World_Map_Print" position={[0,0,.006]}><planeGeometry args={[surface.width,surface.height]}/><meshBasicMaterial ref={material} map={texture} color={color} transparent opacity={.7} alphaTest={.025} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  <mesh ref={scan} name="World_Map_Scanline" position={[0,0,.012]}><planeGeometry args={[surface.width*.96,.012]}/><meshBasicMaterial color={color} transparent opacity={.72} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  {([[-surface.width/2-frame/2,0,frame,surface.height+frame*2],[surface.width/2+frame/2,0,frame,surface.height+frame*2],[0,surface.height/2+frame/2,surface.width,frame],[0,-surface.height/2-frame/2,surface.width,frame]] as const).map(([x,y,w,h],index)=><mesh key={index} position={[x,y,-depth/2]}><boxGeometry args={[w,h,depth]}/><meshStandardMaterial color="#111525" metalness={.82} roughness={.3} emissive={color} emissiveIntensity={.07}/></mesh>)}
  <mesh position={[0,-surface.height/2-frame*.65,.018]}><boxGeometry args={[surface.width*.72,.012,.018]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.3} toneMapped={false}/></mesh>
  <pointLight color={color} intensity={.32} distance={1.25} position={[0,0,.18]}/>
 </group>;
}

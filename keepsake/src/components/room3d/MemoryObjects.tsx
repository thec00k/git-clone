import { useCrtPlayerSlot } from '../../store/spotifyUi';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Scrapbook } from '../../types/scrapbook';
import * as THREE from 'three';
import { useApp } from '../../store/appStore';
import { useNav } from '../../store/nav';
import { COVER_STYLES } from '../../types/scrapbook';
import { canSee } from '../../lib/permissions';

/** Text stays in the 3D scene, so labels share the room's light and perspective. */
export function useLettering(text: string, background = '#ede3ca', ink = '#403c2d', vertical = false, handwritten = false) {
 const texture = useMemo(() => {
  const canvas = document.createElement('canvas'); canvas.width = vertical ? 128 : 1024; canvas.height = vertical ? 1024 : 512;
  const c = canvas.getContext('2d')!;
  c.fillStyle = background; c.fillRect(0,0,canvas.width,canvas.height);
  c.fillStyle=ink;c.globalAlpha=.06;for(let i=0;i<1800;i++)c.fillRect((i*73)%canvas.width,(i*139)%canvas.height,1,2);c.globalAlpha=1;
  c.strokeStyle = ink; c.globalAlpha = .35; c.strokeRect(10,10,canvas.width-20,canvas.height-20); c.globalAlpha=1;
  c.translate(canvas.width/2,canvas.height/2); if(vertical)c.rotate(-Math.PI/2);
  c.fillStyle=ink; c.textAlign='center'; c.textBaseline='middle';
  c.font=handwritten?'48px "Segoe Script", cursive':vertical?'52px Georgia':'56px Georgia';
  const lines=text.split('\n'); lines.forEach((line,i)=>c.fillText(line,0,(i-(lines.length-1)/2)*78,vertical?850:900));
  const map=new THREE.CanvasTexture(canvas); map.colorSpace=THREE.SRGBColorSpace; map.anisotropy=4; return map;
 },[text,background,ink,vertical,handwritten]);
 useEffect(()=>()=>texture.dispose(),[texture]); return texture;
}
export function PhotoSurface({src,width,height}:{src:string;width:number;height:number}) {
 const [texture,setTexture]=useState<THREE.Texture|null>(null);
 useEffect(()=>{let live=true;setTexture(null);const map=new THREE.TextureLoader().load(src,()=>{if(live)setTexture(map);});map.colorSpace=THREE.SRGBColorSpace;return()=>{live=false;map.dispose();};},[src]);
 return <mesh><planeGeometry args={[width,height]}/><meshStandardMaterial map={texture} color="#fff6e6" roughness={.85}/></mesh>;
}
function Spine({title,color,ink,width,height,handwritten=false}:{title:string;color:string;ink:string;width:number;height:number;handwritten?:boolean}) {
 const map=useLettering(title,color,ink,true,handwritten);
 return <mesh><planeGeometry args={[width,height]}/><meshStandardMaterial map={map} roughness={.92}/></mesh>;
}
export function MemoryObjects({scene,onBook}:{scene:THREE.Object3D;onBook:()=>void}) {
 const {state,setActiveBook}=useApp(); const {viewAs,isVisitor}=useNav();
 const books=state.books.filter(b=>canSee(b.visibility,viewAs));
 const fillers=useMemo(()=>Array.from({length:45},(_,i)=>scene.getObjectByName(`ks_shelf_book_${i}`)).filter((o):o is THREE.Object3D=>!!o),[scene]);
 const [chosen,setChosen]=useState<string|null>(null);
 useEffect(()=>{fillers.forEach(object=>{const b=new THREE.Box3().setFromObject(object);const row=Math.max(0,Math.min(3,3-Math.round(b.min.y/.46)));object.visible=row>=Math.ceil(books.length/12);});return()=>fillers.forEach(object=>{object.visible=true;});},[fillers,books.length]);
 useEffect(()=>{const palette=['#76694c','#684838','#64735c','#a1875b','#514b3a','#8b6958'];fillers.forEach((object,i)=>object.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){m.color.set(palette[i%palette.length]);m.roughness=.94;}});}}));},[fillers]);
 const sheet=scene.getObjectByName('Map_Sheet'); const mapBox=sheet?new THREE.Box3().setFromObject(sheet):null;
 return <group name="personal-memories">
  <MemoryDisplays scene={scene}/>
  <CollectedSpines objects={fillers} occupiedRows={Math.ceil(books.length/12)}/>
  {books.slice(0,48).map((book,i)=><ShelfMemory key={book.id} book={book} index={i} chosen={chosen} onChoose={()=>setChosen(book.id)} onOpen={()=>{setActiveBook(book.id);onBook();}}/>)}
  {!isVisitor && mapBox && state.pins.map(pin=>{const width=(mapBox.max.z-mapBox.min.z)*.96;const height=Math.min((mapBox.max.y-mapBox.min.y)*.96,width*620/950);return <group key={pin.id} position={[mapBox.max.x+.012,(mapBox.min.y+mapBox.max.y)/2+(50-pin.y)/100*height,(mapBox.min.z+mapBox.max.z)/2+(50-pin.x)/100*width]} rotation={[0,Math.PI/2,0]}>
   {pin.photoSrc && <group position={[0,-.033,0]}><mesh><planeGeometry args={[.11,.105]}/><meshStandardMaterial color="#f1e8d2"/></mesh><group position={[0,.007,.001]}><PhotoSurface src={pin.photoSrc} width={.094} height={.07}/></group></group>}
   <mesh position={[0,.007,.005]}><sphereGeometry args={[.009,8,6]}/><meshStandardMaterial color="#a55339" roughness={.5}/></mesh>
  </group>;})}
 </group>;
}

function MemoryDisplays({scene}:{scene:THREE.Object3D}) {
 const {state,activeBook,environment}=useApp(); const {isVisitor}=useNav();
 const {nowPlaying}=useCrtPlayerSlot();
 const photo=isVisitor?undefined:(state.archive.find(a=>a.favorite)??state.archive[0]);
 const screen=useLettering(environment.musicProvider==='spotify'?(nowPlaying?`${nowPlaying.paused?'PAUSED':'NOW PLAYING'}\n${nowPlaying.title}\n${nowPlaying.artist}`:'KEEPSAKE RADIO\nSpotify · player below'):environment.musicOn?'KEEPSAKE RADIO\nWoodland ambient · playing':'KEEPSAKE RADIO\nA quiet moment', '#1a302c','#b9cba7');
 screen.flipY=false;
 const note=useLettering('a little something\nto remember','#e9dfc4','#6b6250',false,true);
 useEffect(()=>{
  const object=scene.getObjectByName('CRT_Screen');if(!(object instanceof THREE.Mesh))return;
  const old=object.material;const material=new THREE.MeshStandardMaterial({map:screen,emissiveMap:screen,emissive:'#ffffff',emissiveIntensity:.28,roughness:.75});object.material=material;
  return()=>{object.material=old;material.dispose();};
 },[scene,screen,activeBook?.playlistUri]);
 useEffect(()=>{
  const object=scene.getObjectByName('ks_archive_frame_mat');if(!(object instanceof THREE.Mesh)||!photo)return;
  let live=true;const old=object.material;const material=new THREE.MeshStandardMaterial({roughness:.85});
  const texture=new THREE.TextureLoader().load(photo.src,()=>{if(live){texture.flipY=false;material.map=texture;material.needsUpdate=true;object.material=material;}});texture.colorSpace=THREE.SRGBColorSpace;
  return()=>{live=false;object.material=old;texture.dispose();material.dispose();};
 },[scene,photo]);
 return <group position={[-.71,.752,-1.59]} rotation={[-Math.PI/2,0,-.15]}><mesh><planeGeometry args={[.12,.075]}/><meshStandardMaterial map={note} roughness={1}/></mesh></group>;
}

function ShelfMemory({book,index,chosen,onChoose,onOpen}:{book:Scrapbook;index:number;chosen:string|null;onChoose:()=>void;onOpen:()=>void}){
 const group=useRef<THREE.Group>(null);const [hover,setHover]=useState(false);const reduced=useReducedMotion();const selected=chosen===book.id;
 const openRef=useRef(onOpen);openRef.current=onOpen;
 useEffect(()=>{if(!selected)return;const timer=window.setTimeout(()=>openRef.current(),reduced?0:780);return()=>window.clearTimeout(timer);},[selected,reduced]);
 const coverMap=useLettering(book.title+'\n'+book.subtitle,COVER_STYLES[book.coverStyle].leather,COVER_STYLES[book.coverStyle].ink);
 const row=Math.floor(index/12);const z=-.65+(index%12)*.108;const y=1.39-row*.46;const height=.32+(index%3)*.025;const thick=.066+Math.min(book.pages.length,32)*.0005;const cover=COVER_STYLES[book.coverStyle];
 useFrame((_,dt)=>{if(!group.current)return;const t=reduced?1:1-Math.exp(-dt*9);group.current.position.x=THREE.MathUtils.lerp(group.current.position.x,selected?1.57:2.20,t);group.current.position.y=THREE.MathUtils.lerp(group.current.position.y,selected?y+.11:y,t);group.current.rotation.z=THREE.MathUtils.lerp(group.current.rotation.z,selected?.28:hover?.16:0,t);});
 return <group ref={group} position={[2.20,y,z]} onPointerOver={e=>{e.stopPropagation();if(!chosen)setHover(true);}} onPointerOut={()=>setHover(false)} onClick={e=>{e.stopPropagation();if(e.delta<4&&!chosen)onChoose();}}>
  <mesh position={[0,height/2,0]}><boxGeometry args={[.22,height,thick]}/><meshStandardMaterial color={cover.leather} roughness={.92}/></mesh>
  <mesh position={[0,height/2,thick/2+.0008]}><planeGeometry args={[.216,height*.98]}/><meshStandardMaterial map={coverMap} roughness={.92}/></mesh>
  <mesh position={[.006,height+.0005,0]}><boxGeometry args={[.20,.002,thick*.78]}/><meshStandardMaterial color="#d9ccb3" roughness={1}/></mesh>
  <group position={[-.112,height/2,0]} rotation={[0,-Math.PI/2,0]}><Spine title={book.title} color={cover.leather} ink={cover.ink} width={thick*.96} height={height*.98}/></group>
  {[.035,height-.035].map(v=><mesh key={v} position={[-.113,v,0]}><boxGeometry args={[.002,.003,thick*.88]}/><meshStandardMaterial color={cover.ink} roughness={.65}/></mesh>)}
  <Html transform distanceFactor={1} position={[-.115,height/2,0]} rotation={[0,-Math.PI/2,0]} style={{backfaceVisibility:'hidden'}}>
   <button className="ks-spine-hit" style={{width:thick*400,height:height*400}} aria-label={`Open scrapbook: ${book.title}`} disabled={!!chosen} onPointerEnter={()=>setHover(true)} onPointerLeave={()=>setHover(false)} onFocus={()=>setHover(true)} onBlur={()=>setHover(false)} onClick={e=>{e.stopPropagation();if(!chosen)onChoose();}}/>
  </Html>
  {hover&&!selected&&<Html position={[-.17,height+.07,0]} center style={{pointerEvents:'none'}}><span className="ks-shelf-book-label">{book.title}</span></Html>}
 </group>;
}

function CollectedSpines({objects,occupiedRows}:{objects:THREE.Object3D[];occupiedRows:number}){
 return <>{objects.filter((_,i)=>i%3===1).map((o,i)=>{const b=new THREE.Box3().setFromObject(o);const row=Math.max(0,Math.min(3,3-Math.round(b.min.y/.46)));if(row<occupiedRows)return null;const size=b.getSize(new THREE.Vector3());return <group key={o.uuid} position={[b.min.x-.001,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2]} rotation={[0,-Math.PI/2,0]}><Spine handwritten title={['Field notes','Letters','Woodland','Sketches'][i%4]} color={['#76694c','#64735c','#514b3a'][i%3]} ink="#ded0ac" width={size.z*.82} height={size.y*.85}/></group>;})}</>;
}

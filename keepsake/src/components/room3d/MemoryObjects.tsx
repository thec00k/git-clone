import {useWorkbench} from '../../store/workbench';
import {newCardBinder} from '../../lib/cardBinders';
import {RoomPoster} from './RoomPoster';
import {BOOKSHELF_WINDOW_SHIFT} from './furnitureLayout';
import {SillDecoration} from './SillDecoration';
import {CRT_COLORS} from '../../lib/roomMusic';
import { useCrtPlayerSlot } from '../../store/spotifyUi';
import {DiscoveryObject} from './DiscoveryObject';
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
export function useLettering(text: string, background = '#ede3ca', ink = '#403c2d', vertical = false, handwritten = false, portrait=false) {
 const texture = useMemo(() => {
  const canvas = document.createElement('canvas'); canvas.width = vertical ? 128 : portrait?768:1024; canvas.height = vertical||portrait ? 1024 : 512;
  const c = canvas.getContext('2d')!;
  c.fillStyle = background; c.fillRect(0,0,canvas.width,canvas.height);
  c.fillStyle=ink;c.globalAlpha=.06;for(let i=0;i<1800;i++)c.fillRect((i*73)%canvas.width,(i*139)%canvas.height,1,2);c.globalAlpha=1;
  c.strokeStyle = ink; c.globalAlpha = .35; c.strokeRect(10,10,canvas.width-20,canvas.height-20); c.globalAlpha=1;
  c.translate(canvas.width/2,canvas.height/2); if(vertical)c.rotate(-Math.PI/2);
  c.fillStyle=ink; c.textAlign='center'; c.textBaseline='middle';
  c.font=handwritten?'48px "Segoe Script", cursive':vertical?'52px Georgia':'56px Georgia';
  const lines=text.split('\n').flatMap(line=>{
    if(!portrait)return [line];
    const wrapped:string[]=[];let row='';
    for(const word of line.split(' ')){if(row&&c.measureText(row+' '+word).width>650){wrapped.push(row);row=word;}else row+=(row?' ':'')+word;}
    wrapped.push(row);return wrapped;
  });lines.forEach((line,i)=>c.fillText(line,0,(i-(lines.length-1)/2)*78,vertical?850:portrait?650:900));
  const map=new THREE.CanvasTexture(canvas); map.colorSpace=THREE.SRGBColorSpace; map.anisotropy=4; return map;
 },[text,background,ink,vertical,handwritten,portrait]);
 useEffect(()=>()=>texture.dispose(),[texture]); return texture;
}
export function PhotoSurface({src,width,height}:{src:string;width:number;height:number}) {
 const [texture,setTexture]=useState<THREE.Texture|null>(null);
 useEffect(()=>{let live=true;setTexture(null);const map=new THREE.TextureLoader().load(src,()=>{if(live)setTexture(map);});map.colorSpace=THREE.SRGBColorSpace;return()=>{live=false;map.dispose();};},[src]);
 return <mesh><planeGeometry args={[width,height]}/><meshStandardMaterial map={texture} color="#fff6e6" roughness={.85}/></mesh>;
}
function Spine({title,color,ink,width,height,handwritten=false,highlight=false}:{title:string;color:string;ink:string;width:number;height:number;handwritten?:boolean;highlight?:boolean}) {
 const map=useLettering(title,color,ink,true,handwritten);
 return <mesh><planeGeometry args={[width,height]}/><meshStandardMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={highlight?.55:0} roughness={.92}/></mesh>;
}
export function MemoryObjects({scene,onBook}:{scene:THREE.Object3D;onBook:()=>void}) {
 const {state,setActiveBook,addBook,update}=useApp(); const {viewAs,isVisitor,go,setBookPageId}=useNav();
 const {openBinder,setBinderId,binderId}=useWorkbench();
 const binders=(isVisitor?[]:state.cardBinders??[]).filter(b=>b.id!==binderId);
 const books=[...binders.map(b=>({id:b.id,title:b.title,subtitle:'Card binder',coverStyle:'forest',pages:[],visibility:'private',createdAt:0,updatedAt:0} as Scrapbook)),...state.books.filter(b=>canSee(b.visibility,viewAs,state.profile.allowFriendScrapbooks===true)&&(isVisitor||b.id!==state.activeBookId))];
 const fillers=useMemo(()=>Array.from({length:45},(_,i)=>scene.getObjectByName(`ks_shelf_book_${i}`)).filter((o):o is THREE.Object3D=>!!o),[scene]);
 const [chosen,setChosen]=useState<string|null>(null);
 useEffect(()=>{fillers.forEach(object=>{const b=new THREE.Box3().setFromObject(object);const row=Math.max(0,Math.min(3,3-Math.round(b.min.y/.46)));object.visible=row>=Math.ceil((books.length+(isVisitor?0:1))/12);});return()=>fillers.forEach(object=>{object.visible=true;});},[fillers,books.length,isVisitor]);
 useEffect(()=>{const palette=['#76694c','#684838','#64735c','#a1875b','#514b3a','#8b6958'];fillers.forEach((object,i)=>object.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){m.color.set(palette[i%palette.length]);m.roughness=.94;}});}}));},[fillers]);
 const sheet=scene.getObjectByName('Map_Sheet'); const mapBox=sheet?new THREE.Box3().setFromObject(sheet):null;
 return <group name="personal-memories">
  <DiscoveryObject scene={scene}/><SillDecoration/><RoomPoster/>
  {!isVisitor&&<ShelfMemory book={{id:"blank-book",title:"Create a new book",subtitle:"A new beginning",coverStyle:"forest",pages:[],visibility:"private",createdAt:0,updatedAt:0} as Scrapbook} index={0} chosen={chosen} onChoose={()=>setChosen("blank-book")} onCancel={()=>setChosen(null)} onCreateBinder={binders.length<12?()=>{const b=newCardBinder();update(s=>({...s,cardBinders:[...(s.cardBinders??[]),b]}));setChosen(null);openBinder(b.id);}:undefined} onOpen={()=>{setChosen(null);setBinderId(null);addBook();setBookPageId(null);onBook();}}/>}
  <MemoryDisplays scene={scene}/>
  <DeskBook scene={scene}/>
  <CollectedSpines objects={fillers} occupiedRows={Math.ceil((books.length+(isVisitor?0:1))/12)}/>
  {books.slice(0,isVisitor?48:47).map((book,i)=><ShelfMemory key={book.id} book={book} color={binders.find(b=>b.id===book.id)?.color} index={i+(isVisitor?0:1)} chosen={chosen} onChoose={()=>setChosen(book.id)} onCancel={()=>setChosen(null)} onOpen={()=>{setChosen(null);if(binders.some(b=>b.id===book.id)){openBinder(book.id);return;}setBinderId(null);setActiveBook(book.id);onBook();}}/>)}
  {!isVisitor && mapBox && state.pins.map(pin=>{const width=(mapBox.max.z-mapBox.min.z)*.96;const height=Math.min((mapBox.max.y-mapBox.min.y)*.96,width*620/950);return <group key={pin.id} onClick={e=>{e.stopPropagation();if(e.delta>4)return;const b=state.books.find(b=>b.id===pin.bookId);if(b?.pages.some(p=>p.id===pin.pageId)){setBinderId(null);setActiveBook(b.id);setBookPageId(pin.pageId!);go('book');}else go('atlas');}} position={[mapBox.max.x+.012,(mapBox.min.y+mapBox.max.y)/2+(50-pin.y)/100*height,(mapBox.min.z+mapBox.max.z)/2+(50-pin.x)/100*width]} rotation={[0,Math.PI/2,0]}>
   {pin.photoSrc && <group position={[0,-.033,0]}><mesh><planeGeometry args={[.11,.105]}/><meshStandardMaterial color="#f1e8d2"/></mesh><group position={[0,.007,.001]}><PhotoSurface src={pin.photoSrc} width={.094} height={.07}/></group></group>}
   <mesh position={[0,.007,.005]}><sphereGeometry args={[.009,8,6]}/><meshStandardMaterial color="#a55339" roughness={.5}/></mesh>
  </group>;})}
 </group>;
}

function MemoryDisplays({scene}:{scene:THREE.Object3D}) {
 const {state,activeBook,environment}=useApp(); const {isVisitor}=useNav();
 const {nowPlaying}=useCrtPlayerSlot();
 const photo=isVisitor?undefined:(state.archive.find(a=>a.id===state.framePhotoId)??state.archive.find(a=>a.favorite)??state.archive[0]);
 const tint=CRT_COLORS[environment.crtColor??'green'];
 const screen=useLettering(environment.musicProvider!=='ambient'?(nowPlaying?`${nowPlaying.paused?'PAUSED':'NOW PLAYING'}\n${nowPlaying.title}\n${nowPlaying.artist}`:`KEEPSAKE RADIO\n${environment.musicProvider==='lofi'?'Mellow Skies':environment.musicProvider==='soundcloud'?'SoundCloud':'Spotify'} · player below`):environment.musicOn?'KEEPSAKE RADIO\nWoodland ambient · playing':'KEEPSAKE RADIO\nA quiet moment', tint.background,tint.ink);
 screen.flipY=false;
 const note=useLettering('a little something\nto remember','#e9dfc4','#6b6250',false,true);
 useEffect(()=>{
  const object=scene.getObjectByName('CRT_Screen');if(!(object instanceof THREE.Mesh))return;
  const old=object.material;const material=new THREE.MeshStandardMaterial({map:screen,emissiveMap:screen,emissive:'#ffffff',emissiveIntensity:.75,roughness:.6,toneMapped:false});object.material=material;
  return()=>{object.material=old;material.dispose();};
 },[scene,screen,activeBook?.playlistUri]);
 useEffect(()=>{
  const object=scene.getObjectByName('ks_archive_frame_mat');if(!(object instanceof THREE.Mesh)||!photo)return;
  let live=true;const old=object.material;const material=new THREE.MeshStandardMaterial({roughness:.85});
  const texture=new THREE.TextureLoader().load(photo.src,()=>{if(live){texture.flipY=false;material.map=texture;material.needsUpdate=true;object.material=material;}});texture.colorSpace=THREE.SRGBColorSpace;
  return()=>{live=false;object.material=old;texture.dispose();material.dispose();};
 },[scene,photo]);
 return <group position={[-.86,.752,-1.59]} rotation={[-Math.PI/2,0,-.15]}><mesh><planeGeometry args={[.12,.075]}/><meshStandardMaterial map={note} roughness={1}/></mesh></group>;
}

function ShelfMemory({book,index,chosen,onChoose,onOpen,onCancel,onCreateBinder,color}:{book:Scrapbook;index:number;chosen:string|null;onChoose:()=>void;onOpen:()=>void;onCancel:()=>void;onCreateBinder?:()=>void;color?:string}){
 const group=useRef<THREE.Group>(null);const [hover,setHover]=useState(false);const reduced=useReducedMotion();const selected=chosen===book.id;
 const previewButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(selected){const timer=window.setTimeout(()=>previewButton.current?.focus(),reduced?0:700);return()=>window.clearTimeout(timer);}},[selected,reduced]);
 const coverMap=useLettering(book.title+'\n'+book.subtitle,color??COVER_STYLES[book.coverStyle].leather,COVER_STYLES[book.coverStyle].ink,false,false,true);
 const row=Math.floor(index/12);const z=-.69+(index%12)*.1015;const y=1.39-row*.46;const height=.32+(index%3)*.025;const thick=.066+Math.min(book.pages.length,32)*.0005;const cover={...COVER_STYLES[book.coverStyle],leather:color??COVER_STYLES[book.coverStyle].leather};
 const outline=useMemo(()=>{const box=new THREE.BoxGeometry(.224,height+.004,thick+.004);const edges=new THREE.EdgesGeometry(box);box.dispose();return edges;},[height,thick]);
 useEffect(()=>()=>outline.dispose(),[outline]);
 useEffect(()=>{if(hover&&!chosen){document.body.style.cursor='pointer';return()=>{document.body.style.cursor='';};}},[hover,chosen]);
 useFrame((_,dt)=>{if(!group.current)return;const t=reduced?1:1-Math.exp(-Math.min(dt,.05)*7);group.current.position.x=THREE.MathUtils.lerp(group.current.position.x,selected?-.63:0,t);group.current.position.y=THREE.MathUtils.lerp(group.current.position.y,selected?.11:0,t);group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,selected?-Math.PI/2:0,t);group.current.rotation.z=THREE.MathUtils.lerp(group.current.rotation.z,selected?.05:hover?.16:0,t);});
 return <group position={[2.20,y,z+BOOKSHELF_WINDOW_SHIFT]} onPointerOver={e=>{e.stopPropagation();if(!chosen)setHover(true);}} onPointerOut={()=>setHover(false)} onClick={e=>{e.stopPropagation();if(e.delta<4&&!chosen)onChoose();}}>
  {!chosen&&<mesh name={`Shelf_spine_hit_${book.id}`} userData={{bookTitle:book.title}} position={[-.116,height/2,0]}>
   <boxGeometry args={[.018,height+.006,thick+.012]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>}
  <group ref={group}>
  <mesh name={`Shelf_book_hit_${book.id}`} position={[0,height/2,0]}><boxGeometry args={[.22,height,thick]}/><meshStandardMaterial color={cover.leather} emissive={cover.leather} emissiveIntensity={hover||selected?.65:0} roughness={.92}/></mesh>
  {(hover||selected)&&<lineSegments position={[0,height/2,0]} geometry={outline} raycast={()=>{}}><lineBasicMaterial color="#ffdc68" toneMapped={false}/></lineSegments>}
  <mesh position={[0,height/2,thick/2+.0008]}><planeGeometry args={[.216,height*.98]}/><meshStandardMaterial map={coverMap} emissiveMap={coverMap} emissive="#ffffff" emissiveIntensity={hover||selected?.4:0} roughness={.92}/></mesh>
  <mesh position={[.006,height+.0005,0]}><boxGeometry args={[.20,.002,thick*.78]}/><meshStandardMaterial color="#d9ccb3" roughness={1}/></mesh>
  <group position={[-.112,height/2,0]} rotation={[0,-Math.PI/2,0]}><Spine title={book.title} color={cover.leather} ink={cover.ink} width={thick*.96} height={height*.98} highlight={hover||selected}/></group>
  {[.035,height-.035].map(v=><mesh key={v} position={[-.113,v,0]}><boxGeometry args={[.002,.003,thick*.88]}/><meshStandardMaterial color={cover.ink} roughness={.65}/></mesh>)}
  <Html transform pointerEvents="none" distanceFactor={1} position={[-.115,height/2,0]} rotation={[0,-Math.PI/2,0]} style={{backfaceVisibility:'hidden',pointerEvents:'none'}}>
   <button className="ks-spine-hit" style={{width:thick*400,height:height*400,pointerEvents:'none'}} aria-label={book.id==='blank-book'?'Create a new book':`Open ${color?'card binder':'scrapbook'}: ${book.title}`} disabled={!!chosen} onFocus={()=>setHover(true)} onBlur={()=>setHover(false)} onClick={e=>{e.stopPropagation();if(!chosen)onChoose();}}/>
  </Html>
  {hover&&!selected&&<Html position={[-.17,height+.07,0]} center style={{pointerEvents:'none'}}><span className="ks-shelf-book-label">{book.title}</span></Html>}
  {selected&&<Html position={[0,-.11,0]} center><div className="ks-shelf-preview" role="group" aria-label={`Selected book: ${book.title}`} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onCancel();}}}><strong>{book.title}</strong><div><button className="ks-tool" onClick={onCancel}>Put back</button><button ref={previewButton} className="ks-tool ks-tool--accent" onClick={onOpen}>{book.id==='blank-book'?'Scrapbook':'Read at desk'}</button>{book.id==='blank-book'&&<button className="ks-tool ks-tool--accent" disabled={!onCreateBinder} onClick={onCreateBinder}>Card binder</button>}</div></div></Html>}
 </group></group>;
}

function CollectedSpines({objects,occupiedRows}:{objects:THREE.Object3D[];occupiedRows:number}){
 return <>{objects.filter((_,i)=>i%3===1).map((o,i)=>{const b=new THREE.Box3().setFromObject(o);const row=Math.max(0,Math.min(3,3-Math.round(b.min.y/.46)));if(row<occupiedRows)return null;const size=b.getSize(new THREE.Vector3());return <group key={o.uuid} position={[b.min.x-.001,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2]} rotation={[0,-Math.PI/2,0]}><Spine handwritten title={['Field notes','Letters','Woodland','Sketches'][i%4]} color={['#76694c','#64735c','#514b3a'][i%3]} ink="#ded0ac" width={size.z*.82} height={size.y*.85}/></group>;})}</>;
}

function DeskBook({scene}:{scene:THREE.Object3D}){
 const {activeBook,state}=useApp();const {isVisitor,viewAs}=useNav();
 const visible=activeBook&&(!isVisitor||canSee(activeBook.visibility,viewAs,state.profile.allowFriendScrapbooks===true));
 const cover=activeBook?COVER_STYLES[activeBook.coverStyle]:COVER_STYLES.forest;
 const texture=useLettering(visible?activeBook.title+'\n'+activeBook.subtitle:'Keepsake',cover.leather,cover.ink);
 useEffect(()=>{
  const object=scene.getObjectByName('ks_book');if(!(object instanceof THREE.Mesh))return;
  const oldGeometry=object.geometry;const oldMaterial=object.material;const geometry=oldGeometry.clone();
  const position=geometry.getAttribute('position');const normal=geometry.getAttribute('normal');const uv=geometry.getAttribute('uv');const index=geometry.index;
  if(!normal||!uv||!index){geometry.dispose();return;}
  const top:number[]=[];for(let i=0;i<position.count;i++)if(normal.getY(i)>.99)top.push(i);
  const points=top.map(i=>new THREE.Vector3().fromBufferAttribute(position,i));
  if(points.length<4){geometry.dispose();return;}
  const center=points.reduce((c,p)=>c.add(p),new THREE.Vector3()).divideScalar(points.length);
  const edges=points.slice(1).map(p=>p.clone().sub(points[0])).filter(e=>e.lengthSq()>1e-8).sort((a,b)=>a.lengthSq()-b.lengthSq());
  const u=edges[0].clone().normalize();if(u.x<0)u.negate();const v=u.clone().cross(new THREE.Vector3(0,1,0)).normalize();
  const width=Math.max(...points.map(p=>Math.abs(p.clone().sub(center).dot(u))))*2;const depth=Math.max(...points.map(p=>Math.abs(p.clone().sub(center).dot(v))))*2;
  top.forEach(i=>{const p=new THREE.Vector3().fromBufferAttribute(position,i).sub(center);uv.setXY(i,.5+p.dot(u)/width,.5-p.dot(v)/depth);});uv.needsUpdate=true;
  geometry.clearGroups();let groupStart=0;let materialIndex=normal.getY(index.getX(0))>.99?0:1;for(let i=3;i<=index.count;i+=3){const next=i<index.count?(normal.getY(index.getX(i))>.99?0:1):-1;if(next!==materialIndex){geometry.addGroup(groupStart,i-groupStart,materialIndex);groupStart=i;materialIndex=next;}}
  const face=new THREE.MeshStandardMaterial({map:texture,roughness:.9});const sides=new THREE.MeshStandardMaterial({color:cover.leather,roughness:.9});
  object.geometry=geometry;object.material=[face,sides];
  return()=>{object.geometry=oldGeometry;object.material=oldMaterial;geometry.dispose();face.dispose();sides.dispose();};
 },[scene,texture,cover.leather]);
 return null;
}

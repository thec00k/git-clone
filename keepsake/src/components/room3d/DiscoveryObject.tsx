import {BOOKSHELF_WINDOW_SHIFT} from './furnitureLayout';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useMemo,useRef} from 'react';
import * as THREE from 'three';
import {renderedMesh,visibleBounds} from './furnitureContact';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
import {activeDiscovery,discoveryState,PLACES,REWARDS,discover} from '../../lib/discoveries';
import {useActiveRoom} from './useActiveRoom';
export function DiscoveryObject({scene}:{scene:THREE.Object3D}){
 const note=useRef<THREE.Group>(null);
 const ray=useMemo(()=>new THREE.Raycaster(),[]);
 const {state:contactState}=useApp();
 const contactLetter=activeDiscovery(contactState);
 useFrame(()=>{
  if(contactLetter?.location!=='chair'||!note.current)return;
  const chair=scene.getObjectByName('ks_chair');if(!chair)return;
  const seat=chair.getObjectByName('Seat_Anchor')??chair.getObjectByName('Cozy_Chair_Cushion')??chair.getObjectByName('Chair_Seat');if(!seat)return;
  const p=seat.getWorldPosition(new THREE.Vector3());
  if(seat instanceof THREE.Mesh)visibleBounds(seat).getCenter(p);
  const meshes:THREE.Mesh[]=[];chair.traverse(o=>{if(renderedMesh(o))meshes.push(o);});
  ray.set(new THREE.Vector3(p.x,p.y+.16,p.z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObjects(meshes,false)[0];
  note.current.position.set(p.x,(hit?.point.y??p.y)+.002,p.z);
  note.current.rotation.set(-Math.PI/2,0,.18);
 });
 const {state,update}=useApp();const {isVisitor,touring,setDiscoveryOpen}=useNav();
 const activeRoom=useActiveRoom();const letter=activeDiscovery(state);if(activeRoom.id==="classic"||!letter||isVisitor||touring||discoveryState(state).frequency==='off')return null;
 const inBook=!!letter.guestEntryId&&(letter.delivery==='book'||discoveryState(state).guestNotesOnDesk===false);
 const place=PLACES.find(p=>p.id===(inBook?'guestbook':letter.location))!;
 const open=()=>{update(s=>discover(s,letter.id,Date.now()));setDiscoveryOpen(letter.id);};
 if(inBook)return <group position={[-1.48,.755,-1.61]} rotation={[-Math.PI/2,0,0]} onClick={e=>{e.stopPropagation();if(e.delta<4)open();}}>
  {[-1,1].map(side=><group key={side} position={[side*.111,0,0]} rotation={[0,side*.04,0]}><mesh><boxGeometry args={[.218,.30,.005]}/><meshStandardMaterial color="#eee2c8" roughness={1}/></mesh>{Array.from({length:7},(_,i)=><mesh key={i} position={[0,.085-i*.025,.004]}><planeGeometry args={[.15-(i%3)*.014,.0018]}/><meshStandardMaterial color="#9a8b70"/></mesh>)}</group>)}
  <Html center position={[0,0,.04]}><button className="ks-discovery-hit" aria-label={`Read guestbook message from ${letter.author}`} onClick={open}>Read</button></Html>
 </group>;
 return <group name="Keepsake_DiscoveryNote" ref={note} position={[place.position[0],place.position[1],place.position[2]+(letter.location==='shelf'?BOOKSHELF_WINDOW_SHIFT:0)]} rotation={[...place.rotation]} onClick={e=>{e.stopPropagation();if(e.delta<4)open();}}>
  <mesh><boxGeometry args={[.145,letter.location==='shelf'?.067:.095,.003]}/><meshStandardMaterial color={letter.reward?'#ded4a5':'#f0e4c8'} roughness={.94}/></mesh>
  {!letter.guestEntryId&&<mesh position={[0,0,.002]} rotation={[0,0,Math.PI/4]}><planeGeometry args={[.052,.052]}/><meshStandardMaterial color="#d8c8a6" roughness={1}/></mesh>}
  <mesh position={[0,-.005,.004]}><circleGeometry args={[.011,12]}/><meshStandardMaterial color="#937247" roughness={.8}/></mesh>
  {letter.reward==='correspondence'&&<mesh position={[.045,0,.005]}><planeGeometry args={[.024,.085]}/><meshStandardMaterial color="#647452" roughness={1}/></mesh>}
  {letter.reward==='between-lines'&&<group position={[.028,.015,.006]}>{[0,1,2,3,4].map(i=><mesh key={i} position={[Math.cos(i*Math.PI*2/5)*.009,Math.sin(i*Math.PI*2/5)*.009,0]} scale={[1,.5,1]} rotation={[0,0,i*Math.PI*2/5]}><circleGeometry args={[.009,10]}/><meshStandardMaterial color="#d4aa48" roughness={1}/></mesh>)}</group>}
  {(letter.reward==='story-kept'||letter.reward==='printed-memory')&&<mesh position={[.04,.018,.006]}><circleGeometry args={[.017,letter.reward==='printed-memory'?5:20]}/><meshStandardMaterial color="#ac8c49" roughness={.75} metalness={.15}/></mesh>}
  <Html center occlude position={[0,0,.015]}><button className="ks-discovery-hit" aria-label={`${letter.author?`Postcard from ${letter.author}`:letter.reward?REWARDS[letter.reward]?.title:'Folded letter'} · ${place.label}`} onClick={e=>{e.stopPropagation();open();}}>Read</button></Html>
 </group>;
}


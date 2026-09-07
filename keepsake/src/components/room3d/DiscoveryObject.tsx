import {Html} from '@react-three/drei';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
import {activeDiscovery,discoveryState,PLACES,REWARDS,discover} from '../../lib/discoveries';
import {activeRoom} from './themes';
export function DiscoveryObject(){
 const {state,update}=useApp();const {isVisitor,touring,setDiscoveryOpen}=useNav();
 const letter=activeDiscovery(state);if(!activeRoom.woodland||!letter||isVisitor||touring||discoveryState(state).frequency==='off')return null;
 const inBook=!!letter.guestEntryId&&(letter.delivery==='book'||discoveryState(state).guestNotesOnDesk===false);
 const place=PLACES.find(p=>p.id===(inBook?'guestbook':letter.location))!;
 const open=()=>{update(s=>discover(s,letter.id,Date.now()));setDiscoveryOpen(letter.id);};
 if(inBook)return <group position={[-1.48,.755,-1.61]} rotation={[-Math.PI/2,0,0]} onClick={e=>{e.stopPropagation();if(e.delta<4)open();}}>
  {[-1,1].map(side=><group key={side} position={[side*.111,0,0]} rotation={[0,side*.04,0]}><mesh><boxGeometry args={[.218,.30,.005]}/><meshStandardMaterial color="#eee2c8" roughness={1}/></mesh>{Array.from({length:7},(_,i)=><mesh key={i} position={[0,.085-i*.025,.004]}><planeGeometry args={[.15-(i%3)*.014,.0018]}/><meshStandardMaterial color="#9a8b70"/></mesh>)}</group>)}
  <Html center position={[0,0,.04]}><button className="ks-discovery-hit" aria-label={`Read guestbook message from ${letter.author}`} onClick={open}>Read</button></Html>
 </group>;
 return <group position={[...place.position]} rotation={[...place.rotation]} onClick={e=>{e.stopPropagation();if(e.delta<4)open();}}>
  <mesh><boxGeometry args={[.145,letter.location==='shelf'?.067:.095,.003]}/><meshStandardMaterial color={letter.reward?'#ded4a5':'#f0e4c8'} roughness={.94}/></mesh>
  {!letter.guestEntryId&&<mesh position={[0,0,.002]} rotation={[0,0,Math.PI/4]}><planeGeometry args={[.052,.052]}/><meshStandardMaterial color="#d8c8a6" roughness={1}/></mesh>}
  <mesh position={[0,-.005,.004]}><circleGeometry args={[.011,12]}/><meshStandardMaterial color="#937247" roughness={.8}/></mesh>
  {letter.reward==='correspondence'&&<mesh position={[.045,0,.005]}><planeGeometry args={[.024,.085]}/><meshStandardMaterial color="#647452" roughness={1}/></mesh>}
  {letter.reward==='between-lines'&&<group position={[.028,.015,.006]}>{[0,1,2,3,4].map(i=><mesh key={i} position={[Math.cos(i*Math.PI*2/5)*.009,Math.sin(i*Math.PI*2/5)*.009,0]} scale={[1,.5,1]} rotation={[0,0,i*Math.PI*2/5]}><circleGeometry args={[.009,10]}/><meshStandardMaterial color="#d4aa48" roughness={1}/></mesh>)}</group>}
  {(letter.reward==='story-kept'||letter.reward==='printed-memory')&&<mesh position={[.04,.018,.006]}><circleGeometry args={[.017,letter.reward==='printed-memory'?5:20]}/><meshStandardMaterial color="#ac8c49" roughness={.75} metalness={.15}/></mesh>}
  <Html center occlude position={[0,0,.015]}><button className="ks-discovery-hit" aria-label={`${letter.author?`Postcard from ${letter.author}`:letter.reward?REWARDS[letter.reward]?.title:'Folded letter'} · ${place.label}`} onClick={e=>{e.stopPropagation();open();}}>Read</button></Html>
 </group>;
}


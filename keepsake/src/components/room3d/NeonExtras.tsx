import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {useApp} from '../../store/appStore';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {createSnake,stepSnake,SNAKE_ROUTE,SNAKE_SIZE,createPlayerSnake,steerPlayerSnake,stepPlayerSnake,type SnakeCell,type SnakeDirection} from '../../lib/snakePoster';
import {useWorkbench} from '../../store/workbench';
import {getNeonSign} from '../../lib/roomShop';

function NeonWallSign({kind}:{kind:'neon-cherries'|'neon-heart'}){
 const paths=useMemo(()=>{
  if(kind==='neon-heart')return [{curve:new THREE.CatmullRomCurve3(Array.from({length:80},(_,i)=>{const a=i*Math.PI*2/80;return new THREE.Vector3(.010*16*Math.sin(a)**3,.04+.010*(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a)),0);}),true),color:'#ff243a'}];
  const cherry=(x:number,y:number)=>new THREE.CatmullRomCurve3(Array.from({length:40},(_,i)=>{const a=i*Math.PI*2/40;return new THREE.Vector3(x+.061*Math.cos(a),y+.063*Math.sin(a)-.008*Math.cos(2*a),0);}),true);
  const line=(p:number[][])=>new THREE.CatmullRomCurve3(p.map(v=>new THREE.Vector3(v[0],v[1],0)));
  return [{curve:cherry(-.065,-.05),color:'#ff307c'},{curve:cherry(.076,-.069),color:'#ff307c'},
   {curve:line([[-.065,.005],[-.059,.08],[-.018,.16],[.016,.19]]),color:'#6dffd3'},
   {curve:line([[.076,-.012],[.067,.064],[.033,.146],[.016,.19]]),color:'#6dffd3'},
   {curve:line([[.01,.174],[-.035,.215],[-.093,.207],[-.056,.17],[.01,.174]]),color:'#6dffd3'}];
 },[kind]);
 // Switch centre is (-1.58, 1.32, -2.08); sign sits above and slightly left.
 return <group name={kind==='neon-heart'?'Neon_Heart_Sign':'Neon_Cherry_Sign'} position={[-1.72,1.72,-2.045]}>
  {paths.map(({curve,color},i)=><group key={i}>
   <mesh><tubeGeometry args={[curve,48,.009,6,curve.closed]}/><meshStandardMaterial color="#241a2c" metalness={.5} roughness={.4}/></mesh>
   <mesh position={[0,0,.009]}><tubeGeometry args={[curve,48,.0045,6,curve.closed]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh>
   <mesh position={[0,0,.008]}><tubeGeometry args={[curve,48,.014,6,curve.closed]}/><meshBasicMaterial color={color} transparent opacity={.075} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  </group>)}
 </group>;
}

function SnakePoster({paused}:{paused:boolean}){
 const reduced=useReducedMotion(),mesh=useRef<THREE.Mesh>(null),game=useRef(createSnake()),elapsed=useRef(0);
 const [playing,setPlaying]=useState(false),[notice,setNotice]=useState('Use arrow keys to start. Press Escape to exit.');
 const {phase}=useWorkbench();
 useEffect(()=>{if(phase!=='room')setPlaying(false);},[phase]);
 const player=useRef(createPlayerSnake());
 const posterAt=useMemo(()=>new THREE.Vector3(-.95,1.48,2.075),[]);
 const {map,draw}=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;
  const c=canvas.getContext('2d')!,map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const draw=(s:ReturnType<typeof createSnake>,manual?:ReturnType<typeof createPlayerSnake>)=>{
   const body:readonly SnakeCell[]=manual?.body??Array.from({length:s.length},(_,i)=>SNAKE_ROUTE[(s.head-i+SNAKE_ROUTE.length)%SNAKE_ROUTE.length]);
   const food=manual?.food??SNAKE_ROUTE[s.food];
   c.fillStyle='#070d1b';c.fillRect(0,0,384,512);
   c.textAlign='center';c.fillStyle='#9afbea';c.font='25px monospace';c.fillText('SNAKE / MAZE',192,48);
   c.font='12px monospace';c.fillStyle='#7299ac';c.fillText(manual?'YOUR TURN  ·  ARROW KEYS':'NIGHT ARCADE  ·  CLICK POSTER TO PLAY',192,73);
   const cell=26,left=36,top=103;
   c.strokeStyle='#152c3d';c.lineWidth=1;
   for(let y=0;y<SNAKE_SIZE;y++)for(let x=0;x<SNAKE_SIZE;x++)c.strokeRect(left+x*cell,top+y*cell,cell,cell);
   c.fillStyle='#ff5aa5';c.beginPath();c.arc(left+food[0]*cell+13,top+food[1]*cell+13,6,0,Math.PI*2);c.fill();
   for(let i=body.length-1;i>=0;i--){const [x,y]=body[i];c.fillStyle=i===0?'#d7fff4':`hsl(${158+i%20} 75% ${54-i/body.length*22}%)`;c.fillRect(left+x*cell+2,top+y*cell+2,22,22);}
   const [x,y]=body[0];c.fillStyle='#173d3e';c.fillRect(left+x*cell+7,top+y*cell+7,3,3);c.fillRect(left+x*cell+16,top+y*cell+7,3,3);
   c.fillStyle='#92dedc';c.font='16px monospace';c.fillText(`SCORE ${String(manual?.score??s.score).padStart(3,'0')}   /   ${manual?(manual.status==='lost'?'GAME OVER':manual.status==='won'?'YOU WIN':manual.status==='ready'?'READY':'PLAYING'):`ROUND ${String(s.round).padStart(2,'0')}`}`,192,459);
   c.font='11px monospace';c.fillStyle='#758ca5';c.fillText('KEEPSAKE  •  AFTER HOURS',192,487);map.needsUpdate=true;
  };
  draw(createSnake());return {map,draw};
 },[]);
 const visibility=useMemo(()=>({frustum:new THREE.Frustum(),matrix:new THREE.Matrix4()}),[]);
 useEffect(()=>()=>map.dispose(),[map]);
 const start=()=>{player.current=createPlayerSnake();elapsed.current=0;if(mesh.current){mesh.current.userData.playerHead=[...player.current.body[0]];mesh.current.userData.playerStatus='ready';}setNotice('Use arrow keys to start. Press Escape to exit.');setPlaying(true);draw(game.current,player.current);};
 const leave=()=>setPlaying(false);
 useEffect(()=>{
  if(!playing){draw(game.current);return;}
  window.dispatchEvent(new CustomEvent('ks-object-controls',{detail:true}));
  const key=(e:KeyboardEvent)=>{
   if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
   const direction:Record<string,SnakeDirection>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();leave();return;}
   if(direction[e.key]){e.preventDefault();e.stopImmediatePropagation();player.current=steerPlayerSnake(player.current,direction[e.key]);if(player.current.status==='playing')setNotice('Use arrow keys to steer. Press Escape to exit.');}
  };
  const blur=()=>setPlaying(false);
  const otherControl=(e:MouseEvent)=>{if(e.target instanceof HTMLElement&&e.target.closest('button,a,summary,[role="tab"]')&&!e.target.closest('[data-snake-controls]'))setPlaying(false);};
  window.addEventListener('keydown',key,true);window.addEventListener('blur',blur);window.addEventListener('click',otherControl,true);
  return()=>{window.removeEventListener('keydown',key,true);window.removeEventListener('blur',blur);window.removeEventListener('click',otherControl,true);window.dispatchEvent(new CustomEvent('ks-object-controls',{detail:false}));};
 },[playing,draw]);
 useFrame(({camera},dt)=>{
  if(document.hidden||!mesh.current)return;
  if(playing&&document.querySelector('[aria-modal="true"]')){setPlaying(false);return;}
  if(!playing&&(paused||reduced))return;
  visibility.frustum.setFromProjectionMatrix(visibility.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  if(!visibility.frustum.intersectsObject(mesh.current))return;
  elapsed.current+=Math.min(dt,.25);if(elapsed.current<1/6)return;elapsed.current%=1/6;
  if(playing){
   const before=player.current;player.current=stepPlayerSnake(before);draw(game.current,player.current);
   mesh.current.userData.playerHead=[...player.current.body[0]];mesh.current.userData.playerStatus=player.current.status;
   if(before.status!==player.current.status&&(player.current.status==='lost'||player.current.status==='won'))setNotice(`${player.current.status==='won'?'You won!':'Game over.'} Score ${player.current.score}. Play again or leave.`);
  }else{game.current=stepSnake(game.current);draw(game.current);mesh.current.userData.snakeHead=game.current.head;}
 });
 return <group name="Neon_Snake_Poster" position={posterAt} rotation={[0,Math.PI,0]}>
  <mesh><boxGeometry args={[.50,.65,.022]}/><meshStandardMaterial color="#111a29" metalness={.65} roughness={.3}/></mesh>
  <mesh ref={mesh} position={[0,0,.012]} onClick={e=>{if(e.delta<=4){e.stopPropagation();if(!playing)start();}}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}><planeGeometry args={[.46,.61]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>
  {([[-.242,0,.017,.007,.63],[.242,0,.017,.007,.63],[0,.316,.017,.49,.007],[0,-.316,.017,.49,.007]] as const).map(([x,y,z,w,h],i)=><mesh key={i} position={[x,y,z]}><boxGeometry args={[w,h,.005]}/><meshBasicMaterial color={i%2?'#ef4da9':'#49f5dd'} toneMapped={false}/></mesh>)}
  {playing&&<Html center calculatePosition={(_object,_camera,size)=>[size.width/2,size.height-(size.width<=480?210:size.width<=900?180:160)]} style={{pointerEvents:'auto'}}><div data-snake-controls className="ks-snake-controls"><p role="status" className="text-xs mb-2">{notice}</p><div><button className="ks-tool" onClick={start}>Restart Snake</button><button className="ks-tool" onClick={leave}>Leave game</button></div></div></Html>}
 </group>;
}

export function NeonExtras(){
 const {state}=useApp();const d=state.roomDecor,sign=getNeonSign(d);
 return <>
  <pointLight position={[.15,1.5,1.8]} color="#71dbea" intensity={.18} distance={1.5} decay={2}/>
  {sign&&<NeonWallSign key={sign} kind={sign}/>}
  {d?.posterItem==='poster-snake'&&d.owned.includes('poster-snake')&&<SnakePoster paused={!!d.snakePaused}/>}
 </>;
}

import {use, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Html,useContextBridge} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {useApp,AppContext} from '../../store/appStore';
import {useNav,NavContext} from '../../store/nav';
import {useWorkbench,Context as WorkbenchContext} from '../../store/workbench';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useLettering} from './MemoryObjects';
import {COVER_STYLES} from '../../types/scrapbook';
import {BookView} from '../BookView';
import {CardBinders} from '../CardBinders';
import {BINDER_COLORS} from '../../lib/cardBinders';
import {BookIdentityEditor} from '../BookIdentityEditor';
import {canSee} from '../../lib/permissions';
import {PageTurnContext,type PhysicalTurn} from '../../store/pageTurn';
import {pageTurnWeights,smootherstep,leftStackPose} from '../../lib/workbench';
import {motionFactor,MOTION} from '../../lib/motion';
let bookAsset: ReturnType<GLTFLoader['loadAsync']>|undefined;
const loadBook=()=>bookAsset??=(new GLTFLoader()).loadAsync('/room/shared/scrapbook.glb').catch(error=>{bookAsset=undefined;throw error;});

function EditorSurface({header,footer,children}:{header?:ReactNode;footer?:ReactNode;children:ReactNode}) {
  const Bridge=useContextBridge(AppContext,NavContext,WorkbenchContext,PageTurnContext);
  const host=document.getElementById('ks-workbench-controls');
  return <>
    <Html><Bridge>{host&&createPortal(<><header className="ks-workbench-editor-header">{header}</header><div className="ks-workbench-editor-footer">{footer}</div></>,host)}</Bridge></Html>
    <Html transform occlude="blending" rotation={[-Math.PI/2,0,0]} position={[0,.027,0]} distanceFactor={.2666667} zIndexRange={[20,10]}>
      <Bridge><div className="ks-workbench-pages">{children}</div></Bridge>
    </Html>
  </>;
}

export function WorkbenchBook({roomScene}:{roomScene:THREE.Object3D}) {
  const asset=use(loadBook());
  const {activeBook,state,renameBook,setBookCover,update}=useApp();
  const {viewAs,isVisitor}=useNav();
  const {phase,send,binderId}=useWorkbench();
  const binder=!isVisitor?state.cardBinders?.find(b=>b.id===binderId):undefined;
  const changeBinder=(patch:{title?:string;color?:string})=>update(s=>({...s,cardBinders:s.cardBinders?.map(b=>b.id===binder?.id?{...b,...patch}:b)}));
  const reduced=useReducedMotion();
  const [turn,setTurn]=useState<PhysicalTurn|null>(null);
  const turnApi=useMemo(()=>({start:(next:PhysicalTurn)=>setTurn(next),cancel:()=>setTurn(null)}),[]);
  const turnTime=useRef(0),turnFinished=useRef(false);
  const group=useRef<THREE.Group>(null);
  const chair=useMemo(()=>{
    const object=roomScene.getObjectByName('ks_chair');
    return object?{object,position:object.position.clone(),rotation:object.quaternion.clone()}:null;
  },[roomScene]);
  useEffect(()=>()=>{if(chair){chair.object.position.copy(chair.position);chair.object.quaternion.copy(chair.rotation);}},[chair]);
  const {model,materials}=useMemo(()=>{
    const model=asset.scene.clone(true);const materials:THREE.Material[]=[];
    model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const copy=(m:THREE.Material)=>{const next=m.clone();materials.push(next);return next;};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);}});
    return {model,materials};
  },[asset]);
  useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
  const visible=!!binder||activeBook&&canSee(activeBook.visibility,viewAs,state.profile.allowFriendScrapbooks===true);
  const palette=binder?{leather:binder.color,ink:'#f2e7cf'}:COVER_STYLES[activeBook?.coverStyle??'forest'];
  const coverMap=useLettering(binder?binder.title+'\nCard collection':visible&&activeBook?activeBook.title+'\n'+activeBook.subtitle:'Keepsake',palette.leather,palette.ink,false,false,true);
  useEffect(()=>{materials.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial&&m.name==='Book_Linen')m.color.set(palette.leather);});},[materials,palette]);
  const hinge=model.getObjectByName('Book_Cover_Hinge');
  const leftPages=model.getObjectByName('Book_Left_Pages');
  const coverNormal=materials.find(m=>m.name==='Book_Linen') as THREE.MeshStandardMaterial|undefined;
  const leaf=model.getObjectByName('Book_Turning_Page');
  const maps=useMemo(()=>turn?[turn.front,turn.back].map(canvas=>{const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.anisotropy=4;return map;}):null,[turn]);
  useEffect(()=>{
    turnTime.current=0;turnFinished.current=false;
    if(leaf){leaf.visible=!!turn;leaf.position.y=.002;leaf.traverse(o=>{if(o instanceof THREE.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){const index=m.name==='Page_Front_Content'?0:1;m.map=maps?.[turn?.direction==='prev'?1-index:index]??null;m.color.set('#ffffff');m.needsUpdate=true;}});}});}
    return()=>maps?.forEach(map=>map.dispose());
  },[turn,maps,leaf]);
  const opened=phase==='opening'||phase==='editing';
  useEffect(()=>{
    const old=roomScene.getObjectByName('ks_book');if(!old)return;
    const wasVisible=old.visible;old.visible=false;
    return()=>{old.visible=wasVisible;};
  },[roomScene]);
  useFrame((_,delta)=>{
    const t=motionFactor(delta,MOTION.furniture,reduced);
    if(hinge){hinge.rotation.z=THREE.MathUtils.lerp(hinge.rotation.z,opened?Math.PI:0,t);hinge.position.y=THREE.MathUtils.lerp(hinge.position.y,opened?.004:.029,t);}
    if(leftPages&&hinge){
      // The left stack rides the inside of the cover instead of expanding
      // horizontally through it. At rest its top matches the editor surface.
      const angle=hinge.rotation.z;
      const pose=leftStackPose(angle,hinge.position.y);
      leftPages.rotation.z=pose.rotation;
      leftPages.position.set(pose.x,pose.y,0);
      leftPages.scale.x=1;
      leftPages.visible=angle>.025;
    }
    if(group.current)group.current.position.x=THREE.MathUtils.lerp(group.current.position.x,opened?-.15:-.31,t);
    if(chair){
      const active=phase!=='room'&&phase!=='leaving';
      const resting=chair.position.clone();resting.y+=Number(chair.object.userData.floorLift??0);
      chair.object.position.lerp(active?new THREE.Vector3(-.15,resting.y,-.78):resting,t);
      chair.object.quaternion.slerp(active?new THREE.Quaternion():chair.rotation,t);
    }
    if(turn&&leaf&&!turnFinished.current){
      turnTime.current+=Math.min(delta,.05);
      const progress=smootherstep(Math.min(1,turnTime.current/.95));
      const weights=pageTurnWeights(turn.direction==='next'?progress:1-progress);
      leaf.traverse(o=>{if(o instanceof THREE.Mesh&&o.morphTargetInfluences)weights.forEach((w,i)=>{const name=`Turn_${String((i+1)*25).padStart(3,'0')}`;const index=o.morphTargetDictionary?.[name];if(index!==undefined)o.morphTargetInfluences![index]=w;});});
      if(turnTime.current>=.95){turnFinished.current=true;turn.done();}
    }
  });
  const Bridge=useContextBridge(AppContext,NavContext,WorkbenchContext);
  const host=document.getElementById('ks-workbench-controls');
  return <group ref={group} position={[-.31,.756,-1.72]} visible={!!binder||!!activeBook}>
    <primitive object={model}/>
    {/* The lettering follows the authored hinge, including its cover opening. */}
    {hinge&&<CoverLettering hinge={hinge} texture={coverMap} normal={coverNormal?.normalMap??undefined}/>}
    {phase==='editing'&&visible&&<PageTurnContext.Provider value={turnApi}>{binder?<CardBinders key={binder.id} initialId={binder.id} frame={EditorSurface} onClose={()=>send('close')}/>:<BookView frame={EditorSurface} portalTarget={host} onClose={()=>send('close')}/>}</PageTurnContext.Provider>}
    <Html><Bridge>{host&&(phase==='cover'||phase==='arriving'||phase==='opening'||phase==='closing'||phase==='leaving')&&createPortal(
      <section className="ks-workbench-cover-panel" aria-label="Scrapbook cover" aria-busy={phase!=='cover'}>
        {phase==='cover'?<>
          <p className="ks-caption">A moment at your desk</p>
          {binder?<><label>Binder title<input className="ks-input" aria-label="Binder title" maxLength={80} value={binder.title} onChange={e=>changeBinder({title:e.target.value})}/></label><label>Cover color<select aria-label="Binder cover color" value={binder.color} onChange={e=>changeBinder({color:e.target.value})}>{BINDER_COLORS.map((c,i)=><option key={c} value={c}>{['Moss','Ocean','Plum','Cognac','Charcoal'][i]}</option>)}</select></label></>:visible&&activeBook&&!isVisitor?<BookIdentityEditor title={activeBook.title} subtitle={activeBook.subtitle} coverStyle={activeBook.coverStyle}
            onTitle={title=>renameBook(activeBook.id,title,activeBook.subtitle)} onSubtitle={subtitle=>renameBook(activeBook.id,activeBook.title,subtitle)} onCover={cover=>setBookCover(activeBook.id,cover)}/>:<p>{visible&&activeBook?activeBook.title:'This scrapbook is private.'}</p>}
          <div className="ks-workbench-cover-actions"><button className="ks-tool" onClick={()=>send('leave')}>Return to room</button><button className="ks-tool ks-tool--accent" disabled={!visible} onClick={()=>send('open')}>{binder?'Open binder':'Open scrapbook'}</button></div>
        </>:<p role="status">{phase==='arriving'?'Taking a seat…':phase==='opening'?'Opening your scrapbook…':phase==='closing'?'Closing your scrapbook…':'Returning to the room…'}</p>}
      </section>,host)}</Bridge></Html>
  </group>;
}

function CoverLettering({hinge,texture,normal}:{hinge:THREE.Object3D;texture:THREE.Texture;normal?:THREE.Texture}){
  const ref=useRef<THREE.Group>(null);
  useFrame(()=>{if(ref.current){ref.current.position.copy(hinge.position);ref.current.quaternion.copy(hinge.quaternion);}});
  return <group ref={ref}><mesh position={[.16,.0043,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.30,.415]}/><meshStandardMaterial map={texture} normalMap={normal} normalScale={new THREE.Vector2(.3,.3)} roughness={.94}/></mesh></group>;
}

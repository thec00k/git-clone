import {useEffect,useMemo,useRef,useState} from 'react';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
import {loadImageFile} from '../../lib/image';
import {checkImportCapacity,checkStorageCapacity} from '../../lib/importLimits';

export function CabinetPhoto({scene}:{scene:THREE.Object3D}) {
 const {state,update,addArchivePhoto}=useApp();const {isVisitor}=useNav();
 const [focused,setFocused]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null),alive=useRef(true);
 const object=useMemo(()=>scene.getObjectByName('ks_archive_frame_mat'),[scene]);
 const box=useMemo(()=>object?new THREE.Box3().setFromObject(object):null,[object]);
 const center=useMemo(()=>box?.getCenter(new THREE.Vector3()),[box]);
 const photo=isVisitor||state.framePhotoId==='__empty__'?undefined:(state.archive.find(a=>a.id===state.framePhotoId)??state.archive.find(a=>a.favorite)??state.archive[0]);
 const close=()=>{setFocused(false);window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:null}));};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:null}));};},[]);
 useEffect(()=>{if(!focused)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopImmediatePropagation();close();}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[focused]);
 useEffect(()=>{
  if(!(object instanceof THREE.Mesh))return;
  let live=true;const old=object.material;const material=new THREE.MeshStandardMaterial({color:'#f1e8d8',roughness:.85});object.material=material;
  const texture=photo?new THREE.TextureLoader().load(photo.src,()=>{if(live){material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;}}):null;
  if(texture){texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;}
  return()=>{live=false;object.material=old;texture?.dispose();material.dispose();};
 },[object,photo?.src]);
 async function choose(file:File|undefined){if(!file)return;setBusy(true);setError('');try{await checkImportCapacity([file]);const image=await loadImageFile(file,state.profile.preserveOriginals!==false);await checkStorageCapacity(image.src.length);if(!alive.current)return;const id=addArchivePhoto(image.src,image.aspect,[],image.original);update(s=>({...s,framePhotoId:id}));}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Could not load photo');}finally{if(alive.current)setBusy(false);}}
 if(!center||!box)return null;
 const open=()=>{setFocused(true);window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:{position:[center.x,center.y+.035,center.z+.55],target:center.toArray()}}));};
 return <group>
  <mesh position={[center.x,center.y,box.max.z+.008]} onClick={e=>{e.stopPropagation();if(e.delta<4)open();}} onPointerOver={()=>{document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}>
   <boxGeometry args={[Math.max(.08,box.max.x-box.min.x),Math.max(.10,box.max.y-box.min.y),.015]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  {focused&&<>
   <Html center position={[box.max.x,box.max.y+.018,box.max.z+.015]}><div className="ks-frame-actions">
    {!isVisitor&&<><button disabled={busy} aria-label="Replace framed photo" title="Replace photo" onClick={()=>input.current?.click()}>↻</button><button disabled={busy||!photo} aria-label="Remove framed photo" title="Remove from frame" onClick={()=>update(s=>({...s,framePhotoId:'__empty__'}))}>×</button></>}
    <button aria-label="Return to room from photo" onClick={close}>Done</button>
    <input ref={input} hidden type="file" accept="image/*" aria-label="Choose framed photo" onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/>
   </div></Html>
   {!photo&&!isVisitor&&<Html center position={[center.x,center.y,box.max.z+.02]}><button className="ks-tool" aria-label="Add framed photo" disabled={busy} onClick={()=>input.current?.click()}>+</button></Html>}
   {(error||busy)&&<Html center position={[center.x,box.min.y-.035,box.max.z+.02]}><p className="ks-panel" role="status">{busy?'Preparing photo…':error}</p></Html>}
  </>}
 </group>;
}

import {useEffect,useRef,useState} from 'react';
import {useApp} from '../store/appStore';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {loadImageFile} from '../lib/image';
import './TimeCapsule.css';

export interface Capsule {id:string;title:string;opensAt:number;createdAt:number;openedAt?:number;photos:{src:string}[]}
export function TimeCapsule({onClose}:{onClose:()=>void}){
 const {state,update}=useApp();const panel=useRef<HTMLDivElement>(null);useFocusTrap(panel,onClose);
 const [title,setTitle]=useState('For a future day'),[date,setDate]=useState(''),[photos,setPhotos]=useState<{src:string}[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 async function upload(files:File[]){if(files.length+photos.length>20){setMessage('Choose up to 20 photos per capsule.');return;}setBusy(true);try{const images:{src:string}[]=[];for(const f of files)images.push(await loadImageFile(f,false));setPhotos(p=>[...p,...images.map(({src})=>({src}))]);setMessage('');}catch(e){setMessage(e instanceof Error?e.message:'Could not load photos.');}finally{setBusy(false);}}
 function seal(){const opensAt=new Date(date).getTime();if(!photos.length||!title.trim()||!Number.isFinite(opensAt)||opensAt<=Date.now()){setMessage('Add photos, a title, and a future opening date.');return;}update(s=>({...s,timeCapsules:[...(s.timeCapsules??[]),{id:crypto.randomUUID(),title:title.trim(),opensAt,createdAt:Date.now(),photos}]}));setPhotos([]);setDate('');setMessage('Sealed safely until your chosen date.');}
 return <div className="ks-correspondence-overlay" onClick={onClose}><div ref={panel} className="ks-correspondence ks-time-capsule" role="dialog" aria-modal="true" aria-label="Time capsule" onClick={e=>e.stopPropagation()}>
  <header><h2>Time capsule</h2><button onClick={onClose} aria-label="Close time capsule">×</button></header>
  <p>Put a few memories aside for your future self.</p>
  <label>Capsule title<input maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label>Open on<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label>
  <label>Photos from your device<input type="file" accept="image/*" multiple disabled={busy} onChange={e=>{void upload(Array.from(e.target.files??[]));e.target.value='';}}/></label>
  <details><summary>Choose from filing cabinet</summary><div className="ks-capsule-photos">{state.archive.map(p=><button key={p.id} disabled={busy||photos.length>=20||photos.some(x=>x.src===p.src)} aria-label={`Add photo ${p.id}`} onClick={()=>setPhotos(a=>[...a,{src:p.src}])}><img src={p.src} alt="Filed memory"/></button>)}</div>{!state.archive.length&&<p>Your filing cabinet is empty.</p>}</details>
  <div className="ks-capsule-photos">{photos.map((p,i)=><button key={i} disabled={busy} aria-label={`Remove photo ${i+1}`} onClick={()=>setPhotos(a=>a.filter((_,n)=>n!==i))}><img src={p.src} alt={`Selected memory ${i+1}`}/><span>Remove</span></button>)}</div>
  <button disabled={busy||!photos.length||(state.timeCapsules?.length??0)>=50} onClick={seal}>{busy?'Preparing photos…':`Seal capsule · ${photos.length}/20 photos`}</button><p role="status">{message}</p>
  <small>Saved on this device and included in room backups. Opening dates use your device clock; this is a personal reminder, not a secure vault.</small>
  <h3>Your capsules</h3>{!(state.timeCapsules?.length)&&<p>Your sealed memories will wait here.</p>}
  {state.timeCapsules?.map(c=><article key={c.id}><h4>{c.title}</h4><p>{c.photos.length} photos · {new Date(c.opensAt).toLocaleString()}</p>{c.openedAt?<div className="ks-capsule-photos">{c.photos.map((p,i)=><a key={i} href={p.src} download={`capsule-photo-${i+1}.jpg`}><img src={p.src} alt={`Memory ${i+1}`}/></a>)}</div>:<button disabled={now<c.opensAt} onClick={()=>update(s=>({...s,timeCapsules:s.timeCapsules?.map(x=>x.id===c.id&&Date.now()>=x.opensAt?{...x,openedAt:Date.now()}:x)}))}>{now<c.opensAt?'Sealed until opening day':'Open your memories'}</button>}</article>)}
 </div></div>;
}


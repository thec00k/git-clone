import {useEffect,useRef,useState} from 'react';
import {useApp} from '../store/appStore';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {checkImportCapacity,checkStorageCapacity} from '../lib/importLimits';
import {loadImageFile} from '../lib/image';
import type {ImportPhoto} from '../lib/photoBatch';

export function PhotoImportDialog({onClose,onAdd}:{onClose:()=>void;onAdd:(photos:ImportPhoto[])=>void}){
 const {state}=useApp();const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),alive=useRef(true);
 useFocusTrap(root,onClose);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const [source,setSource]=useState<'device'|'cabinet'>('device');const [photos,setPhotos]=useState<ImportPhoto[]>([]);const [category,setCategory]=useState('all');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function files(list:FileList|null){
  if(!list?.length)return;
  if(list.length>20){setMessage('Choose up to 20 photos at a time. Nothing has been imported.');return;}
  const picked=Array.from(list);setBusy(true);
  try{await checkImportCapacity(picked);}catch(error){if(alive.current){setBusy(false);setMessage(error instanceof Error?error.message:'Storage is unavailable.');}return;}
  setBusy(true);setMessage('Preparing photos…');const loaded:ImportPhoto[]=[];let failed=0;
  for(const file of picked){if(!alive.current)return;try{loaded.push({...await loadImageFile(file,state.profile.preserveOriginals!==false),name:file.name});}catch{failed++;}}
  try{await checkStorageCapacity(loaded.reduce((n,p)=>n+p.src.length,0));}catch(error){if(alive.current){setBusy(false);setMessage(error instanceof Error?error.message:'Storage is unavailable.');}return;}
  if(!alive.current)return;setPhotos(loaded);setBusy(false);setMessage(failed?`${failed} file(s) could not be read. Review the remaining photos below.`:'Check the order below. Your device may return files in filename order.');
 }
 function move(i:number,step:number){setPhotos(old=>{const next=[...old];[next[i],next[i+step]]=[next[i+step],next[i]];return next;});}
 return <div className="ks-import-backdrop"><div ref={root} className="ks-import-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-import-title">
  <header><h2 id="photo-import-title">Add photos</h2><button onClick={onClose} aria-label="Close photo chooser">×</button></header>
  <div className="ks-import-sources"><button aria-pressed={source==='device'} onClick={()=>{setSource('device');setPhotos([]);setMessage('');}} disabled={busy}>Computer or phone</button><button aria-pressed={source==='cabinet'} onClick={()=>{setSource('cabinet');setPhotos([]);setMessage('');}} disabled={busy}>Filing cabinet</button></div>
  <p>Select up to 20. Multiple photos use equal square frames, four per page. Uncropped display copies stay in the cabinet. Original files are also preserved when enabled in Saving & storage.</p>
  {source==='device'?<button disabled={busy} onClick={()=>input.current?.click()}>Choose photos from device</button>:<><label>Category <select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All photographs</option>{state.archiveTabs.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><div className="ks-import-grid" aria-label="Cabinet photographs">{state.archive.filter(p=>category==='all'||p.categories.includes(category)).map((p,i)=>{const selected=photos.some(a=>a.photoId===p.id);return <button key={p.id} aria-label={`Select cabinet photo ${i+1}`} aria-pressed={selected} disabled={!selected&&photos.length>=20} onClick={()=>setPhotos(old=>selected?old.filter(a=>a.photoId!==p.id):[...old,{src:p.src,aspect:p.aspect,photoId:p.id,name:`Cabinet photo ${i+1}`}])}><img src={p.src} alt="" loading="lazy"/>{selected?'✓ Selected':'Select'}</button>;})}</div>{!state.archive.length&&<p>Your cabinet is empty. Choose photos from your device first.</p>}</>}
  <input ref={input} type="file" accept="image/*" multiple hidden aria-label="Select photos from device" onChange={e=>{void files(e.target.files);e.target.value='';}}/>
  <p role="status">{message}</p>
  {!!photos.length&&<><h3>Photo order · {photos.length}/20</h3><ol className="ks-import-grid">{photos.map((p,i)=><li key={`${p.photoId??p.name}-${i}`}><img src={p.src} alt={p.name??`Photo ${i+1}`}/><span>{i+1} · {p.name}</span><div><button disabled={!i} aria-label={`Move photo ${i+1} earlier`} onClick={()=>move(i,-1)}>←</button><button disabled={i===photos.length-1} aria-label={`Move photo ${i+1} later`} onClick={()=>move(i,1)}>→</button><button aria-label={`Remove photo ${i+1}`} onClick={()=>setPhotos(old=>old.filter((_,n)=>n!==i))}>×</button></div></li>)}</ol><p>{photos.length===1?'Adds to the selected page.':`${Math.ceil(photos.length/4)} page(s), in this order. A blank selected page is used first; otherwise fresh pages are inserted after it. Existing content is kept.`}</p></>}
  <footer><button onClick={onClose}>Cancel</button><button disabled={busy||!photos.length} onClick={()=>onAdd(photos)}>Add {photos.length||''} photo{photos.length===1?'':'s'}</button></footer>
 </div></div>;
}

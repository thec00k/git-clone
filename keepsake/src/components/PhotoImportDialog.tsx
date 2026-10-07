import {useEffect,useRef,useState} from 'react';
import {useApp} from '../store/appStore';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {checkImportCapacity,checkStorageCapacity} from '../lib/importLimits';
import {loadImageFile} from '../lib/image';
import {BatchPhotoReview} from './BatchPhotoReview';

export function PhotoImportDialog({onClose}:{onClose:()=>void}){
 const {state,addArchivePhoto}=useApp();const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),alive=useRef(true);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[reviewIds,setReviewIds]=useState<string[]>([]),[selected,setSelected]=useState<string[]>([]),[category,setCategory]=useState('all');
 useFocusTrap(root,()=>{if(!busy&&!reviewIds.length)onClose();});useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function files(list:FileList|null){
  if(!list?.length)return;setBusy(true);setMessage('Preparing your photographs…');const ids:string[]=[];let failed=0;
  try{await checkImportCapacity(Array.from(list));for(const file of Array.from(list)){
   if(!alive.current)return;let photo;try{photo=await loadImageFile(file,state.profile.preserveOriginals!==false);}catch{failed++;continue;}
   if(!alive.current)return;await checkStorageCapacity(photo.src.length);ids.push(addArchivePhoto(photo.src,photo.aspect,[],photo.original));
   setMessage(`Saved ${ids.length} of ${list.length} photographs.`);
  }}catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Import could not finish.');}
  if(!alive.current)return;setBusy(false);if(ids.length)setReviewIds(ids);else if(failed)setMessage(`${failed} photographs could not be read. Try another image file.`);
 }
 if(reviewIds.length)return <BatchPhotoReview photoIds={reviewIds} notice={message} onClose={onClose}/>;
 return <div className="ks-import-backdrop"><section ref={root} className="ks-import-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-import-title">
  <header><h2 id="photo-import-title">Choose photographs</h2><button disabled={busy} onClick={onClose} aria-label="Close photo chooser">×</button></header>
  <p>Upload a batch to review it as a stack, or choose photographs already in your archive. Your selections wait beside the scrapbook until you place them.</p>
  <button disabled={busy} onClick={()=>input.current?.click()}>Upload from device</button>
  <input ref={input} type="file" accept="image/*" multiple hidden aria-label="Select photos from device" onChange={e=>{void files(e.target.files);e.target.value='';}}/>
  <p role="status">{message}</p>
  <label>Archive category <select disabled={busy} value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All photographs</option>{state.archiveTabs.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
  <div className="ks-import-grid">{state.archive.filter(p=>category==='all'||p.categories.includes(category)).map((p,i)=><button key={p.id} disabled={busy} aria-label={`Select archive photograph ${i+1}`} aria-pressed={selected.includes(p.id)} onClick={()=>setSelected(old=>old.includes(p.id)?old.filter(id=>id!==p.id):[...old,p.id])}><img src={p.src} alt="" loading="lazy"/>{selected.includes(p.id)?'Selected':'Select'}</button>)}</div>
  <footer><button disabled={busy} onClick={onClose}>Cancel</button><button disabled={busy||!selected.length} onClick={()=>setReviewIds(selected)}>Review {selected.length||''} photographs</button></footer>
 </section></div>;
}

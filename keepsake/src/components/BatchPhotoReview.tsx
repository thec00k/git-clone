import {useRef,useState} from 'react';
import '../photoStacks.css';
import {useApp} from '../store/appStore';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {queuePhotos} from '../lib/photoInbox';
import {PhotoStack} from './PhotoStack';

export function BatchPhotoReview({photoIds,onClose,notice}:{photoIds:string[];onClose:()=>void;notice?:string}){
 const {state,update}=useApp();const root=useRef<HTMLDivElement>(null);
 useFocusTrap(root,finish);
 const photos=photoIds.flatMap(id=>{const p=state.archive.find(p=>p.id===id);return p?[p]:[];});
 const [index,setIndex]=useState(0),[grid,setGrid]=useState(false),[bookId,setBookId]=useState(state.activeBookId??state.books[0]?.id??'');
 const [choices,setChoices]=useState<Record<string,string>>({}),[history,setHistory]=useState<Record<string,string>[]>([]);
 const current=photos[Math.min(index,photos.length-1)];
 const choose=(ids:string[],destination:string)=>{setHistory(old=>[...old,choices]);setChoices(old=>({...old,...Object.fromEntries(ids.map(id=>[id,destination]))}));};
 function finish(){update(s=>({...s,books:s.books.map(book=>{const ids=photoIds.filter(id=>choices[id]===book.id&&s.archive.some(p=>p.id===id));return ids.length?{...queuePhotos(book,ids),updatedAt:Date.now()}:book;})}));onClose();}
 return <div className="ks-import-backdrop"><section ref={root} className="ks-import-dialog ks-batch-review" role="dialog" aria-modal="true" aria-labelledby="batch-review-title">
  <header><div><p className="ks-stack-eyebrow">Fresh memories</p><h2 id="batch-review-title">Review your photographs</h2></div><button onClick={finish} aria-label="Save choices and close review">×</button></header>
  <p>Every photo is saved in your archive. Choose which ones to leave beside a scrapbook for arranging later.</p>
  {notice&&<p role="status">{notice}</p>}
  {current&&!grid&&<PhotoStack photos={photos} index={index} onIndex={setIndex}/>}
  {grid&&<div className="ks-import-grid ks-review-grid">{photos.map((p,i)=><button key={p.id} aria-pressed={!!choices[p.id]} onClick={()=>{setIndex(i);setGrid(false);}}><img src={p.src} alt={`Photograph ${i+1}`} loading="lazy"/><span>{choices[p.id]?state.books.find(b=>b.id===choices[p.id])?.title??'Archive':'In archive'}</span></button>)}</div>}
  <label>Scrapbook <select value={bookId} onChange={e=>setBookId(e.target.value)}>{state.books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
  <p className="ks-review-choice" role="status">{current&&(choices[current.id]?`Waiting for ${state.books.find(b=>b.id===choices[current.id])?.title??'a scrapbook'}`:'Kept in archive')}</p>
  <div className="ks-review-actions"><button disabled={!current||!bookId} onClick={()=>{choose([current.id],bookId);setIndex((index+1)%photos.length);}}>Add to scrapbook</button><button disabled={!current} onClick={()=>{choose([current.id],'');setIndex((index+1)%photos.length);}}>Keep in archive</button></div>
  <div className="ks-review-secondary"><button aria-pressed={grid} onClick={()=>setGrid(!grid)}>{grid?'View stack':'View all'}</button><button disabled={!history.length} onClick={()=>{setChoices(history[history.length-1]);setHistory(old=>old.slice(0,-1));}}>Undo choice</button><button disabled={!bookId||!photos.length} onClick={()=>choose(photoIds,bookId)}>Add entire batch</button></div>
  <footer><span>{Object.values(choices).filter(Boolean).length} waiting for scrapbooks</span><button onClick={finish}>Finish review</button></footer>
 </section></div>;
}

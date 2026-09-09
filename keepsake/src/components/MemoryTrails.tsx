import {useState} from 'react';
import {useApp} from '../store/appStore';
import {useNav} from '../store/nav';
import {canSee} from '../lib/permissions';
export function MemoryTrails(){const {state,activeBook,updateActiveBook,setActiveBook}=useApp();const {viewAs,isVisitor}=useNav();const [target,setTarget]=useState('');if(!activeBook)return null;
 const allowed=state.books.filter(b=>b.id!==activeBook.id&&canSee(b.visibility,viewAs,state.profile.allowFriendScrapbooks===true));const links=(activeBook.memoryLinks??[]).flatMap(id=>allowed.filter(b=>b.id===id));
 if(isVisitor&&!links.length)return null;
 return <details className="ks-memory-form ks-panel p-3 my-3"><summary>This reminds me of…</summary>{links.map(b=><div key={b.id} className="flex gap-2 my-2"><button className="ks-tool" onClick={()=>setActiveBook(b.id)}>{b.title}</button>{!isVisitor&&<button className="ks-tool" aria-label={`Remove memory link to ${b.title}`} onClick={()=>updateActiveBook(book=>({...book,memoryLinks:book.memoryLinks?.filter(id=>id!==b.id)}))}>Remove link</button>}</div>)}
 {!isVisitor&&<><label>Link another book<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose a book</option>{allowed.filter(b=>!activeBook.memoryLinks?.includes(b.id)).map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label><button className="ks-tool" disabled={!allowed.some(b=>b.id===target)||(activeBook.memoryLinks?.length??0)>=5} onClick={()=>{updateActiveBook(b=>({...b,memoryLinks:[...new Set([...(b.memoryLinks??[]),target])].slice(0,5)}));setTarget('');}}>Keep link</button><p>Up to five deliberate connections. Linked books retain their own sharing permissions.</p></>}
 </details>;
}

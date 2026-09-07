import {KeepsakeGlyph} from './KeepsakeGlyph';
import type { Page } from '../types/scrapbook';
import { photoRows } from '../lib/photoRows';
import { useApp } from '../store/appStore';
export function SpreadOverview({pages,current,disabled,onJump,onMove}:{pages:Page[];current:number;disabled:boolean;onJump:(i:number)=>void;onMove:(from:number,to:number)=>void}) {
 const {state}=useApp();
 function capacity(page:Page){
  if(page.titlePage)return 'Title page';
  let test=page;let room=0;
  for(let n=page.elements.filter(e=>e.type==='photo').length;n<6;n++){
   const next=photoRows({...test,elements:[...test.elements,{id:`preview-${n}`,type:'photo',src:'',x:50,y:50,w:34,rotation:0,z:99,frame:'polaroid'}]},state.archive);
   if(!next)break;test=next;room++;
  }
  return room?`Room for about ${room} more`:'Page full';
 }
 const count=Math.ceil(pages.length/2);
 return <section className="ks-spread-overview" aria-label="Page overview"><p className="ks-handnote">Find a little memory.</p><p>Jump to a spread, or move it with the arrows. Space estimates use square prints and protect your writing.</p>
  {Array.from({length:count},(_,i)=><article key={pages[i*2].id} aria-current={current===i?'page':undefined}>
   <button disabled={disabled} className="ks-spread-preview" aria-label={`Open spread ${i+1}`} onClick={e=>{onJump(i);const menu=e.currentTarget.closest("details");if(menu)menu.open=false;}}>
    {pages.slice(i*2,i*2+2).map((page,j)=><span className="ks-page-mini" key={page.id}>{page.titlePage && <span className="ks-mini-title">{state.books.find(b=>b.pages.some(p=>p.id===page.id))?.title}</span>}{page.elements.map(el=><span key={el.id} style={{position:'absolute',left:`${el.x}%`,top:`${el.y}%`,width:`${el.w}%`,transform:`translate(-50%,-50%) rotate(${el.rotation}deg)`,zIndex:el.z}}>{el.type==='photo'?<img src={el.src} alt=""/>:el.type==='caption'?<span style={{color:el.color,fontSize:4}}>{el.text}</span>:el.type==='sticker'?<KeepsakeGlyph glyph={el.glyph}/>:null}</span>)}<small>{i*2+j+1}</small></span>)}
   </button>
   <strong>Spread {i+1}</strong><div className="ks-spread-capacity">{pages.slice(i*2,i*2+2).map((p,j)=><span key={p.id}>{j?'Right':'Left'}: {capacity(p)}</span>)}</div>
   <div><button disabled={disabled||i===0} aria-label={`Move spread ${i+1} earlier`} onClick={()=>onMove(i,i-1)}>← Earlier</button><button disabled={disabled||i===count-1} aria-label={`Move spread ${i+1} later`} onClick={()=>onMove(i,i+1)}>Later →</button></div>
  </article>)}
 </section>;
}

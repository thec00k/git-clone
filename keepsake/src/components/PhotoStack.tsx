import {useRef,useState} from 'react';
import type {ArchivePhoto} from '../types/app';

/** Only three images mount, regardless of the size of the batch. */
export function PhotoStack({photos,index,onIndex}:{photos:ArchivePhoto[];index:number;onIndex:(index:number)=>void}){
 const start=useRef<{x:number;y:number}|null>(null);
 const [drag,setDrag]=useState(0);
 const current=Math.min(index,Math.max(0,photos.length-1));
 const step=(n:number)=>onIndex((current+n+photos.length)%photos.length);
 return <div className="ks-photo-stack-browser" onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();step(e.key==='ArrowRight'?1:-1);}}}>
  <div className="ks-photo-stack" tabIndex={0} role="group" aria-label="Photo stack. Use left and right arrow keys to browse."
   onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;start.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>{if(start.current)setDrag(e.clientX-start.current.x);}}
   onPointerCancel={()=>{start.current=null;setDrag(0);}}
   onPointerUp={e=>{const origin=start.current;start.current=null;setDrag(0);if(origin&&Math.abs(e.clientX-origin.x)>65&&Math.abs(e.clientX-origin.x)>Math.abs(e.clientY-origin.y))step(e.clientX>origin.x?1:-1);}}>
   {photos.slice(current,current+3).reverse().map((p,i,visible)=>{const depth=visible.length-1-i;return <div key={p.id} className="ks-photo-stack-card" aria-hidden={depth>0} style={{transform:`translate(${depth?depth*7:drag}px,${depth*-5}px) rotate(${depth*4-2}deg)`,zIndex:3-depth}}><img src={p.src} alt={depth?'':`Photograph ${current+1} of ${photos.length}`} draggable={false}/></div>;})}
  </div>
  <div className="ks-photo-stack-nav"><button type="button" disabled={photos.length<2} aria-label="Previous photograph" onClick={()=>step(-1)}>←</button><span role="status" aria-live="polite">{current+1} / {photos.length}</span><button type="button" disabled={photos.length<2} aria-label="Next photograph" onClick={()=>step(1)}>→</button></div>
 </div>;
}

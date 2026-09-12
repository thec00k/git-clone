import {useEffect,useRef,useState} from 'react';
import {usePhysicalPageTurn} from '../store/pageTurn';
import {snapshotPage} from '../lib/pageSnapshot';
import type {CardBinder} from '../lib/cardBinders';
export function BinderPageTurn({binder,from,to,onDone}:{binder:CardBinder;from:number;to:number;onDone:()=>void}){
 const physical=usePhysicalPageTurn();const front=useRef<HTMLDivElement>(null),back=useRef<HTMLDivElement>(null);const done=useRef(onDone);done.current=onDone;const [ready,setReady]=useState(false);
 const next=to>from;const frontPage=from*2+(next?1:0),backPage=to*2+(next?0:1);
 useEffect(()=>{
  if(!physical||!front.current||!back.current){done.current();return;}
  let live=true;const abort=new AbortController();
  Promise.all([snapshotPage(front.current,abort.signal),snapshotPage(back.current,abort.signal)]).then(([f,b])=>{if(live){physical.start({direction:next?'next':'prev',front:f,back:b,done:()=>done.current()});setReady(true);}}).catch(()=>{if(live)done.current();});
  return()=>{live=false;abort.abort();physical.cancel();};
 },[physical,next]);
 const page=(index:number,ref:typeof front)=><div ref={ref} className="ks-pocket-page ks-binder-capture-page" style={{backgroundColor:binder.color}}>{Array.from({length:9},(_,i)=>{const c=binder.cards[index*9+i];return <div className="ks-card-pocket" key={i}>{c?.src?<img src={c.src} alt=""/>:<span>{c?.modelSrc?c.title:index*9+i+1}</span>}</div>;})}</div>;
 return <><div className="ks-page-capture" data-binder-turn={ready?'physical':'preparing'} aria-hidden="true" inert>{page(frontPage,front)}{page(backPage,back)}</div>{!ready&&<div className="ks-binder-turn-waiting" style={{left:next?'50%':0}} aria-hidden="true">Preparing page…</div>}</>;
}

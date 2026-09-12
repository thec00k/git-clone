import {TimeCapsule} from './TimeCapsule';
import {useEffect,useRef,useState} from 'react';
import {KeepsakeGlyph} from './KeepsakeGlyph';
import {PaperDecoration} from './StationeryArt';
import {Mail,X,BookOpen} from 'lucide-react';
import {useApp} from '../store/appStore';
import {useNav} from '../store/nav';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {activeDiscovery,discoveryState,nextDiscovery,discover,keepDiscovery,PLACES,REWARDS} from '../lib/discoveries';
import {uid} from '../lib/id';
import {playPageTurn} from '../lib/audio';
import type {PageElement} from '../types/scrapbook';

export function DiscoverySystem(){
 const {state,update}=useApp();const {isVisitor,touring,view,discoveryOpen,setDiscoveryOpen,printerOpen}=useNav();
 const current=useRef(state);current.current=state;
 useEffect(()=>{
  if(isVisitor||touring||view!=='room'||printerOpen||discoveryOpen)return;
  const visitStartedAt=Date.now();
  const check=()=>{
   if(document.hidden||document.querySelector('[aria-modal="true"]'))return;
   const s=current.current;const d=discoveryState(s);const now=Date.now();
   if(d.lastVisitAt!==undefined&&now-d.lastVisitAt<30*60000)return;
   if(d.frequency==='off'||!s.progress.completedTour||activeDiscovery(s))return;
   update(prev=>{
    const letter=nextDiscovery(prev,now,Math.random,visitStartedAt);const prior=discoveryState(prev);
    return {...prev,discoveries:{...prior,lastVisitAt:now,entries:letter?[...prior.entries,letter]:prior.entries}};
   });
  };
  const delay=window.setTimeout(check,12000);const interval=window.setInterval(check,60000);
  return()=>{clearTimeout(delay);clearInterval(interval);};
 },[isVisitor,touring,view,printerOpen,discoveryOpen,update,state.progress.completedTour]);
 if(isVisitor||!discoveryOpen)return null;
 if(discoveryOpen==='capsule')return <TimeCapsule onClose={()=>setDiscoveryOpen(null)}/>;
 return <Correspondence key={discoveryOpen} id={discoveryOpen} onClose={()=>setDiscoveryOpen(null)}/>;
}

export function DiscoveryPreferences(){
 const {state,update}=useApp();const d=discoveryState(state);
 return <fieldset className="ks-discovery-settings"><legend>Little discoveries</legend><label>How often<select aria-label="Discovery frequency" value={d.frequency} onChange={e=>update(s=>({...s,discoveries:{...discoveryState(s),frequency:e.target.value as typeof d.frequency}}))}><option value="occasional">Occasional · a few hours apart</option><option value="quiet">Quiet · at least a day apart</option><option value="off">Off</option></select></label><label><input type="checkbox" checked={d.hints} onChange={e=>update(s=>({...s,discoveries:{...discoveryState(s),hints:e.target.checked}}))}/> Show gentle location hints</label><label><input type="checkbox" checked={d.guestNotesOnDesk!==false} onChange={e=>update(s=>({...s,discoveries:{...discoveryState(s),guestNotesOnDesk:e.target.checked}}))}/> Allow guest notes on the desk</label><small>When disabled, guest messages wait in the guestbook instead.</small><small>Unread letters stay where they are. Turning discoveries off hides them safely until you return.</small></fieldset>;
}

function Correspondence({id,onClose}:{id:string;onClose:()=>void}){
 const {state,update,activeBook,setActiveBook}=useApp();const {setDiscoveryOpen,setBookPageId,go}=useNav();
 const panel=useRef<HTMLDivElement>(null);useFocusTrap(panel,onClose);
 const [bookId,setBookId]=useState(activeBook?.id??state.books[0]?.id??'');
 const d=discoveryState(state);const letter=d.entries.find(e=>e.id===id);const active=activeDiscovery(state);
 const [message,setMessage]=useState('');
 useEffect(()=>{if(!letter)return;update(s=>discover(s,id,Date.now(),true));playPageTurn(state.environment.ambienceVolume);},[id,update]);
 function putInBook(){
  if(!letter||!state.books.some(b=>b.id===bookId))return;
  const pageId=uid('page');const now=Date.now();
  const elements:PageElement[]=[{id:uid('house'),type:'caption',x:50,y:22,w:80,rotation:0,z:1,text:letter.title,fontSize:7,color:'#453e2f'},{id:uid('house'),type:'caption',x:50,y:52,w:78,rotation:0,z:2,text:letter.text+'\n— '+(letter.author??'the house'),fontSize:5,color:'#514737'}];
  if(letter.reward)elements.push({id:uid('el'),type:'sticker',x:50,y:80,w:15,rotation:-5,z:3,glyph:REWARDS[letter.reward]?.glyph??'✦'});
  update(s=>{
   const next=keepDiscovery(s,id,now);const ds=discoveryState(next);
   return {...next,discoveries:{...ds,entries:ds.entries.map(e=>e.id===id?{...e,bookId,pageId}:e)},books:next.books.map(b=>b.id===bookId?{...b,updatedAt:now,pages:[...b.pages,...(b.pages.length%2?[{id:uid('page'),elements:[]}]:[]),{id:pageId,backgroundStyle:state.environment.roomTheme==='beachfront'?'tide':'field',elements},{id:uid('page'),elements:[]}]}:b)};
  });
  setActiveBook(bookId);setBookPageId(pageId);onClose();go('book');
 }
 return <div className="ks-correspondence-overlay" onClick={onClose}><div ref={panel} className="ks-correspondence" role="dialog" aria-modal="true" aria-label={letter?`A letter from ${letter.author??'the house'}`:'Correspondence'} onClick={e=>e.stopPropagation()}>
  <header><Mail size={20}/><h2>{letter?letter.title:'Correspondence'}</h2><button onClick={onClose} aria-label="Close correspondence"><X size={20}/></button></header>
  {letter?<>
   <article className="ks-found-letter"><PaperDecoration style={state.environment.roomTheme==='beachfront'?'tide':'field'}/><small>{letter.author?`From ${letter.author}`:letter.story??'A little something from the house'}{letter.reward?' · keepsake':''}</small>{letter.reward&&<div className="ks-reward-object" aria-label={letter.title}><KeepsakeGlyph glyph={REWARDS[letter.reward]?.glyph??'✦'}/></div>}<p>{letter.text}</p><cite>— {letter.author??'the house'}</cite></article>
   <small>Found {new Date(letter.foundAt??letter.appearedAt).toLocaleDateString()} · {PLACES.find(p=>p.id===(letter.guestEntryId&&d.guestNotesOnDesk===false?'guestbook':letter.location))?.label}</small>
   <label className="ks-correspondence-destination">Scrapbook<select aria-label="Letter destination scrapbook" value={bookId} onChange={e=>setBookId(e.target.value)}>{state.books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
   <footer><button disabled={!bookId} onClick={putInBook}><BookOpen size={16}/> Keep in scrapbook</button><button onClick={()=>{update(s=>keepDiscovery(s,id,Date.now()));setDiscoveryOpen('collection');}}>Save in correspondence</button><button onClick={onClose}>{letter.keptAt?'Close letter':'Leave here'}</button></footer>
   <small>Keeping it in a scrapbook adds a fresh spread, leaving existing pages untouched.</small>
  </>:<>
   <p>A place for letters and little things you have found. Nothing here expires.</p><DiscoveryPreferences/>
   {active&&d.frequency!=='off'&&<section className="ks-correspondence-awaiting"><p>{active.foundAt?'A letter you found is still in the room.':'There is a little something waiting in the room.'}</p>{d.hints&&<p>{PLACES.find(p=>p.id===(active.guestEntryId&&d.guestNotesOnDesk===false?'guestbook':active.location))?.hint}</p>}<button onClick={()=>setMessage(PLACES.find(p=>p.id===active.location)?.hint??'')}>Give me a hint</button> <button onClick={()=>setDiscoveryOpen(active.id)}>Find and read the waiting letter</button><p role="status">{message}</p></section>}
   <div className="ks-correspondence-list">{d.entries.filter(e=>e.keptAt).map(e=><button key={e.id} onClick={()=>setDiscoveryOpen(e.id)}><span><KeepsakeGlyph glyph={e.reward?REWARDS[e.reward]?.glyph:'✉'}/> {e.title}</span><small>{e.author?`From ${e.author}`:e.story??'From the house'} · {new Date(e.keptAt!).toLocaleDateString()}</small></button>)}{!d.entries.some(e=>e.keptAt)&&<p>Your saved letters will live here.</p>}</div>
   {[...new Set(d.entries.filter(e=>e.story).map(e=>e.story))].map(story=><p key={story}>{story} · {d.entries.filter(e=>e.story===story&&e.readAt).length}/3 letters read</p>)}
  </>}
 </div></div>;
}


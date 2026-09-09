import { useEffect, useRef, useState } from "react";
import { X, Printer, MapPin, BookOpen, Upload } from "lucide-react";
import { useApp } from "../store/appStore";
import { useNav } from "../store/nav";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { loadImageFile } from "../lib/image";
import { uid } from "../lib/id";
import { photoRows } from "../lib/photoRows";
import type { PhotoElement } from "../types/scrapbook";
import { playPageTurn } from '../lib/audio';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {MOTION} from '../lib/motion';
export function PhotoPrinter({onClose}:{onClose:()=>void}) {
 const {state, activeBook, addArchivePhoto, update, setActiveBook} = useApp();
 const {go,setPendingPrint,setBookPageId} = useNav();
 const ref=useRef<HTMLDivElement>(null); const input=useRef<HTMLInputElement>(null);
 useFocusTrap(ref,onClose);
 const [photo,setPhoto]=useState<{src:string;photoId?:string;aspect:number}|null>(null);
 const [printed,setPrinted]=useState(false);
 const [printing,setPrinting]=useState(false); const reduced=useReducedMotion();
 useEffect(()=>{if(!printing || !photo)return;playPageTurn(state.environment.ambienceVolume);const timer=window.setTimeout(()=>{update(s=>({...s,latestPrint:{src:photo.src,photoId:photo.photoId,printedAt:Date.now()}}));setPrinted(true);setPrinting(false);},reduced?0:MOTION.printMs);return()=>window.clearTimeout(timer);},[printing,photo,reduced,update,state.environment.ambienceVolume]);
 const [bookId,setBookId]=useState(activeBook?.id ?? state.books[0]?.id ?? "");
 const [pageId,setPageId]=useState("new");
 const [error,setError]=useState("");
 const book=state.books.find(b=>b.id===bookId);
 async function upload(file?:File) {
  if(!file)return;
  try { const image=await loadImageFile(file,state.profile.preserveOriginals!==false);const id=addArchivePhoto(image.src,image.aspect,[],image.original);setPhoto({src:image.src,aspect:image.aspect,photoId:id});setPrinted(false);setError(""); }
  catch {setError("That photo could not be opened. Try another image.");}
 }
 function placeInBook() {
  if(!photo || !book)return;
  const id=pageId==="new"?uid("page"):pageId;
  const page=book.pages.find(p=>p.id===id) ?? {id,elements:[]};
  if(page.elements.filter(e=>e.type==="photo").length>=6){setError("This page is full. Choose another page or a fresh spread.");return;}
  const el:PhotoElement={id:uid("el"),type:"photo",src:photo.src,photoId:photo.photoId,x:50,y:40,w:38,rotation:0,z:Math.max(0,...page.elements.map(e=>e.z))+1,frame:"polaroid"};
  const placed=photoRows({...page,elements:[...page.elements,el]},state.archive);
  if(!placed){setError("There is not enough clear space here. Choose a fresh spread to keep your writing uncovered.");return;}
  update(s=>({...s,books:s.books.map(b=>b.id===bookId?{...b,updatedAt:Date.now(),pages:pageId==="new"?[...b.pages,...(b.pages.length%2?[{id:uid("page"),elements:[]}]:[]),placed,{id:uid("page"),elements:[]}]:b.pages.map(p=>p.id===id?placed:p)}:b)}));
  update(s=>({...s,progress:{...s.progress,printedToBook:true}}));
  setActiveBook(bookId);setBookPageId(id);onClose();go("book");
 }
 return <div className="ks-photo-printer-overlay" onClick={onClose}>
  <div ref={ref} className="ks-photo-printer-dialog" role="dialog" aria-modal="true" aria-label="Mini photo printer" onClick={e=>e.stopPropagation()}>
   <header><div><small>A LITTLE MEMORY, MADE TANGIBLE</small><h2>Mini photo printer</h2></div><button aria-label="Close photo printer" onClick={onClose}><X size={20}/></button></header>
   {printing ? <div className="ks-printing" role="status"><div className="ks-printer-body">KEEPSAKE</div><div className="ks-print-slot"><div className="ks-emerging-photo"><img src={photo!.src} alt="Your photograph emerging from the printer"/></div></div><p>Making a little memory…</p></div> : !printed ? <>
    <p>Choose a photograph to make an instant-style print for your scrapbook or memory map.</p>
    <div className="ks-print-picker" role="group" aria-label="Photographs to print">{state.archive.map((a,i)=><button key={a.id} aria-label={`Choose photograph ${i+1}`} aria-pressed={photo?.photoId===a.id} onClick={()=>{setPhoto({src:a.src,photoId:a.id,aspect:a.aspect});setError("");}}><img src={a.src} alt="" /></button>)}</div>
    <input ref={input} type="file" accept="image/*" hidden onChange={e=>{void upload(e.target.files?.[0]);e.target.value="";}} />
    <footer><button onClick={()=>input.current?.click()}><Upload size={16}/> Upload photo</button><button className="is-primary" disabled={!photo} onClick={()=>setPrinting(true)}><Printer size={16}/> Make print</button></footer>
   </> : <>
    <div className="ks-ready-print"><img src={photo!.src} alt="Your instant-style photo print"/><span>one small memory</span></div>
    <p role="status">Your print is ready. Where would you like to keep it?</p>
    <div className="ks-print-destination">
     <label>Scrapbook<select aria-label="Destination scrapbook" value={bookId} onChange={e=>{setBookId(e.target.value);setPageId("new");setError("");}}>{state.books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
     <label>Page<select aria-label="Destination page" value={pageId} onChange={e=>{setPageId(e.target.value);setError("");}}><option value="new">A fresh spread</option>{book?.pages.map((p,i)=><option key={p.id} value={p.id} disabled={p.titlePage || p.elements.filter(e=>e.type==="photo").length>=6}>Page {i+1}{p.titlePage?" · title page":` · ${p.elements.filter(e=>e.type==="photo").length}/6 photos`}</option>)}</select></label>
    </div>
    <footer><button className="is-primary" disabled={!book} onClick={placeInBook}><BookOpen size={16}/> Put in scrapbook</button><button onClick={()=>{setPendingPrint({src:photo!.src,photoId:photo!.photoId});onClose();go("atlas");}}><MapPin size={16}/> Take to map</button></footer>
    <button className="ks-print-again" onClick={()=>setPrinted(false)}>Choose a different photo</button>
   </>}
   {error && <p role="alert">{error}</p>}
  </div>
 </div>;
}

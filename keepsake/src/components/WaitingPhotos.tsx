import {useState} from 'react';
import {PhotoStack} from './PhotoStack';
import type {ArchivePhoto} from '../types/app';

export function WaitingPhotos({photos,onPlace,onReturn,disabled}:{photos:ArchivePhoto[];onPlace:(photo:ArchivePhoto)=>void;onReturn:(id:string)=>void;disabled:boolean}){
 const [index,setIndex]=useState(0),[open,setOpen]=useState(()=>window.innerWidth>600);
 if(!photos.length)return null;
 const photo=photos[Math.min(index,photos.length-1)];
 return <aside className={`ks-photo-inbox${open?'':' is-folded'}`} aria-label="Photos waiting for this scrapbook" onKeyDown={e=>e.stopPropagation()}>
  <button className="ks-inbox-heading" aria-expanded={open} onClick={()=>setOpen(!open)}>New photographs · {photos.length} <span>{open?'−':'+'}</span></button>
  {open&&<><PhotoStack photos={photos} index={Math.min(index,photos.length-1)} onIndex={setIndex}/><button disabled={disabled} onClick={()=>onPlace(photo)}>Place on selected page</button><button onClick={()=>onReturn(photo.id)}>Keep in archive</button><p>{disabled?'Select a page with space, or add a spread.':'Place a photo, then move and resize it on the page.'}</p></>}
 </aside>;
}

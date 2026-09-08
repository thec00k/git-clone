import {useState} from 'react';
import {useApp} from '../store/appStore';
import {KEEPSAKE_PRINTS} from '../lib/stationery';
export function KeepsakePrints(){
  const {state,addArchivePhoto}=useApp();const [message,setMessage]=useState('');
  return <section className="ks-print-collection"><h3>From the Keepsake print drawer</h3><p>Original illustrated papers, included with your room. Add one to your files, then use it in a scrapbook or print it for the map.</p><div>{KEEPSAKE_PRINTS.map(print=>{const saved=state.archive.some(photo=>photo.src===print.src);return <button key={print.src} className="ks-furniture-card" disabled={saved} onClick={()=>{addArchivePhoto(print.src,.75,['Keepsake prints']);setMessage(`${print.title} is in your files.`);}}><img src={print.src} alt={print.title} loading="lazy"/><strong>{print.title}</strong><small>{saved?'In your files':'Add to files · included'}</small></button>;})}</div>{message&&<p role="status">{message}</p>}</section>;
}

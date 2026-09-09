import {useState} from 'react';
import {useApp} from '../store/appStore';
export function TicketCompanion(){
 const {state,update,addArchiveTab,addArchivePhoto}=useApp();const [title,setTitle]=useState(''),[venue,setVenue]=useState(''),[date,setDate]=useState(''),[style,setStyle]=useState('woodland'),[preview,setPreview]=useState<string|null>(null),[status,setStatus]=useState('');
 function draw(){const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=480;const c=canvas.getContext('2d');if(!c)return;
  c.fillStyle=style==='woodland'?'#ece3cd':'#e8f0ee';c.fillRect(0,0,1200,480);c.strokeStyle=style==='woodland'?'#435441':'#37656e';c.lineWidth=5;c.strokeRect(20,20,1160,440);c.fillStyle=c.strokeStyle;c.font='22px Georgia';c.fillText('KEEPSAKE • COMMEMORATIVE STUB',55,70);
  c.font='bold 46px Georgia';c.fillText(title.trim(),55,165,1040);c.font='30px Georgia';c.fillText(venue.trim(),55,225,1040);c.fillText(date||'A day worth keeping',55,285,1040);c.font='20px Georgia';c.fillText('Keepsake recreation · not valid for admission',55,410);setPreview(canvas.toDataURL('image/png'));setStatus('');}
 return <details className="ks-memory-form ks-panel p-4 my-4"><summary>Make a commemorative ticket</summary><p>Create a memory of an event. This template does not reproduce a valid ticket or use AI.</p>
 <label className="block my-2">Event<input className="block w-full" maxLength={70} value={title} onChange={e=>{setTitle(e.target.value);setPreview(null);}}/></label>
 <label className="block my-2">Venue<input className="block w-full" maxLength={90} value={venue} onChange={e=>{setVenue(e.target.value);setPreview(null);}}/></label>
 <label className="block my-2">Date<input className="block" type="date" value={date} onChange={e=>{setDate(e.target.value);setPreview(null);}}/></label>
 <label>Paper<select value={style} onChange={e=>{setStyle(e.target.value);setPreview(null);}}><option value="woodland">Woodland cream</option><option value="coastal">Coastal blue</option></select></label>
 <button className="ks-tool m-2" disabled={!title.trim()} onClick={draw}>Preview ticket</button>
 {preview&&<><img src={preview} alt={`Commemorative ticket for ${title}`} className="w-full max-w-xl my-3"/><button className="ks-tool" onClick={()=>{const category=state.archiveTabs.find(t=>t.name==='Keepsake recreations')?.id??addArchiveTab('Keepsake recreations');const id=addArchivePhoto(preview,2.5,[category]);update(s=>({...s,archive:s.archive.map(p=>p.id===id?{...p,ticket:{event:title.trim(),venue:venue.trim(),date,style,provenance:'commemorative-template'}}:p)}));setPreview(null);setStatus('Saved in your files. Add it to a scrapbook using the filing cabinet photo chooser.');}}>Keep in filing cabinet</button></>}
 <p role="status">{status}</p></details>;
}

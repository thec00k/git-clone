import {useState} from 'react';
import {useApp} from '../store/appStore';
import {foundPhotos} from '../lib/photoActivity';
export function FoundPhotos(){const {state,update}=useApp();const [opened,setOpened]=useState<string[]>([]);const candidates=foundPhotos(state);const ids=opened.length?opened:candidates.map(p=>p.id);if(!ids.length)return null;
 const photos=state.archive.filter(p=>ids.includes(p.id));
 return <section className="ks-panel p-4 my-4"><h3>A few photographs waiting in the files</h3><p>No hurry—these uploads haven’t been used yet.</p>{!opened.length?<button className="ks-tool" onClick={()=>{setOpened(ids);update(s=>({...s,profile:{...s.profile,lastFoundPhotosAt:Date.now()},archive:s.archive.map(p=>ids.includes(p.id)?{...p,activity:{...p.activity,dismissed:true}}:p)}));}}>Open found photographs envelope</button>:<><div className="flex gap-3 my-3">{photos.map(p=><img key={p.id} src={p.src} alt="Rediscovered photograph" className="w-24 h-24 object-contain"/>)}</div><p>These photographs remain in your files below. Opening the envelope retires them from rediscovery.</p><button className="ks-tool" onClick={()=>setOpened([])}>Put envelope away</button></>}</section>;
}

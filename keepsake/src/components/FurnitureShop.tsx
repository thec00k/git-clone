import {useState} from 'react';
import {useApp} from '../store/appStore';
import {FURNITURE_CATEGORIES,FURNITURE_ITEMS,type FurnitureCategory,type FurnitureId} from '../lib/furniture';
import {loadFurniture} from './room3d/furnitureAssetCache';

export function FurnitureShop(){
  const {environment,update}=useApp();
  const room=environment.roomTheme??'woodland';
  const [category,setCategory]=useState<FurnitureCategory>('desk');
  const [preview,setPreview]=useState<FurnitureId|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const selected=environment.furniture?.[room]?.[category];
  const item=FURNITURE_ITEMS.find(item=>item.id===preview);
  const apply=async(id:FurnitureId|null)=>{
    if(busy)return;setBusy(true);setMessage('');
    try{
      if(id)await loadFurniture(id);
      update(current=>{
        const choices={...current.environment.furniture?.[room]};
        if(id)choices[category]=id;else delete choices[category];
        return {...current,environment:{...current.environment,furniture:{...current.environment.furniture,[room]:choices}}};
      });
      setPreview(null);setMessage('Placed in your room. Your books and photographs stay with you.');
    }catch{setMessage('That item could not load. Your current furniture is still in place.');}
    finally{setBusy(false);}
  };
  return <section className="ks-furniture-shop" aria-label="Room furnishings">
    <p>Choose a piece for this room. The first collection is included.</p>
    <label>Furniture <select aria-label="Furniture category" value={category} disabled={busy} onChange={e=>{setCategory(e.target.value as FurnitureCategory);setPreview(null);setMessage('');}}>{Object.entries(FURNITURE_CATEGORIES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <div className="ks-furniture-grid">
      <button className="ks-furniture-card" disabled={busy} aria-pressed={!selected} onClick={()=>apply(null)}><span className="ks-furniture-original">Room original</span><strong>Original piece</strong><small>{!selected?'In your room':'Restore the original'}</small></button>
      {FURNITURE_ITEMS.filter(item=>item.category===category).map(item=><button key={item.id} className="ks-furniture-card" disabled={busy} aria-pressed={selected===item.id} onClick={()=>setPreview(item.id)}><img src={item.thumbnail} alt="" loading="lazy"/><strong>{item.title}</strong><small>{selected===item.id?'In your room':'Preview · included'}</small></button>)}
    </div>
    {item&&<div className="ks-furniture-preview"><img src={item.thumbnail} alt={item.title}/><div><h3>{item.title}</h3><p>Fits the existing room layout.</p><button className="ks-tool" disabled={busy} onClick={()=>setPreview(null)}>Cancel</button><button className="ks-tool ks-tool--accent" disabled={busy} onClick={()=>apply(item.id)}>{busy?'Preparing…':'Place in room'}</button></div></div>}
    {message&&<p role="status">{message}</p>}
  </section>;
}

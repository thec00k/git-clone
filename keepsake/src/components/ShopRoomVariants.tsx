import {useRef, useState, useEffect} from 'react';
import {useApp} from '../store/appStore';
import {useNav} from '../store/nav';
import {switchRoomTheme,ownsRoomTheme,type RoomThemeId} from '../lib/roomThemes';
import {roomThemes} from './room3d/themes';
const descriptions={woodland:'Moss-painted wood, layered forest views and warm lamplight.',beachfront:'An arched window, pale plaster, sea-glass details and a quiet ocean view.'};
export function ShopRoomVariants(){
 const {state,environment,flushSave}=useApp();const {isVisitor}=useNav();
 const [preview,setPreview]=useState<RoomThemeId|null>(null);const [loading,setLoading]=useState(false);const [note,setNote]=useState('');
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const current=environment.roomTheme??'woodland';
 const choose=async()=>{if(!preview||isVisitor)return;setLoading(true);setNote('Opening the windows…');
  try{const {loadRoomAsset}=await import('./room3d/roomAssetCache');await loadRoomAsset(roomThemes[preview].asset);if(!alive.current)return;
    const saved=await flushSave(s=>switchRoomTheme(s,preview));
    if(alive.current)setNote(saved?'Your room is ready. Close the drawer to look around.':'The room changed, but saving failed. Please retry before leaving.');
  }catch{if(alive.current)setNote('That room could not load. Your current room is still here. Please try again.');}
  finally{if(alive.current)setLoading(false);}
 };
 return <><p className="mb-3 text-sm text-paper/65">A change of scenery. Your books and memories come with you. Rooms are included during this prototype.</p><ul className="ks-sticker-shop-list">{(['woodland','beachfront'] as const).map(id=><li key={id} className="ks-sticker-pack"><div className="flex-1"><p className="font-display">{roomThemes[id].title}</p><small>{descriptions[id]}</small></div><button className="ks-tool" disabled={loading||isVisitor} onClick={()=>{setPreview(id);setNote('');}}>{current===id?'View current room':`Preview ${roomThemes[id].title}`}</button></li>)}</ul>
 {preview&&<section className="mt-4 p-3 border border-paper/20 rounded-lg" aria-label={`${roomThemes[preview].title} preview`}>
   <img className="w-full rounded-md mb-3" src={`/room/${preview}/preview.svg`} alt={`${roomThemes[preview].title} illustrated style preview`} onError={e=>{e.currentTarget.hidden=true;}}/>
   {preview==="beachfront"&&<p className="text-sm mb-2">Includes the exclusive Coastal Blue CRT screen color. {ownsRoomTheme(state,"beachfront")?"Owned":"Unlocked when you make Beachfront your room."}</p>}
   <h3 className="font-display text-lg">{roomThemes[preview].title}</h3><p className="text-sm my-2">{descriptions[preview]} Furniture keeps the familiar scrapbook, archive and music controls.</p>
   <button className="ks-tool ks-tool--accent" disabled={loading||current===preview||isVisitor} onClick={()=>void choose()}>{loading?'Loading room…':current===preview?'Your current room':'Make this my room'}</button>
 </section>}
 <p role="status" className="my-3 text-sm">{note}</p><p className="ks-handnote mt-4">Further along the coast…</p><ul className="ks-sticker-shop-list">{[['Cyberpunk Cityscape','Rainy neon streets and a cozy city hideaway'],['Snowy Mountain','A warm cabin above a snowy valley'],['Stormy Lighthouse Room','Stormy seas, rain-streaked glass and warm lantern light']].map(([name,description])=><li key={name} className="ks-sticker-pack"><div className="flex-1"><p className="font-display">{name}</p><small>{description}</small></div><span className="ks-sticker-owned">Coming later</span></li>)}</ul></>;
}

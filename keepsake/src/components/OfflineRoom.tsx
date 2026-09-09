import {useState} from 'react';
import {useApp} from '../store/appStore';
const CACHE='keepsake-offline-v2';
export function OfflineRoom(){const {state,flushSave}=useApp();const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 async function prepare(){setBusy(true);setStatus('Saving the room and preparing local files…');try{
  if(!import.meta.env.PROD)throw new Error('Offline preparation is available in the production build. The development preview needs its local server.');
  if(!await flushSave())throw new Error('Save your changes successfully before preparing offline access.');
  if(!navigator.serviceWorker.controller)throw new Error('Reload once to activate offline support, then try again.');
  const urls=new Set<string>([location.origin+'/',location.origin+'/index.html']);
  for(const entry of performance.getEntriesByType('resource')){const u=new URL(entry.name);if(u.origin===location.origin&&!u.pathname.startsWith('/api/'))urls.add(u.href);}
  for(const b of state.books)for(const p of b.pages)for(const e of p.elements)if(e.type==='photo'&&!e.src.startsWith('data:')){const u=new URL(e.src,location.origin);if(u.origin!==location.origin)throw new Error('A book contains an external image. Import a local copy before preparing offline access.');urls.add(u.href);}
  const cache=await caches.open(CACHE);for(const url of urls){const response=await fetch(url,{cache:'reload'});if(!response.ok)throw new Error('A room asset could not be downloaded. Try again while connected.');await cache.put(url,response);}
  setStatus('Current room and books prepared on this device. Spotify and SoundCloud still need a connection; synthesized ambient audio works locally. Re-prepare after changing rooms or updating the app.');
 }catch(e){setStatus(e instanceof Error?e.message:'Offline preparation failed.');}finally{setBusy(false);}}
 return <details className="my-4"><summary>Offline access on this device</summary><p>This prepares the current room and local books. It is not cloud backup or cross-device synchronization.</p><button className="ks-tool" disabled={busy} onClick={()=>void prepare()}>Prepare current room offline</button><button className="ks-tool" disabled={busy} onClick={()=>void caches.delete(CACHE).then(()=>setStatus('Prepared offline assets removed. Your locally saved books and originals remain.')).catch(()=>setStatus('Could not remove offline assets.'))}>Remove prepared assets</button><p role="status">{status}</p></details>;
}

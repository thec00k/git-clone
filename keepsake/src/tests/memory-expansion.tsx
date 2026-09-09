import {createRoot} from 'react-dom/client';
import {AppProvider,useApp} from '../store/appStore';
import {NavProvider} from '../store/nav';
import {MemoryAtmosphereSettings} from '../components/MemoryAtmosphereSettings';
import {MemoryTrails} from '../components/MemoryTrails';
import {FoundPhotos} from '../components/FoundPhotos';
import {TicketCompanion} from '../components/TicketCompanion';
import {RoomBackup} from '../components/RoomBackup';
import '../index.css';
function Test(){const {state,update,flushSave}=useApp();return <main className="p-8 max-w-3xl mx-auto"><h1>Memory feature checks</h1><button onClick={()=>update(s=>({...s,archive:[{id:'untouched',src:'/samples/forest.jpg',aspect:1,createdAt:1,categories:[],favorite:false,activity:{}}],profile:{...s.profile,lastFoundPhotosAt:0}}))}>Seed untouched photo</button><MemoryAtmosphereSettings/><MemoryTrails/><FoundPhotos/><TicketCompanion/><RoomBackup/><button onClick={()=>void flushSave()}>Save fixture</button><output data-state>{JSON.stringify(state)}</output></main>;}
if(location.port!=='5179')throw new Error('Use the isolated 5179 test server.');
createRoot(document.getElementById('root')!).render(<AppProvider><NavProvider><Test/></NavProvider></AppProvider>);

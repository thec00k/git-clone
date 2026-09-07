import {createRoot} from 'react-dom/client';
import {AppProvider,useApp} from '../store/appStore';
import {NavProvider,useNav} from '../store/nav';
import {ListenProvider} from '../store/listen';
import App from '../App';
import {discoveryState,REWARDS} from '../lib/discoveries';
import {useState} from 'react';
import {loadState} from '../lib/storage';
import '../index.css';
function Verification(){
 const {update,state,flushSave}=useApp();const {setDiscoveryOpen}=useNav();const [result,setResult]=useState('');
 return <><App/><aside style={{position:'fixed',top:70,left:12,zIndex:200,background:'#fff3cf',color:'#342e22',padding:8,fontSize:12}}><button onClick={()=>{
  update(s=>({...s,progress:{...s.progress,completedTour:true},discoveries:{...discoveryState(s),frequency:'occasional',entries:[...discoveryState(s).entries.filter(e=>e.keptAt&&e.id!=='test-reward'),{id:'test-reward',title:REWARDS['between-lines'].title,text:REWARDS['between-lines'].text,reward:'between-lines',location:'shelf',appearedAt:Date.now()}]}}));
 }}>Prepare shelf reward fixture</button><button onClick={()=>setDiscoveryOpen('collection')}>Open test correspondence</button><button onClick={async()=>{await flushSave();const saved=await loadState();setResult(JSON.stringify(saved?.discoveries)===JSON.stringify(state.discoveries)?'PASS: discoveries match IndexedDB':'FAIL');}}>Verify discovery save</button><button onClick={()=>location.reload()}>Reload verification</button><button onClick={()=>update(s=>({...s,discoveries:{...discoveryState(s),frequency:'occasional',guestNotesOnDesk:true,entries:[...discoveryState(s).entries.filter(e=>e.keptAt&&e.id!=='test-guest'),{id:'test-guest',guestEntryId:'qa-guest',author:'River',title:'A note from River',text:'Thank you for a quiet afternoon. Let’s make another page soon.',delivery:'desk',location:'desk',appearedAt:Date.now()}]}}))}>Prepare guest postcard</button><audio controls preload="metadata" src="/audio/paper-slide.mp3" aria-label="Paper slide audio verification"/><output>{result}</output></aside></>;
}
// Never mount a fixture-capable provider on the personal-room origin.
createRoot(document.getElementById('root')!).render(location.port==='5176'?<AppProvider><NavProvider><ListenProvider><Verification/></ListenProvider></NavProvider></AppProvider>:<p>Open this test only on isolated port 5176.</p>);

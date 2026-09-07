import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AppProvider,useApp} from '../store/appStore';
import {NavProvider} from '../store/nav';
import {RoomBackup} from '../components/RoomBackup';
import {serializeRoom,parseRoomBackup} from '../lib/roomBackup';
import {loadState} from '../lib/storage';
import '../index.css';
function TestRoom(){
 const {state}=useApp();const [result,setResult]=useState('');
 return <main style={{padding:32,maxWidth:800,background:'#263b31',minHeight:'100vh'}}><h1>Isolated restore verification</h1><p>Run only on port 5175. This origin has its own IndexedDB.</p>
 <button className="ks-tool" onClick={()=>{
  if(location.port!=='5175')throw Error('Use the isolated test origin.');
  const fixture=structuredClone(state);fixture.profile.displayName='Restored verification room';fixture.books[0].title='Restored woodland memories';fixture.environment.timeMode='night';fixture.environment.roomQuality='high';fixture.pins[0].caption='Restored pin caption';
  const text=serializeRoom(fixture);sessionStorage.setItem('expected-room',text);
  const files=new DataTransfer();files.items.add(new File([text],'verification-room.json',{type:'application/json'}));const input=document.querySelector<HTMLInputElement>('input[type=file]')!;input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 }}>Load fixture into backup file input</button>
 <RoomBackup/>
 <button className="ks-tool" onClick={async()=>{const stored=await loadState();const expected=parseRoomBackup(sessionStorage.getItem('expected-room')!);const fields=Object.keys(expected) as (keyof typeof expected)[];setResult(fields.every(k=>JSON.stringify(stored?.[k])===JSON.stringify(expected[k])&&JSON.stringify(state[k])===JSON.stringify(expected[k]))?'PASS: rendered room and IndexedDB match the backup':'FAIL: mismatch');}}>Verify restored data</button>
 <button className="ks-tool" onClick={()=>location.reload()}>Reload test room</button>
 <p role="status">{result}</p><p>Room name: {state.profile.displayName}</p><p>Book: {state.books[0]?.title}</p><p>Time: {state.environment.timeMode}</p><p>Photos: {state.archive.length} · Pins: {state.pins.length}</p>
 </main>;
}
createRoot(document.getElementById('root')!).render(<AppProvider><NavProvider><TestRoom/></NavProvider></AppProvider>);

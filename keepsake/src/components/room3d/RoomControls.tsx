
import {useEffect,useRef,useState} from 'react';
import {Archive,Armchair,BookOpen,ChevronDown,Lamp,Lightbulb,Music2,Printer,Library,Home,MapPinned,Settings2, X} from 'lucide-react';
import type {Environment} from '../../types/app';
import type {RoomFace} from '../../lib/roomLayout';
import {useActiveRoom} from './useActiveRoom';
import {useNav} from '../../store/nav';
import {useApp} from '../../store/appStore';
import {useWorkbench} from '../../store/workbench';
export function RoomControls({seated,environment,onBook,onFiles,onSeat,onLamp,onCeiling,onLook,onDrawer,onMusic,onReading,onLibrary,onDoor,onDisplayCase,onCardBinders,onSettings}:{
 seated:boolean;environment:Environment;onBook:()=>void;onFiles:()=>void;onSeat:()=>void;onLamp:()=>void;onCeiling:()=>void;onLook:(face:RoomFace)=>void;onDrawer:()=>void;onMusic:()=>void;onReading:()=>void;onLibrary:()=>void;onDoor:()=>void;onDisplayCase:()=>void;onCardBinders:()=>void;onSettings:()=>void;
}) {

 const room=useActiveRoom();const {setEnvironment}=useApp();const {binderId}=useWorkbench();
 const {setPrinterOpen,isVisitor,setDiscoveryOpen}=useNav();
 const menu=useRef<HTMLDetailsElement>(null);const [section,setSection]=useState('Places');
 const close=()=>{if(menu.current){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(menu.current?.open&&!menu.current.contains(e.target as Node))menu.current.open=false;};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 const action=(fn:()=>void)=>()=>{close();fn();};
 return <>

  <div className="ks-room-name"><span>YOUR QUIET CORNER</span><h2>{room.title}</h2></div>
  <nav className="ks-room-controls" aria-label="Room actions">
   <button className="ks-room-primary" onClick={onBook}><BookOpen size={17}/>{binderId?'Open binder':'Open scrapbook'}</button>
   <button onClick={onFiles}><Archive size={17}/>Files</button>
   <button onClick={onSeat}><Armchair size={17}/>{seated?'Stand up':'Take a seat'}</button>
   {!isVisitor&&<button onClick={onDrawer}>Drawer shop</button>}
   <details ref={menu} className="ks-room-menu" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
    <summary>Room <ChevronDown size={15}/></summary>
    <div className="ks-room-menu-panel ks-room-menu-organized">
     <header><div><strong>Your room</strong><small>{room.title}</small></div><button onClick={close} aria-label="Close room menu"><X size={17}/></button></header>
     <div className="ks-room-sections" aria-label="Room menu sections">{['Places','Collections','Atmosphere'].map(s=><button key={s} aria-pressed={section===s} onClick={()=>setSection(s)}>{s}</button>)}</div>
     <section aria-label={section} className="ks-room-section">
      {section==='Places'&&<>
       <button onClick={action(()=>onLook('front'))}><Home size={16}/>Writing desk</button>
       <button onClick={action(()=>onLook('right'))}><Library size={16}/>Bookshelf</button>
       <button onClick={action(()=>onLook('left'))}><MapPinned size={16}/>Memory wall</button>
       <button onClick={action(onReading)}><Armchair size={16}/>Reading corner</button>
       <button onClick={action(onDisplayCase)}><Archive size={16}/>Display case</button>
       <button onClick={action(onDoor)}>Exit through the door</button>
      </>}
      {section==='Collections'&&<>
       <button onClick={action(onLibrary)}><Library size={16}/>Browse all scrapbooks</button>
       {!isVisitor&&<><button onClick={action(onCardBinders)}><BookOpen size={16}/>Card binders</button><button onClick={action(()=>setDiscoveryOpen('capsule'))}>Time capsule</button><button onClick={action(()=>setPrinterOpen(true))}><Printer size={16}/>Print a photo</button></>}
      </>}
      {section==='Atmosphere'&&<>
       <button aria-pressed={environment.lampOn} onClick={onLamp}><Lamp size={16}/>Desk lamp <span>{environment.lampOn?'On':'Off'}</span></button>
       <button aria-pressed={environment.ceilingOn!==false} onClick={onCeiling}><Lightbulb size={16}/>Ceiling light <span>{environment.ceilingOn!==false?'On':'Off'}</span></button>
       <button aria-pressed={environment.shelfLit} onClick={()=>setEnvironment({shelfLit:!environment.shelfLit})}><Library size={16}/>Bookshelf lights <span>{environment.shelfLit?'On':'Off'}</span></button>
       {!isVisitor&&<button aria-pressed={environment.displayCaseLit!==false} onClick={()=>setEnvironment({displayCaseLit:environment.displayCaseLit===false})}><Lightbulb size={16}/>Display case <span>{environment.displayCaseLit!==false?'On':'Off'}</span></button>}
       <small>Case lights follow the CRT color.</small>
       {room.id==='beachfront'&&<button aria-pressed={environment.coastalWindowOpen!==false} onClick={()=>setEnvironment({coastalWindowOpen:environment.coastalWindowOpen===false})}>Ocean window <span>{environment.coastalWindowOpen!==false?'Open':'Closed'}</span></button>}
       <button onClick={action(onMusic)}><Music2 size={16}/>Music and sound</button>
      </>}
     </section>
     <footer><button onClick={action(onSettings)}><Settings2 size={16}/>Room settings</button><small>Appearance · graphics · privacy</small></footer>
    </div>
   </details>
  </nav>
 </>;
}


import { Archive, Armchair, BookOpen, ChevronDown, Lamp, Lightbulb, Music2, Printer, Library, Home, MapPinned, Pencil, Armchair as ReadingChair } from "lucide-react";
import type { Environment } from "../../types/app";
import type { RoomFace } from "../../lib/roomLayout";
import {useActiveRoom} from "./useActiveRoom";
import { useNav } from "../../store/nav";
import {useApp} from '../../store/appStore';

export function RoomControls({ seated, environment, onBook, onFiles, onSeat, onLamp, onCeiling, onLook, onDrawer, onMusic, onReading, onLibrary, onDoor }: {
  onDoor: () => void;
  onReading: () => void; onLibrary: () => void;
  seated: boolean; environment: Environment;
  onBook: () => void; onFiles: () => void; onSeat: () => void; onMusic: () => void;
  onLamp: () => void; onCeiling: () => void; onLook: (face: RoomFace) => void; onDrawer: () => void;
}) {
  const activeRoom = useActiveRoom();
  const {setEnvironment}=useApp();
  const { setPrinterOpen, isVisitor,setDiscoveryOpen } = useNav();
  return <>
    <div className="ks-room-name"><span>YOUR QUIET CORNER</span><h2>{activeRoom.title}</h2></div>
    <nav className="ks-room-controls" aria-label="Room actions">
      <button className="ks-room-primary" onClick={onBook}><BookOpen size={17} /> Open scrapbook</button>
      <button onClick={onFiles}><Archive size={17} /> Files</button>
      <button onClick={onSeat}><Armchair size={17} /> {seated ? "Stand up" : "Take a seat"}</button>
      {!isVisitor && <button onClick={onDrawer}>Drawer shop</button>}
      <details className="ks-room-menu" onKeyDown={e => {
        if (e.key === "Escape") { e.currentTarget.open = false; e.currentTarget.querySelector("summary")?.focus(); }
      }}>
        <summary>Room <ChevronDown size={15} /></summary>
        <div className="ks-room-menu-panel">
          <p className="ks-handnote">Make yourself at home.</p><p>LOOK AROUND</p>
          <div className="ks-room-views">
            <button onClick={() => onLook("front")}><Home size={15}/> Return to room view</button>
            <button onClick={onReading}><ReadingChair size={15}/> Reading corner</button>
            <button onClick={() => onLook("left")}><MapPinned size={15}/> Memory wall</button>
            <button onClick={() => onLook("front")}><Pencil size={15}/> Writing desk</button>
            <button onClick={() => onLook("right")}><Library size={15}/> Bookshelf</button>
          </div>
          {!isVisitor && <button onClick={() => setPrinterOpen(true)}><Printer size={16}/> Print a photo</button>}
          <button onClick={onLibrary}><Library size={16}/> Browse all scrapbooks</button>
          <button onClick={onMusic}><Music2 size={16}/> Music</button>
          {activeRoom.id==='beachfront'&&<button aria-pressed={environment.coastalWindowOpen!==false} onClick={()=>setEnvironment({coastalWindowOpen:environment.coastalWindowOpen===false})}>{environment.coastalWindowOpen===false?'Open ocean window':'Close ocean window'}</button>}
          <button onClick={onDoor}>Exit through the door</button>
          {!isVisitor&&<button onClick={()=>setDiscoveryOpen('collection')}><BookOpen size={16}/> Correspondence</button>}
          <p>LIGHTING</p>
          <button aria-pressed={environment.lampOn} onClick={onLamp}><Lamp size={16} /> Desk lamp <span>{environment.lampOn ? "On" : "Off"}</span></button>
          <button aria-pressed={environment.ceilingOn !== false} onClick={onCeiling}><Lightbulb size={16} /> Ceiling light <span>{environment.ceilingOn !== false ? "On" : "Off"}</span></button>

          <small>WASD to move · drag to look</small>
        </div>
      </details>
    </nav>
  </>;
}

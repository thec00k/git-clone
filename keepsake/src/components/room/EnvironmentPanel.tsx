import {RoomBackup} from '../RoomBackup';
import {MemoryAtmosphereSettings} from '../MemoryAtmosphereSettings';
import {OfflineRoom} from '../OfflineRoom';
import {AssetCredits} from '../AssetCredits';
import {FramePhotoPicker} from '../FramePhotoPicker';
import {DiscoveryPreferences} from '../Discoveries';
import {ShopRoomVariants} from '../ShopRoomVariants';
import {MusicSettings} from './MusicPanel';
import {StorageSummary} from '../StorageSummary';
import {useRef,useState} from 'react';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
import {useListen} from '../../store/listen';
import {useFocusTrap} from '../../hooks/useFocusTrap';
import {VolumeSlider} from '../VolumeSlider';
import type {Season,TimeMode,Weather} from '../../types/app';
const sections = {appearance:'Appearance & graphics',music:'Music & CRT',discoveries:'Notes & discoveries',saving:'Saving & storage',help:'Help & profile'};
type Section=keyof typeof sections;
export function EnvironmentPanel({onClose,initialSection='appearance'}:{onClose:()=>void;initialSection?:Section}){
 const {state,environment,setEnvironment,setProfile,saveStatus,flushSave}=useApp();
 const {startTour,isVisitor}=useNav();const {preview,setPreview}=useListen();
 const [section,setSection]=useState<Section>(initialSection);const panel=useRef<HTMLDivElement>(null);useFocusTrap(panel,onClose);
 return <div className="ks-settings-backdrop" onClick={onClose}><div ref={panel} className="ks-panel ks-settings" role="dialog" aria-modal="true" aria-label="Room settings" onClick={e=>e.stopPropagation()}>
 <header><div><h2>Room settings</h2><p>Make yourself at home.</p></div><button className="ks-tool" onClick={onClose} aria-label="Close room settings">Done</button></header>
 <nav aria-label="Settings sections">{Object.entries(sections).map(([id,label])=><button key={id} className="ks-tool" aria-pressed={section===id} onClick={()=>setSection(id as Section)}>{label}</button>)}</nav>
 <section aria-label={sections[section]}>
 {section==='appearance'&&<><h3>Light and scenery</h3><Segment label="Time" value={environment.timeMode} options={['auto','day','dusk','night']} onChange={v=>setEnvironment({timeMode:v as TimeMode})}/><Segment label="Season" value={environment.season} options={['spring','summer','autumn','winter']} onChange={v=>setEnvironment({season:v as Season})}/><Segment label="Weather" value={environment.weather} options={['clear','rain','snow']} onChange={v=>setEnvironment({weather:v as Weather})}/>
 <label className="block my-4">Graphics quality<select aria-label="Graphics quality" value={environment.roomQuality??'balanced'} onChange={e=>setEnvironment({roomQuality:e.target.value as 'balanced'|'high'})}><option value="balanced">Balanced · smoother and lighter</option><option value="high">High · detailed shadows and scenery</option></select></label><p className="text-sm">Balanced uses less power and simpler ocean geometry. High adds real-time shadows, sharper rendering, and more scenery detail. Your choice is saved for both rooms.</p>
 <div className="flex flex-wrap gap-2 my-4">{(['lampOn','ceilingOn','shelfLit'] as const).map((key,i)=><button key={key} className="ks-tool" aria-pressed={environment[key]!==false} onClick={()=>setEnvironment({[key]:environment[key]===false})}>{['Desk lamp','Ceiling light','Shelf lights'][i]}: {environment[key]!==false?'On':'Off'}</button>)}</div>
 {!isVisitor&&<><MemoryAtmosphereSettings/><FramePhotoPicker/><details className="my-4"><summary>Choose a room</summary><ShopRoomVariants/></details></>}</>}
 {section==='music'&&<><MusicSettings/><VolumeSlider id="ks-settings-ambience" label="Room sounds and weather" value={environment.ambienceVolume} onChange={ambienceVolume=>setEnvironment({ambienceVolume})}/></>}
 {section==='discoveries'&&<>{!isVisitor&&<div className="mb-5"><h3>Friends and scrapbooks</h3><button className="ks-tool" aria-label="Allow friends to view shared scrapbooks and leave sticky notes" aria-pressed={state.profile.allowFriendScrapbooks===true} onClick={()=>setProfile({allowFriendScrapbooks:state.profile.allowFriendScrapbooks!==true})}>Friend scrapbook access: {state.profile.allowFriendScrapbooks?'On':'Off'}</button><p className="text-sm mt-3">Friends and close friends can open books marked Friends or Public from your desk or bookshelf and leave a sticky note of up to 20 characters. Private books stay private. New notes wait for your approval before other visitors see them. Change each book’s sharing level on the bookshelf.</p></div>}<h3>Little things to find</h3><DiscoveryPreferences/></>}
 {section==='saving'&&<><h3>Your memories</h3><p role="status">{saveStatus==='saved'?'All changes saved on this device.':saveStatus==='error'?'Saving failed. Retry or download a backup before leaving.':'Saving your latest changes…'}</p><button className="ks-tool my-3" onClick={()=>void flushSave()}>Save now</button><label className="block my-3">New photo uploads<select className="block w-full my-2" aria-label="Photo preservation" value={state.profile.preserveOriginals===false?"display":"original"} onChange={e=>setProfile({preserveOriginals:e.target.value==="original"})}><option value="original">Keep original + smaller display copy</option><option value="display">Save space — display copy only</option></select></label><p>Applies to future uploads. Originals stay on this device and are included in room backups. Existing resized photos need re-importing to preserve their source files.</p><StorageSummary/><RoomBackup/><OfflineRoom/><p className="text-sm mt-4">This prototype saves in this browser. Keep a downloaded backup before clearing browser data or changing devices. If another tab saves first, this tab will protect its unsaved changes and ask you to reload.</p></>}
 {section==='help'&&<><label>Your name<input aria-label="Your name" value={state.profile.displayName} maxLength={80} onChange={e=>setProfile({displayName:e.target.value})}/></label><button className="ks-tool my-4" aria-pressed={preview} onClick={()=>setPreview(!preview)}>Show accessible room navigation: {preview?'On':'Off'}</button><p>Provides a readable list of room objects for keyboard and screen-reader navigation.</p><button className="ks-tool my-4" onClick={()=>{onClose();startTour();}}>Show me around</button><AssetCredits/></>}
 </section></div></div>;
}

function Segment({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <span className="text-sm text-paper/60" id={`ks-seg-${label}`}>{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-labelledby={`ks-seg-${label}`}>
        {options.map((o) => (
          <button
            key={o}
            className={`ks-tool ${value === o ? "ks-tool--accent" : ""}`}
            aria-pressed={value === o}
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

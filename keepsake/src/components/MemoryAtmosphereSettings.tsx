import {useApp} from '../store/appStore';
import {MEMORY_MOODS,type MemoryMood} from '../lib/memoryAtmosphere';
export function MemoryAtmosphereSettings(){
 const {state,setProfile,activeBook,updateActiveBook,environment,setEnvironment}=useApp();
 return <fieldset className="ks-memory-form my-4"><legend>Memory atmosphere</legend>
  <label className="block my-2"><input type="checkbox" checked={environment.memoryLighting===true} onChange={e=>setEnvironment({memoryLighting:e.target.checked})}/> Let the open book gently tint the window light</label>
  {activeBook&&<label className="block my-2">Mood for “{activeBook.title}”<select className="block my-2" value={activeBook.memoryMood??'neutral'} onChange={e=>updateActiveBook(b=>({...b,memoryMood:e.target.value as MemoryMood}))}>{Object.entries(MEMORY_MOODS).map(([id,mood])=><option key={id} value={id}>{mood.label}</option>)}</select></label>}
  <p>The tint applies while reading this book. Your hour, weather and light switches stay under your control.</p>
  <label className="block my-2"><input type="checkbox" checked={environment.soundGeography===true} onChange={e=>setEnvironment({soundGeography:e.target.checked})}/> Quieter outside sounds while reading or looking away from the window</label>
 <label className="block my-2"><input type="checkbox" checked={state.profile.foundPhotos!==false} onChange={e=>setProfile({foundPhotos:e.target.checked})}/> Occasionally show untouched uploads in a found-photographs envelope</label>
 </fieldset>;
}

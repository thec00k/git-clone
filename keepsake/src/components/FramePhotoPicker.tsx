import {useApp} from '../store/appStore';
export function FramePhotoPicker(){
 const {state,update}=useApp();
 return <details className="ks-frame-picker"><summary>Cabinet photograph</summary><p>Choose the photograph displayed in the room.</p><button className="ks-tool" onClick={()=>update(s=>({...s,framePhotoId:undefined}))}>Use favorite automatically</button><div>{state.archive.map((a,i)=><button key={a.id} aria-label={`Frame photograph ${i+1}`} aria-pressed={state.framePhotoId===a.id} onClick={()=>update(s=>({...s,framePhotoId:a.id}))}><img src={a.src} alt=""/></button>)}</div></details>;
}

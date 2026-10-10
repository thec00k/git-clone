import type {Phase} from '../room/RoomFurniture';
import type {WoodlandStudyView} from './woodlandStudy';
import './woodland-study.css';
export function WoodlandStudyControls({view,onView,winter,onWinter,phase,onPhase}:{
  view:WoodlandStudyView|null;onView:(view:WoodlandStudyView)=>void;
  winter:boolean;onWinter:(winter:boolean)=>void;phase:Phase;onPhase:(phase:Phase)=>void;
}){
  return <section className="ks-study-controls" aria-label="Woodland composition study">
    <span className="ks-study-label">Composition study</span>
    <nav aria-label="Composition views">{(['establishing','desk','window','hearth'] as const).map((id,i)=><button key={id} aria-pressed={view===id} onClick={()=>onView(id)}>{['Room view','Desk view','Window view','Hearth view'][i]}</button>)}</nav>
    <label>Season<select aria-label="Season" value={winter?'winter':'autumn'} onChange={e=>onWinter(e.target.value==='winter')}><option value="autumn">Autumn</option><option value="winter">Winter</option></select></label>
    <label>Light<select aria-label="Light" value={phase} onChange={e=>onPhase(e.target.value as Phase)}><option value="day">Day</option><option value="dusk">Dusk</option><option value="night">Night</option></select></label>
  </section>;
}


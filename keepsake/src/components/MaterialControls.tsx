import {useEffect,useRef,useState} from 'react';
import {PAPER_MATERIALS,STICKER_FINISHES,paperSettings,type PaperSettings,type StickerFinish} from '../lib/materials';
import {StickerSurface} from './StickerSurface';
/** One slider adjustment is one saved edit. */
export function AmountSlider({label,value,onCommit}:{label:string;value:number;onCommit:(v:number)=>void}) {
  const [draft,setDraft]=useState(value),pending=useRef<number|null>(null);
  useEffect(()=>{setDraft(value);pending.current=null;},[value]);
  const commit=()=>{if(pending.current!==null){const v=pending.current;pending.current=null;if(v!==value)onCommit(v);}};
  return <label className="ks-material-slider"><span>{label} <output>{Math.round(draft*100)}%</output></span><input aria-label={label} type="range" min="0" max="100" step="5" value={Math.round(draft*100)} onChange={e=>{const v=Number(e.target.value)/100;pending.current=v;setDraft(v);}} onPointerUp={commit} onPointerCancel={()=>{pending.current=null;setDraft(value);}} onKeyUp={commit} onBlur={commit}/></label>;
}
export function StickerFinishControls({glyph,finish='matte',strength=.65,onChange}:{glyph:string;finish?:StickerFinish;strength?:number;onChange:(patch:{finish?:StickerFinish;finishStrength?:number})=>void}) {
  return <div className="ks-material-controls" aria-label="Sticker finish"><div className="ks-finish-options" role="group" aria-label="Sticker finish options">{Object.entries(STICKER_FINISHES).map(([id,label])=><button type="button" key={id} aria-pressed={finish===id} aria-label={label} onClick={()=>onChange({finish:id as StickerFinish})}><span className="ks-finish-sample"><StickerSurface glyph={glyph} finish={id as StickerFinish} strength={strength}/></span><span>{label}</span></button>)}</div><AmountSlider label="Finish strength" value={strength} onCommit={finishStrength=>onChange({finishStrength})}/></div>;
}
export function PaperControls({settings,disabled,onChange}:{settings?:PaperSettings;disabled?:boolean;onChange:(v:PaperSettings|undefined)=>void}) {
  const p=paperSettings(settings);
  return <fieldset disabled={disabled} className="ks-material-controls"><legend>Paper feel</legend><label className="ks-paper-picker">Stock<select aria-label="Paper stock" value={settings?p.material:'original'} onChange={e=>onChange(e.target.value==='original'?undefined:paperSettings({material:e.target.value as PaperSettings['material']}))}><option value="original">Original paper</option>{Object.entries(PAPER_MATERIALS).map(([id,s])=><option key={id} value={id}>{s.name}</option>)}</select></label>{settings&&<><AmountSlider label="Paper texture" value={p.texture} onCommit={texture=>onChange({...p,texture})}/><AmountSlider label="Paper wrinkles" value={p.wrinkles} onCommit={wrinkles=>onChange({...p,wrinkles})}/></>}</fieldset>;
}

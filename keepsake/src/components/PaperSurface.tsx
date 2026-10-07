import {useEffect,useState} from 'react';
import {PAPER_MATERIALS,paperSettings,type PaperSettings} from '../lib/materials';
import {getPaperTexture} from '../lib/paperTexture';
const fallback={cream:'/textures/paper-warm-cream.webp',cotton:'/textures/paper-handmade-cotton.webp',journal:'/textures/paper-creased-journal.webp'};
export function PaperSurface({settings}:{settings?:PaperSettings}) {
  const p=paperSettings(settings),key=JSON.stringify(p),enabled=Boolean(settings);
  const [image,setImage]=useState<{key:string;src:string}|null>(null);
  useEffect(()=>{if(!enabled)return;let live=true;const timer=setTimeout(()=>{getPaperTexture(JSON.parse(key)).then(src=>{if(live)setImage({key,src});}).catch(()=>{});},100);return()=>{live=false;clearTimeout(timer);};},[key,enabled]);
  if(!settings)return null;
  return <img className="ks-paper-surface" alt="" aria-hidden="true" draggable={false} data-paper-settings={key} data-paper-ready={image?.key===key?'true':'pending'} src={image?.key===key?image.src:fallback[p.material]} style={{backgroundColor:PAPER_MATERIALS[p.material].color}}/>;
}

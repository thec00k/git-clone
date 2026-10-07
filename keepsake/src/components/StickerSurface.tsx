import {useId} from 'react';
import {KeepsakeGlyph} from './KeepsakeGlyph';
import {isStickerFinish,unitAmount,type StickerFinish} from '../lib/materials';

/** Self-contained SVG materials survive print and the page-turn image capture. */
export function StickerSurface({glyph,finish='matte',strength=.65,light={x:.35,y:.25}}:{glyph:string;finish?:StickerFinish;strength?:number;light?:{x:number;y:number}}) {
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,''),mask=`sticker-${id}`,shine=`shine-${id}`,foil=`foil-${id}`;
  const material=isStickerFinish(finish)?finish:'matte',amount=unitAmount(strength,.65);
  const art=glyph.startsWith('keepsake:')?<KeepsakeGlyph glyph={glyph}/>:<text x="50" y="82" textAnchor="middle" fontSize="86">{glyph}</text>;
  return <svg className="ks-sticker-surface" data-finish={material} data-strength={amount} viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" style={{fontSize:100,overflow:'visible',display:'block'}}>
    <defs>
      <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style={{maskType:'alpha'}}>{art}</mask>
      <linearGradient id={shine} x1={light.x*90-40} y1="0" x2={light.x*90+70} y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="white" stopOpacity="0"/><stop offset=".37" stopColor="white" stopOpacity="0"/><stop offset=".48" stopColor="white" stopOpacity=".9"/><stop offset=".54" stopColor="white" stopOpacity=".1"/><stop offset=".78" stopColor="white" stopOpacity="0"/></linearGradient>
      <linearGradient id={foil} x1={light.x*80-30} y1={light.y*50} x2={light.x*80+70} y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#d898ef"/><stop offset=".22" stopColor="#7bcbe9"/><stop offset=".4" stopColor="#a8e5c1"/><stop offset=".57" stopColor="#ffdd91"/><stop offset=".76" stopColor="#f2a4c9"/><stop offset="1" stopColor="#a697e2"/></linearGradient>
    </defs>
    {art}
    <g mask={`url(#${mask})`} pointerEvents="none">
      {material==='matte'?<g opacity={amount*.2}>{Array.from({length:80},(_,i)=><circle key={i} cx={(i*37.17)%100} cy={(i*61.73)%100} r=".2" fill="#655b43"/>)}</g>:<>
        {material==='holographic'&&<rect width="100" height="100" fill={`url(#${foil})`} opacity={amount*.48}/>}
        {material==='glitter'&&<g opacity={amount}>{Array.from({length:150},(_,i)=>{const x=(i*37.17)%100,y=(i*61.73)%100;const lit=Math.max(.1,1-Math.abs(x/100-light.x)*1.4);return <circle key={i} cx={x} cy={y} r={i%7===0?.65:.32} fill={i%3===0?'#fff9db':i%3===1?'#d6b675':'#8dbdb2'} opacity={lit}/>;})}{[18,41,67,82].map((x,i)=><path key={x} d={`M${x-1.7} ${23+i*17}h3.4m-1.7-1.7v3.4`} stroke="#fffde9" strokeWidth=".5" opacity={.4+light.x*.5}/>)}</g>}
        <rect width="100" height="100" fill={`url(#${shine})`} opacity={amount*(material==='glossy'?.8:.5)}/>
      </>}
    </g>
  </svg>;
}

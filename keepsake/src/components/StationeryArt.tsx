import {isPaperStyle} from '../lib/stationery';

/** Original vector illustrations: cream cut edges, muted pigment and ink contours. */
export function IllustratedSticker({glyph}:{glyph:string}){
 const ink='#75694e',paper='#f5ecd7',green='#6c805b',blue='#769f9a',gold='#c5a15b';
 return <svg viewBox="0 0 100 100" width="1em" height="1em" aria-hidden="true" style={{display:'inline-block',verticalAlign:'middle'}}>
  <g stroke={paper} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round">
   <path fill={paper} d={glyph==='keepsake:oak-leaf'?'M45 90Q18 72 17 47Q9 30 29 32Q20 10 44 22Q55 1 66 23Q89 16 78 38Q99 43 80 60Q91 81 60 83Z':glyph==='keepsake:toadstool'?'M11 55Q11 7 50 9Q89 9 90 55L63 58 70 90H30L38 59Z':'M19 13Q48 3 81 15L94 76Q78 98 21 91L7 41Z'}/>
  </g>
  <g stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
   {glyph==='keepsake:oak-leaf'?<><path d="M45 85Q18 70 20 48Q11 31 33 36Q21 13 45 27Q55 7 63 28Q84 20 73 40Q94 45 76 60Q83 78 58 79Z" fill={green}/><path d="m46 91 9-66m-4 40-20-12m22-3 16-12m-20 32 17-8" fill="none" stroke={paper}/></>:null}
   {glyph==='keepsake:toadstool'?<><path d="m40 49-5 37q15 8 30 0l-7-38Z" fill="#e3d1ae"/><path d="M15 52Q15 14 51 14Q84 14 86 52Q54 66 15 52Z" fill="#b67450"/><path d="M17 53q31-8 66 0" fill="none"/><g fill={paper} stroke="none"><ellipse cx="36" cy="34" rx="6" ry="4"/><ellipse cx="64" cy="29" rx="5" ry="3"/><ellipse cx="58" cy="46" rx="4" ry="3"/></g><path d="m39 83 5-23m13 22-4-22" fill="none" opacity=".4"/></>:null}
   {glyph==='keepsake:moth'?<><path d="M47 46Q16 7 12 35Q6 60 42 57Q15 60 28 82Q41 92 49 63Q59 93 76 79Q87 61 57 56Q95 59 86 30Q78 10 53 46Z" fill={gold}/><path d="M49 72V36m0 0-9-10m9 10 11-11" fill="none" strokeWidth="4"/><path d="m20 34 20 13m21 0 17-15m-42 37 8-8m14 0 8 8" fill="none" stroke={paper} strokeWidth="4"/></>:null}
   {glyph==='keepsake:teacup'?<><ellipse cx="47" cy="82" rx="34" ry="6" fill="#d8ceb5"/><path d="M68 44q24-8 21 11-3 14-22 10" fill="none" strokeWidth="6" stroke={blue}/><path d="M18 40h53l-5 27q-6 20-35 11Z" fill={blue}/><ellipse cx="45" cy="41" rx="26" ry="6" fill="#735a3c"/><path d="M36 30q-9-10 1-19m16 17q-8-9 1-17" fill="none" strokeWidth="2" opacity=".6"/><path d="m28 50 4 15" stroke={paper} strokeWidth="3"/></>:null}
   {glyph==='keepsake:conch'?<><path d="M12 57 24 49 21 41 35 40 38 27 48 31 59 21 67 29Q84 27 89 53Q92 78 67 84Q42 79 34 67Z" fill="#d9ad77"/><path d="M66 36Q90 37 84 64Q75 82 55 73Q67 57 66 36Z" fill="#efc799"/><path d="M60 42Q78 39 77 58Q70 73 59 70" fill="#b58259"/><path d="m24 50 9 13m4-20 10 27m0-34 10 35m8-43 0 9" fill="none" stroke={paper} strokeWidth="3"/></>:null}
   {glyph==='keepsake:sailboat'?<><path d="m14 70 68-1-15 15H29Z" fill="#ac7c55"/><path d="M47 68V17" fill="none" strokeWidth="3"/><path d="m43 22-25 39h25Z" fill="#d9e5dc"/><path d="m52 30 23 32H52Z" fill="#b4c9bf"/><path d="M12 89q9-5 18 0t18 0t18 0t18 0" stroke={blue} fill="none" strokeWidth="3"/></>:null}
   {glyph==='keepsake:sea-glass'?<><path d="M22 25q14-10 23 0L37 59q-20 9-23-9Z" fill="#8eb4a3"/><path d="m62 18 21 16-10 24-18-8Z" fill="#96b7bf"/><path d="m45 62 26 7-7 18-27-3Z" fill="#b1bd88"/><path d="m22 34 2-6m39 1 9 6M45 73l13 2" fill="none" stroke={paper} strokeWidth="3"/></>:null}
   {glyph==='keepsake:tidal-postmark'?<><rect x="18" y="12" width="65" height="76" rx="3" fill="#e1d5ae" strokeDasharray="3 3" strokeWidth="3"/><circle cx="51" cy="42" r="15" fill="#c8ad65" stroke="none"/><path d="M25 58q13-12 25 0t26 0M25 69q13-12 25 0t26 0M25 78h50" fill="none" stroke={blue} strokeWidth="4"/></>:null}
  </g>
 </svg>;
}

/** Kept behind live elements and included when the page is photographed for a turn. */
export function PaperDecoration({style}:{style?:string}){
 if(!isPaperStyle(style)||style==='plain')return null;
 return <svg className="ks-paper-decoration" viewBox="0 0 100 137" preserveAspectRatio="none" aria-hidden="true">
  {style==='ruled'?<g stroke="#a69678" strokeWidth=".12" opacity=".42">{Array.from({length:17},(_,i)=><path key={i} d={`M8 ${16+i*6.6}h84`}/>)}<path d="M15 8v121" stroke="#b77966"/></g>:style==='dots'?<g fill="#8d8b72" opacity=".38">{Array.from({length:17*12},(_,i)=><circle key={i} cx={10+i%12*7.25} cy={12+Math.floor(i/12)*7} r=".19"/>)}</g>:style==='field'?<g fill="none" stroke="#7b8b68" opacity=".35" strokeLinecap="round"><path d="M7 119q6-13 0-28m1 16 5-7m-5 1-4-7m5 20 6-5M84 12q8 2 10 13m-5-9 4-3m-2 6 5-1" strokeWidth=".5"/><path d="M17 127h64M19 9h56" strokeWidth=".16"/></g>:<g fill="none" stroke="#759f9b" opacity=".35"><path d="M8 125q7-3 14 0t14 0t14 0t14 0t14 0t14 0M8 128q7-3 14 0t14 0t14 0t14 0t14 0t14 0" strokeWidth=".4"/><circle cx="88" cy="12" r="4" strokeWidth=".25"/><path d="M8 9h63" strokeWidth=".18"/></g>}
 </svg>;
}

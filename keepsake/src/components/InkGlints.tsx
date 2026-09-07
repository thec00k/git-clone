import {SPARKLE_INKS} from '../lib/roomShop';
export function InkGlints({color,points}:{color:string;points:{x:number;y:number}[]}){if(!Object.values(SPARKLE_INKS).includes(color))return null;return <g fill="#fff0bc" stroke="#fff8e5" strokeWidth=".12">{points.filter((_,i)=>i%5===0).map((p,i)=><path key={i} d={`M${p.x} ${p.y-.55}l.16 .39 .39 .16-.39 .16-.16 .39-.16-.39-.39-.16 .39-.16Z`}/>)}</g>;}

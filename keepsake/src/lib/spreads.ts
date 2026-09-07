import type { Page } from '../types/scrapbook';
/** Move whole pairs, padding an odd last page before moving it into the book. */
export function movePageSpread(pages:Page[],from:number,to:number,paddingId:string):Page[]{
 const count=Math.ceil(pages.length/2);
 if(!Number.isInteger(from)||!Number.isInteger(to)||from===to||from<0||to<0||from>=count||to>=count)return pages;
 const pairs:Page[][]=[];for(let i=0;i<pages.length;i+=2)pairs.push(pages.slice(i,i+2));
 const last=pairs[pairs.length-1];if(last.length===1)last.push({id:paddingId,elements:[]});
 const [moved]=pairs.splice(from,1);pairs.splice(to,0,moved);return pairs.flat();
}

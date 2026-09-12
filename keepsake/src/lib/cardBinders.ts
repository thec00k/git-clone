export interface BinderCard {
  id: string; title: string; src?: string; backSrc?: string;
  modelSrc?: string; source: 'image' | 'imported-scan';
  finish: 'paper' | 'foil'; position?: number;
}
export interface CardBinder {
  id: string; title: string; color: string; coverSrc?: string;
  cards: BinderCard[];
}
export const BINDER_COLORS = ['#405c49','#35596b','#6a4160','#80543b','#343843'];
export const MAX_BINDER_CARDS = 180;
export function cardsWithPositions(cards: BinderCard[]) {
  const used=new Set<number>(),legacy:BinderCard[]=[];
  const positioned:BinderCard[]=[];
  for(const card of cards){
    if(Number.isInteger(card.position)&&card.position!>=0&&card.position!<MAX_BINDER_CARDS&&!used.has(card.position!)){
      used.add(card.position!);positioned.push(card);
    }else legacy.push(card);
  }
  let next=0;
  for(const card of legacy){while(used.has(next)&&next<MAX_BINDER_CARDS)next++;if(next>=MAX_BINDER_CARDS)break;used.add(next);positioned.push({...card,position:next});}
  return positioned;
}
export function binderCardAt(cards: BinderCard[],position:number) {
  return cardsWithPositions(cards).find(card=>card.position===position);
}
export function placeBinderCards(cards: BinderCard[],newCards: BinderCard[],preferredPosition?:number) {
  const placed=cardsWithPositions(cards),used=new Set(placed.map(card=>card.position!));
  const additions:BinderCard[]=[];
  let cursor=preferredPosition??0;
  for(const card of newCards){
    let position=-1;
    if(additions.length===0&&preferredPosition!==undefined&&!used.has(preferredPosition))position=preferredPosition;
    else {
      for(let offset=0;offset<MAX_BINDER_CARDS;offset++){const candidate=(cursor+offset)%MAX_BINDER_CARDS;if(!used.has(candidate)){position=candidate;break;}}
    }
    if(position<0)break;
    used.add(position);additions.push({...card,position});cursor=(position+1)%MAX_BINDER_CARDS;
  }
  return [...placed,...additions];
}
export function binderSpreadCount(cards: BinderCard[]) {
  const positions=cardsWithPositions(cards).map(card=>card.position!);
  return Math.max(1,Math.ceil(((positions.length?Math.max(...positions):0)+1)/18));
}
export function newCardBinder(): CardBinder {
  return {id:crypto.randomUUID(),title:'My card collection',color:BINDER_COLORS[0],cards:[]};
}
/** Reject network references, compressed payloads, and excessive geometry before loading. */
export function validateCardGlb(buffer: ArrayBuffer) {
  const data=new DataView(buffer);
  if(buffer.byteLength<28 || buffer.byteLength>5*1024*1024 || data.getUint32(0,true)!==0x46546c67 || data.getUint32(4,true)!==2 || data.getUint32(8,true)!==buffer.byteLength) throw new Error('Choose a self-contained GLB under 5 MB.');
  const size=data.getUint32(12,true);
  if(data.getUint32(16,true)!==0x4e4f534a || size>buffer.byteLength-20)throw new Error('Invalid GLB header.');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,size)));
  if(!json.asset || json.asset.version!=='2.0' || !json.meshes?.length)throw new Error('This file contains no card mesh.');
  if((json.buffers??[]).some((b:{uri?:string})=>b.uri) || (json.images??[]).some((i:{uri?:string})=>i.uri) || (json.extensionsRequired??[]).length)throw new Error('Export an uncompressed GLB with embedded textures and no required extensions.');
  const nodes=json.nodes??[];
  if(nodes.length>200)throw new Error('Simplify the scan to 200 nodes or fewer.');
  const visited=new Set<number>(),visiting=new Set<number>();
  const visit=(index:number)=>{
    if(!Number.isInteger(index)||index<0||index>=nodes.length||visiting.has(index))throw new Error('Invalid or circular scene hierarchy.');
    if(visited.has(index))return;
    visiting.add(index);for(const child of nodes[index].children??[])visit(child);visiting.delete(index);visited.add(index);
  };
  nodes.forEach((_:unknown,index:number)=>visit(index));
  let triangles=0;
  for(const m of json.meshes)for(const p of m.primitives){
    const count=json.accessors?.[p.indices??p.attributes?.POSITION]?.count;
    if(!Number.isFinite(count)||count<=0||(p.mode!==undefined&&p.mode!==4))throw new Error('Use a triangle mesh for the card.');
    triangles+=count/3;
  }
  if(triangles>50000 || (json.nodes?.length??0)>200 || (json.images?.length??0)>4)throw new Error('Simplify this card to 50,000 triangles, 200 nodes and four textures or fewer.');
  return json;
}

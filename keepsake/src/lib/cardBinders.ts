import {inspectGlb} from './glbBudget.ts';
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
/**
 * Reject network references, compressed payloads and models over the shared budget
 * (see glbBudget.ts) before loading. New imports are checked strictly; pass
 * `strict: false` when restoring a backup so models the user already kept still restore.
 */
export function validateCardGlb(buffer: ArrayBuffer, strict = true) {
  return inspectGlb(buffer, {strict}).json;
}

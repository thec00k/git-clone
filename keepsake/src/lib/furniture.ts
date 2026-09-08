export const FURNITURE_CATEGORIES={desk:'Desks',chair:'Chairs',lamp:'Lamps',beanbag:'Beanbags',rug:'Rugs',curtains:'Curtains','guestbook-stand':'Guestbook tables',cabinet:'File cabinets',bookshelf:'Bookshelves',printer:'Photo printers',crt:'CRTs'} as const;
export type FurnitureCategory=keyof typeof FURNITURE_CATEGORIES;
export type FurnitureId=`${FurnitureCategory}-${1|2}`;
export type FurnitureChoices=Partial<Record<FurnitureCategory,FurnitureId>>;
export type RoomFurnitureChoices=Partial<Record<'woodland'|'beachfront',FurnitureChoices>>;
const names:Record<FurnitureCategory,[string,string]>={desk:['Oak trestle','Pale writing desk'],chair:['Moss swivel chair','Collected school chair'],lamp:['Sea-glass ceramic','Brass task lamp'],beanbag:['Moss canvas pear','Oatmeal floor lounger'],rug:['Braided oval','Sea-glass woven stripes'],curtains:['Oatmeal gathered linen','Sea-glass fine pleats'],'guestbook-stand':['Round oak side table','Pale tray table'],cabinet:['Oak archive drawers','Painted correspondence cabinet'],bookshelf:['Oak library shelf','Slatted ash shelf'],printer:['Cream pocket printer','Sea-glass pocket printer'],crt:['Cream rounded CRT','Walnut rounded CRT']};
export const FURNITURE_ITEMS=Object.entries(names).flatMap(([category,titles])=>titles.map((title,i)=>({id:`${category}-${i+1}` as FurnitureId,category:category as FurnitureCategory,title,asset:`/room/furniture/${category}-${i+1}.glb`,thumbnail:`/room/furniture/${category}-${i+1}.png`})));
export function validFurnitureChoices(value:unknown):value is RoomFurnitureChoices {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  return Object.entries(value).every(([room,choices])=>['woodland','beachfront'].includes(room)&&!!choices&&typeof choices==='object'&&!Array.isArray(choices)&&Object.entries(choices).every(([category,id])=>FURNITURE_ITEMS.some(item=>item.category===category&&item.id===id)));
}

import type {Scrapbook,Page,PhotoElement} from '../types/scrapbook';
import {uid} from './id.ts';
export type ImportPhoto={src:string;aspect:number;photoId?:string;name?:string;original?:import("./originalPhotos").OriginalPhoto};
/** A batch is one editor operation. Existing content is never moved or overwritten. */
export function insertPhotoBatch(book:Scrapbook,targetId:string,photos:ImportPhoto[]){
 if(!photos.length||photos.length>20)throw new Error('Choose between 1 and 20 photos.');
 const target=book.pages.findIndex(p=>p.id===targetId);
 if(target<0)throw new Error('Choose a page first.');
 const reuse=!book.pages[target].titlePage&&book.pages[target].elements.length===0;
 const start=target+(reuse?0:1);
 const added:Page[]=Array.from({length:Math.ceil(photos.length/4)},(_,page)=>({id:page===0&&reuse?targetId:uid('page'),elements:photos.slice(page*4,page*4+4).map((photo,i):PhotoElement=>({id:uid('el'),type:'photo',src:photo.src,photoId:photo.photoId,x:i%2?73:27,y:i<2?28:70,w:40,rotation:0,z:i+1,frame:'polaroid',cropAspect:1}))}));
 const pages=[...book.pages];pages.splice(start,reuse?1:0,...added);
 return {book:{...book,pages},firstPageId:added[0].id,index:start};
}

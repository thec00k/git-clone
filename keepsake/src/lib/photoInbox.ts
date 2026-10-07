import type {Scrapbook, PhotoElement} from '../types/scrapbook';
import {MAX_PHOTOS_PER_PAGE} from '../types/scrapbook.ts';
import type {ArchivePhoto} from '../types/app';
import {uid} from './id.ts';

export function queuePhotos(book:Scrapbook, ids:string[]):Scrapbook {
  return {...book,pendingPhotoIds:[...new Set([...(book.pendingPhotoIds??[]),...ids])]};
}

/** Placement and removal from the waiting pile must be one undoable operation. */
export function placeWaitingPhoto(book:Scrapbook, pageId:string, photo:ArchivePhoto):Scrapbook {
  const page=book.pages.find(p=>p.id===pageId);
  if(!book.pendingPhotoIds?.includes(photo.id)||!page||page.titlePage||page.elements.filter(e=>e.type==='photo').length>=MAX_PHOTOS_PER_PAGE)return book;
  const element:PhotoElement={id:uid('el'),type:'photo',src:photo.src,photoId:photo.id,x:50,y:45,w:42,rotation:-2,z:page.elements.reduce((n,e)=>Math.max(n,e.z),0)+1,frame:'polaroid'};
  return {...book,pendingPhotoIds:book.pendingPhotoIds.filter(id=>id!==photo.id),pages:book.pages.map(p=>p.id===pageId?{...p,elements:[...p.elements,element]}:p)};
}

import {ownsRoomTheme} from './roomThemes.ts';
import {BINDER_COLORS,MAX_BINDER_CARDS,validateCardGlb} from './cardBinders.ts';
import {withOriginalFiles} from './originalPhotos.ts';
import {MEMORY_MOODS} from './memoryAtmosphere.ts';
import {KEEPSAKE_PRINTS,isPaperStyle} from './stationery.ts';
import {validFurnitureChoices} from './furniture.ts';
import {CRT_COLORS} from './roomMusic.ts';
import {ROOM_GOODS,SHOP_GOODS,EXTRA_GOODS} from './roomShop.ts';
import {soundCloudUrl} from './soundcloud.ts';
import type { AppState } from '../types/app';
import {PLACES,REWARDS} from './discoveries.ts';
type RecordValue = Record<string, unknown>;
function object(v:unknown):v is RecordValue{return !!v && typeof v==='object' && !Array.isArray(v);}
function ensure(ok:unknown):asserts ok{if(!ok)throw new Error('This file is not a complete, supported Keepsake room backup.');}
const string=(v:unknown)=>typeof v==='string';
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const strings=(v:unknown)=>Array.isArray(v)&&v.every(string);
const image=(v:unknown)=>string(v)&&(/^(data:image\/(png|jpeg|webp|gif);base64,|\/samples\/)/.test(v as string)||KEEPSAKE_PRINTS.some(print=>print.src===v));
function records(v:unknown,check:(v:RecordValue)=>boolean){return Array.isArray(v)&&v.every(x=>object(x)&&check(x));}
export function parseRoomBackup(text:string):AppState{
 const file:unknown=JSON.parse(text);ensure(object(file)&&file.format==='keepsake-room'&&file.backupVersion===1&&object(file.state));const s=file.state;
 if(s.cardBinders!==undefined){
  ensure(Array.isArray(s.cardBinders)&&s.cardBinders.length<=12);
  ensure(records(s.cardBinders,b=>string(b.id)&&string(b.title)&&(b.title as string).length<=80&&BINDER_COLORS.includes(b.color as string)&&(b.coverSrc===undefined||image(b.coverSrc))&&Array.isArray(b.cards)&&b.cards.length<=MAX_BINDER_CARDS&&records(b.cards,c=>string(c.id)&&string(c.title)&&(c.title as string).length<=100&&['image','imported-scan'].includes(c.source as string)&&['paper','foil'].includes(c.finish as string)&&(c.src===undefined||image(c.src))&&(c.backSrc===undefined||image(c.backSrc))&&(c.source==='image'?image(c.src):string(c.modelSrc)))));
  for(const binder of s.cardBinders as unknown as import('./cardBinders').CardBinder[]){
   ensure(new Set(binder.cards.map(c=>c.id)).size===binder.cards.length);
   ensure(binder.cards.filter(c=>c.modelSrc).length<=9);
   for(const card of binder.cards)if(card.modelSrc){
    ensure(card.modelSrc.length<7*1024*1024&&/^data:model\/gltf-binary;base64,[A-Za-z0-9+/]*={0,2}$/.test(card.modelSrc));
    const binary=atob(card.modelSrc.split(',')[1]);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));validateCardGlb(bytes.buffer);
   }
  }
  ensure(new Set((s.cardBinders as {id:string}[]).map(b=>b.id)).size===s.cardBinders.length);
 }
 ensure(number(s.version)&&object(s.profile)&&string(s.profile.displayName)&&(s.profile.allowFriendScrapbooks===undefined||typeof s.profile.allowFriendScrapbooks==='boolean'));
 ensure(records(s.books,b=>string(b.id)&&string(b.title)&&string(b.subtitle)&&['cocoa','forest','wine','midnight','ochre'].includes(b.coverStyle as string)&&['private','friends','public'].includes(b.visibility as string)&&number(b.createdAt)&&number(b.updatedAt)&&records(b.pages,p=>string(p.id)&&(p.titlePage===undefined||typeof p.titlePage==='boolean')&&records(p.elements,e=>{
  if(!string(e.id)||!['x','y','w','rotation','z'].every(k=>number(e[k])))return false;
  if(e.type==='photo')return image(e.src)&&['polaroid','tape','flush'].includes(e.frame as string)&&(e.cropAspect===undefined||(number(e.cropAspect)&&(e.cropAspect as number)>0&&(e.cropAspect as number)<=5));
  if(e.type==='caption')return string(e.text)&&number(e.fontSize)&&string(e.color);
  if(e.type==='sticker')return string(e.glyph);
  return e.type==='stroke'&&string(e.color)&&number(e.width)&&records(e.points,p=>number(p.x)&&number(p.y));
 }))));
 const books=s.books as AppState['books'];const ids=books.map(b=>b.id);ensure(new Set(ids).size===ids.length);
 ensure(books.every(b=>b.memoryMood===undefined||Object.hasOwn(MEMORY_MOODS,b.memoryMood)));
 ensure(books.every(b=>b.memoryLinks===undefined||strings(b.memoryLinks)&&b.memoryLinks.length<=5&&new Set(b.memoryLinks).size===b.memoryLinks.length));
 ensure(s.profile.foundPhotos===undefined||typeof s.profile.foundPhotos==='boolean');
 ensure(s.profile.lastFoundPhotosAt===undefined||number(s.profile.lastFoundPhotosAt));
 ensure(s.profile.preserveOriginals===undefined||typeof s.profile.preserveOriginals==='boolean');
 ensure(books.every(b=>b.pages.every(p=>p.backgroundStyle===undefined||isPaperStyle(p.backgroundStyle))));
 const pageIds=books.flatMap(b=>b.pages.map(p=>p.id));ensure(new Set(pageIds).size===pageIds.length);
 ensure(s.activeBookId===null || ids.includes(s.activeBookId as string));
 ensure(records(s.archive,a=>string(a.id)&&image(a.src)&&number(a.aspect)&&(a.aspect as number)>0&&number(a.createdAt)&&strings(a.categories)&&typeof a.favorite==='boolean'));
 ensure(s.originalFiles===undefined||object(s.originalFiles));
 ensure((s.archive as RecordValue[]).every(p=>p.ticket===undefined||object(p.ticket)&&['event','venue','date','style'].every(k=>string((p.ticket as RecordValue)[k]))&&p.ticket.provenance==='commemorative-template'));
 ensure((s.archive as RecordValue[]).every(p=>p.activity===undefined||object(p.activity)&&(p.activity.lastMeaningfulAt===undefined||number(p.activity.lastMeaningfulAt))&&(p.activity.dismissed===undefined||typeof p.activity.dismissed==='boolean')));
 for(const photo of s.archive as RecordValue[]){if(photo.original===undefined)continue;const o=photo.original;
  ensure(object(o)&&string(o.key)&&/^[a-f0-9]{64}$/.test(o.key as string)&&string(o.name)&&string(o.type)&&number(o.size)&&(o.size as number)>0&&(o.size as number)<=25*1024*1024);
  ensure(object(s.originalFiles)&&string(s.originalFiles[o.key as string])&&/^data:[^,]*;base64,[A-Za-z0-9+/]*={0,2}$/.test(s.originalFiles[o.key as string] as string));
 }
 ensure(records(s.archiveTabs,a=>string(a.id)&&string(a.name)));
 ensure(records(s.pins,p=>string(p.id)&&string(p.label)&&string(p.caption)&&number(p.createdAt)&&number(p.x)&&number(p.y)&&(p.x as number)>=0&&(p.x as number)<=100&&(p.y as number)>=0&&(p.y as number)<=100&&(p.photoSrc===undefined||image(p.photoSrc))));
 ensure(records(s.guestbook,g=>string(g.id)&&string(g.author)&&string(g.message)&&number(g.createdAt)&&(g.deskCopy===undefined||typeof g.deskCopy==='boolean')));
 ensure(records(s.notes,n=>string(n.id)&&string(n.bookId)&&string(n.pageId)&&string(n.author)&&string(n.message)&&number(n.createdAt)&&typeof n.approved==='boolean'));
 ensure(records(s.pinNotes,n=>string(n.id)&&string(n.pinId)&&string(n.author)&&string(n.message)&&number(n.createdAt)));
 ensure(strings(s.achievements)&&strings(s.achievementsSeen)&&strings(s.ownedStickerPacks)&&number(s.stamps));
 ensure(object(s.achievementsAt)&&Object.values(s.achievementsAt).every(number)&&object(s.receipts)&&Object.values(s.receipts).every(number));
 ensure(object(s.progress)&&['visitedAtNight','previewedAsVisitor','completedTour'].every(k=>typeof s.progress ==='object'&&typeof (s.progress as RecordValue)[k]==='boolean'));
 const e=s.environment;ensure(object(e)&&['auto','day','dusk','night'].includes(e.timeMode as string)&&['spring','summer','autumn','winter'].includes(e.season as string)&&['clear','rain','snow'].includes(e.weather as string)&&['ambient','spotify','lofi','soundcloud'].includes(e.musicProvider as string));
 ensure(e.entryMusic===undefined||['off','mellow','spotify','soundcloud'].includes(e.entryMusic as string));
 ensure(e.crtColor===undefined||Object.hasOwn(CRT_COLORS,e.crtColor as string));
 ensure(e.roomQuality===undefined || ['balanced','high'].includes(e.roomQuality as string));
 ensure(['memoryLighting','soundGeography','displayCaseLit'].every(k=>e[k]===undefined||typeof e[k]==='boolean'));
 ensure(e.roomTheme===undefined || ['woodland','beachfront'].includes(e.roomTheme as string));
 ensure(e.furniture===undefined||validFurnitureChoices(e.furniture));
 ensure(e.coastalWindowOpen===undefined || typeof e.coastalWindowOpen==='boolean');
 ensure(s.ownedRoomThemes===undefined||strings(s.ownedRoomThemes)&&(s.ownedRoomThemes as string[]).every(id=>['woodland','beachfront'].includes(id))&&new Set(s.ownedRoomThemes as string[]).size===(s.ownedRoomThemes as string[]).length);
 ensure(e.crtColor!=='coastal'||ownsRoomTheme(s as unknown as AppState,'beachfront'));
 ensure(['lampOn','ceilingOn','shelfLit','musicOn','pinsLocked'].every(k=>typeof e[k]==='boolean')&&['volume','ambienceVolume'].every(k=>number(e[k])&&(e[k] as number)>=0&&(e[k] as number)<=1));
 ensure(s.latestPrint===undefined || object(s.latestPrint)&&image(s.latestPrint.src)&&number(s.latestPrint.printedAt));
 ensure(s.roomDecor===undefined||object(s.roomDecor)&&strings(s.roomDecor.owned)&&(s.roomDecor.owned as string[]).every(id=>SHOP_GOODS.some(g=>g.id===id))&&new Set(s.roomDecor.owned as string[]).size===(s.roomDecor.owned as string[]).length&&(s.roomDecor.sillItem===undefined||string(s.roomDecor.sillItem)&&(s.roomDecor.owned as string[]).includes(s.roomDecor.sillItem as string)&&ROOM_GOODS.some(i=>i.id===(s.roomDecor as RecordValue).sillItem)));
 if(object(s.roomDecor))ensure(s.roomDecor.posterItem===undefined||string(s.roomDecor.posterItem)&&(s.roomDecor.owned as string[]).includes(s.roomDecor.posterItem as string)&&EXTRA_GOODS.some(i=>i.id===(s.roomDecor as RecordValue).posterItem&&i.kind==='Poster'));
 if(object(s.roomDecor)&&s.roomDecor.layouts!==undefined){
   ensure(object(s.roomDecor.layouts));
   const owned=s.roomDecor.owned as string[];
   for(const [theme,layout] of Object.entries(s.roomDecor.layouts)){
     ensure(['woodland','beachfront'].includes(theme)&&object(layout));
     ensure(layout.crtColor===undefined||string(layout.crtColor)&&Object.hasOwn(CRT_COLORS,layout.crtColor as string));
     ensure(layout.crtColor!=='coastal'||ownsRoomTheme(s as unknown as AppState,'beachfront'));
     ensure(layout.sillItem===undefined||string(layout.sillItem)&&owned.includes(layout.sillItem as string)&&ROOM_GOODS.some(i=>i.id===layout.sillItem));
     ensure(layout.posterItem===undefined||string(layout.posterItem)&&owned.includes(layout.posterItem as string)&&EXTRA_GOODS.some(i=>i.id===layout.posterItem&&i.kind==='Poster'));
   }
 }
 ensure(s.framePhotoId===undefined||string(s.framePhotoId));
 ensure(s.achievementBaseline===undefined||object(s.achievementBaseline)&&['elements','books','pins','guests'].every(k=>strings((s.achievementBaseline as RecordValue)[k])));
 ensure(s.discoveries===undefined||object(s.discoveries)&&['quiet','occasional','off'].includes(s.discoveries.frequency as string)&&typeof s.discoveries.hints==='boolean'&&(s.discoveries.guestNotesOnDesk===undefined||typeof s.discoveries.guestNotesOnDesk==='boolean')&&['lastFoundAt','lastVisitAt'].every(k=>s.discoveries&&((s.discoveries as RecordValue)[k]===undefined||number((s.discoveries as RecordValue)[k])))&&records(s.discoveries.entries,d=>string(d.id)&&string(d.title)&&string(d.text)&&PLACES.some(p=>p.id===d.location)&&number(d.appearedAt)&&['foundAt','readAt','keptAt'].every(k=>d[k]===undefined||number(d[k]))&&['bookId','pageId','story','author','guestEntryId'].every(k=>d[k]===undefined||string(d[k]))&&(d.delivery===undefined||['desk','book'].includes(d.delivery as string))&&(d.reward===undefined||string(d.reward)&&Object.hasOwn(REWARDS,d.reward))));
 ensure(e.soundCloudUrl===undefined||string(e.soundCloudUrl)&&soundCloudUrl(e.soundCloudUrl)!==null);
 if(object(s.discoveries)){const entries=s.discoveries.entries as {id:string;keptAt?:number}[];ensure(new Set(entries.map(e=>e.id)).size===entries.length&&entries.filter(e=>!e.keptAt).length<=1);}
 ensure((s.pins as RecordValue[]).every(p=>(p.bookId===undefined||string(p.bookId))&&(p.pageId===undefined||string(p.pageId))));
 ensure(s.progress.printedToBook===undefined||typeof s.progress.printedToBook==='boolean');
 return s as unknown as AppState;
}
export function serializeRoom(state:AppState){if(state.archive.some(p=>p.original&&!state.originalFiles?.[p.original.key]))throw new Error('Load preserved originals before serializing this backup.');return JSON.stringify({format:'keepsake-room',backupVersion:1,savedAt:new Date().toISOString(),state});}
export async function downloadRoom(state:AppState){
 const text=serializeRoom(await withOriginalFiles(state));
 if(new Blob([text]).size>250*1024*1024)throw new Error('This room exceeds the current 250 MB backup limit. Download original files individually; large-library backup support is still needed.');
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`keepsake-room-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),10000);
}

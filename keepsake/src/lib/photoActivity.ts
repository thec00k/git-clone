import type {AppState,ArchivePhoto} from '../types/app';
const DAY=86400000;
export function usedPhotoIds(s:AppState){const ids=new Set<string>(),sources=new Set(s.pins.map(p=>p.photoSrc));if(s.latestPrint)sources.add(s.latestPrint.src);for(const b of s.books)for(const p of b.pages)for(const e of p.elements)if(e.type==='photo'){if(e.photoId)ids.add(e.photoId);sources.add(e.src);}for(const p of s.archive)if(sources.has(p.src))ids.add(p.id);return ids;}
export function recordPhotoActivity(before:AppState,after:AppState,now=Date.now()):AppState{
 if(before.books===after.books&&before.archive===after.archive&&before.pins===after.pins&&before.latestPrint===after.latestPrint)return after;
 const used=usedPhotoIds(after),old=new Map(before.archive.map(p=>[p.id,p]));
 return {...after,archive:after.archive.map(p=>{if(!p.activity)return p;const prev=old.get(p.id);return used.has(p.id)||p.favorite||p.categories.length>0||prev&&(prev.favorite!==p.favorite||JSON.stringify(prev.categories)!==JSON.stringify(p.categories))?{...p,activity:{...p.activity,lastMeaningfulAt:now}}:p;})};
}
export function foundPhotos(s:AppState,now=Date.now()):ArchivePhoto[]{
 if(s.profile.foundPhotos===false||now-(s.profile.lastFoundPhotosAt??0)<30*DAY)return [];
 const used=usedPhotoIds(s);
 return s.archive.filter(p=>p.activity&&!p.activity.dismissed&&!p.activity.lastMeaningfulAt&&!p.favorite&&!p.categories.length&&!used.has(p.id)&&now-p.createdAt>=30*DAY).sort((a,b)=>a.createdAt-b.createdAt).slice(0,3);
}

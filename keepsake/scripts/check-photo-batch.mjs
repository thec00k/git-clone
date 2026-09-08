import assert from 'node:assert/strict';
import {insertPhotoBatch} from '../src/lib/photoBatch.ts';
const original={id:'b',pages:[{id:'cover',titlePage:true,elements:[]},{id:'blank',elements:[]},{id:'notes',elements:[{id:'note',type:'caption',text:'keep me'}]}]};
const photos=Array.from({length:20},(_,i)=>({src:`photo-${i}`,photoId:`p${i}`,aspect:i%2?.5:2}));
const before=structuredClone(original);
for(const count of [1,4,5,19,20]){
 const result=insertPhotoBatch(original,'blank',photos.slice(0,count));
 const pages=result.book.pages.slice(1,1+Math.ceil(count/4));
 assert.equal(pages.length,Math.ceil(count/4));
 assert.deepEqual(pages.flatMap(p=>p.elements.map(e=>e.src)),photos.slice(0,count).map(p=>p.src));
 for(const page of pages){assert.ok(page.elements.length<=4);assert.ok(page.elements.every(p=>p.w===40&&p.rotation===0&&p.cropAspect===1));assert.equal(new Set(page.elements.map(p=>`${p.x},${p.y}`)).size,page.elements.length);}
 assert.deepEqual(result.book.pages.at(-1),original.pages[2]);
}
assert.deepEqual(original,before,'Batch must not mutate the original book (undo snapshot)');
const occupied=insertPhotoBatch(original,'notes',photos);assert.deepEqual(occupied.book.pages[2],original.pages[2]);assert.equal(occupied.book.pages.length,8);
const title=insertPhotoBatch(original,'cover',photos.slice(0,4));assert.deepEqual(title.book.pages[0],original.pages[0]);
assert.throws(()=>insertPhotoBatch(original,'missing',photos));assert.throws(()=>insertPhotoBatch(original,'blank',[]));assert.throws(()=>insertPhotoBatch(original,'blank',[...photos,photos[0]]));
console.log('Photo batches: limit, selection order, 4 per page, equal frames, blank reuse and preservation of existing content passed.');

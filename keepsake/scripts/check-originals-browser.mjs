import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{})});
try{
 const c=await browser.newContext(),p=await c.newPage();
 await c.route('**/originals-review.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Original preservation test</title>'}));
 await p.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:5179')+'/originals-review.html');
 const result=await p.evaluate(async()=>{
  const {loadImageFile}=await import('/src/lib/image.ts'),o=await import('/src/lib/originalPhotos.ts'),b=await import('/src/lib/roomBackup.ts'),storage=await import('/src/lib/storage.ts');
  const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1500;canvas.getContext('2d').fillRect(0,0,2000,1500);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png')),file=new File([blob],'memory.png',{type:'image/png'});
  const kept=await loadImageFile(file),small=await loadImageFile(file,false),again=await loadImageFile(file);
  const s=(await import('/src/data/seed.ts')).createSeed();s.archive=[{id:'test-original',src:kept.src,aspect:kept.aspect,original:kept.original,createdAt:1,categories:[],favorite:false}];s.profile.preserveOriginals=false;
  await storage.loadState();await storage.saveState(s);const loaded=await storage.loadState();
  const packed=await o.withOriginalFiles(loaded);const serialized=b.serializeRoom(packed);const restored=await o.restoreOriginalFiles(b.parseRoomBackup(serialized));
  const bytes=await (await o.readOriginal(restored.archive[0].original)).arrayBuffer();
  let missing=false,tampered=false;
  try{b.serializeRoom(s);}catch{missing=true;}
  const broken=structuredClone(packed);broken.originalFiles[kept.original.key]='data:image/png;base64,AAAA';try{await o.restoreOriginalFiles(broken);}catch{tampered=true;}
  const image=new Image();image.src=kept.src;await image.decode();
  return {originalEqual:Array.from(new Uint8Array(bytes)).join(',')===Array.from(new Uint8Array(await file.arrayBuffer())).join(','),width:image.width,small:!small.original,dedup:again.original.key===kept.original.key,missing,tampered,clean:!restored.originalFiles,preference:loaded.profile.preserveOriginals,metadataOnly:!JSON.stringify(loaded).includes('originalFiles')};
 });
 assert.deepEqual(result,{originalEqual:true,width:1400,small:true,dedup:true,missing:true,tampered:true,clean:true,preference:false,metadataOnly:true});
 console.log('PASS originals: exact bytes, display resize, opt-out, deduplication, save/reload, portable restore, corruption rejection and preference persistence.');await c.close();
}finally{await browser.close();}

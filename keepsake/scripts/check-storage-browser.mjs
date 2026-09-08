import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{}),args:['--enable-unsafe-swiftshader']});
const base='http://127.0.0.1:5178';
try{
 const context=await browser.newContext();
 await context.route('**/storage-review.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated storage test</title>'}));
 const a=await context.newPage();await a.goto(base+'/storage-review.html');
 await a.evaluate(async()=>{
  const {createSeed}=await import('/src/data/seed.ts');const s=createSeed();s.profile.displayName='Legacy room';
  const src='data:image/png;base64,dGVzdA==';s.archive[0].src=src;s.latestPrint={src,printedAt:1};
  await new Promise((resolve,reject)=>{const r=indexedDB.open('keepsake',2);r.onupgradeneeded=()=>r.result.createObjectStore('app');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('app','readwrite');tx.objectStore('app').put(s,'state');tx.oncomplete=()=>{db.close();resolve();};};});
 });
 const result=await a.evaluate(async()=>{
  const storage=await import('/src/lib/storage.ts');const s=await storage.loadState();await storage.saveState(s);
  const restored=await storage.loadState();
  const raw=await new Promise(resolve=>{const r=indexedDB.open('keepsake',3);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['app','images'],'readonly');const read=tx.objectStore('app').get('state'),count=tx.objectStore('images').count();tx.oncomplete=()=>{resolve({text:JSON.stringify(read.result),count:count.result});db.close();};};});
  return {raw,name:restored.profile.displayName,src:restored.archive[0].src,print:restored.latestPrint.src};
 });
 assert.equal(result.name,'Legacy room');assert.equal(result.src,result.print);assert.equal(result.raw.count,1);assert.ok(!result.raw.text.includes('data:image/'));assert.ok(result.raw.text.includes('keepsake-asset:'));
 const b=await context.newPage();await b.goto(base+'/storage-review.html');await b.evaluate(async()=>{window.stale=await (await import('/src/lib/storage.ts')).loadState();});
 await a.evaluate(async()=>{const m=await import('/src/lib/storage.ts');const s=await m.loadState();s.profile.displayName='Newer room';await m.saveState(s);});
 const conflict=await b.evaluate(async()=>{const m=await import('/src/lib/storage.ts');try{await m.saveState(window.stale);return false;}catch(e){return e instanceof m.SaveConflict;}});assert.equal(conflict,true);
 assert.equal(await a.evaluate(async()=> (await (await import('/src/lib/storage.ts')).loadState()).profile.displayName),'Newer room');
 // A read failure must reject rather than being mistaken for an empty room.
 const readFailure=await b.evaluate(async()=>{const original=indexedDB.open.bind(indexedDB);indexedDB.open=()=>{throw new Error('Injected read failure');};try{await (await import('/src/lib/storage.ts')).loadState();return false;}catch{return true;}finally{indexedDB.open=original;}});assert.equal(readFailure,true);
 // A missing image must also stop loading, without replacing the saved record.
 await a.evaluate(async()=>new Promise(resolve=>{const r=indexedDB.open('keepsake',3);r.onsuccess=()=>{const db=r.result,tx=db.transaction('images','readwrite');tx.objectStore('images').clear();tx.oncomplete=()=>{db.close();resolve();};};}));
 assert.equal(await a.evaluate(async()=>{try{await (await import('/src/lib/storage.ts')).loadState();return false;}catch{return true;}}),true);
 await context.close();
 console.log('PASS: legacy save migration, image deduplication, hydration, atomic two-tab conflict, read failure, missing-image protection.');
 const ui=await browser.newContext();await ui.addInitScript(()=>{try{sessionStorage.setItem('ks-tour-done','1');}catch{}});
 const page=await ui.newPage();await page.goto(base);await page.getByRole('button',{name:'Open scrapbook',exact:true}).waitFor();await page.getByRole('button',{name:'Room settings',exact:true}).click();
 await page.getByLabel('Graphics quality').selectOption('high');await page.getByRole('button',{name:'Music & CRT',exact:true}).click();await page.getByLabel('Music on room entry').selectOption('off');
 await page.getByRole('button',{name:'Saving & storage',exact:true}).click();await page.getByRole('button',{name:'Save now',exact:true}).click();await page.getByRole('status').filter({hasText:'All changes saved on this device.'}).waitFor();
 await page.getByRole('button',{name:'Close room settings',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Room settings',exact:true}).click();assert.equal(await page.getByLabel('Graphics quality').inputValue(),'high');
 await page.getByRole('button',{name:'Close room settings',exact:true}).click();
 await page.getByRole('button',{name:'Open scrapbook',exact:true}).click();await page.getByRole('button',{name:'Add photo',exact:true}).click();
 const buffer=readFileSync(new URL('../public/samples/coffee.jpg',import.meta.url));
 await page.getByLabel('Select photos from device').setInputFiles(Array.from({length:20},(_,i)=>({name:`photo-${i}.jpg`,mimeType:'image/jpeg',buffer})));
 await page.getByRole('heading',{name:'Photo order · 20/20'}).waitFor();await page.getByRole('button',{name:'Add 20 photos',exact:true}).click();
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();
 await page.getByRole('button',{name:'Draw with the blue marker',exact:true}).click();await page.getByRole('slider',{name:'Marker thickness'}).fill('2.8');
 const draw=await page.locator('[data-drawing]').first().boundingBox();await page.mouse.move(draw.x+25,draw.y+25);await page.mouse.down();await page.mouse.move(draw.x+75,draw.y+75,{steps:5});await page.mouse.up();
 await page.getByRole('button',{name:'Put down the blue marker',exact:true}).click();await page.locator('summary').filter({hasText:'Pages'}).click();
 assert.ok(await page.locator('.ks-page-mini polyline[stroke="#347dc1"][stroke-width="2.8"]').count());assert.equal(await page.locator('.ks-page-mini img[style*="aspect-ratio: 1"]').count(),20);
 await page.getByRole('button',{name:'Return to the desk',exact:true}).click();await page.getByRole('button',{name:'Room settings',exact:true}).click();await page.getByRole('button',{name:'Saving & storage',exact:true}).click();await page.getByRole('button',{name:'Save now',exact:true}).click();await page.getByRole('status').filter({hasText:'All changes saved on this device.'}).waitFor();await page.getByRole('button',{name:'Close room settings',exact:true}).click();
 console.log('PASS: 20-photo import, undo/redo, thumbnails with square crops and marker strokes.');
 const second=await ui.newPage();await second.goto(base);await second.getByRole('button',{name:'Room settings',exact:true}).click();await second.getByRole('button',{name:'Help & profile',exact:true}).click();await second.getByLabel('Your name',{exact:true}).fill('Second tab');await second.getByRole('button',{name:'Saving & storage',exact:true}).click();await second.getByRole('button',{name:'Save now',exact:true}).click();await second.getByRole('status').filter({hasText:'All changes saved on this device.'}).waitFor();
 await page.getByRole('button',{name:'Room settings',exact:true}).click();await page.getByRole('button',{name:'Help & profile',exact:true}).click();await page.getByLabel('Your name',{exact:true}).fill('Unsaved first tab');await page.getByRole('heading',{name:'This room changed in another tab'}).waitFor().catch(async error=>{console.log('FIRST',await page.locator('body').innerText());console.log('SECOND',await second.locator('body').innerText());throw error;});assert.ok(await page.getByRole('button',{name:'Download this tab’s room'}).isVisible());
 await ui.close();console.log('PASS: consolidated settings, persistent graphics option, user-facing conflict recovery.');
 const fail=await browser.newContext();await fail.addInitScript(()=>{indexedDB.open=()=>{throw new Error('Injected storage failure');};});const fp=await fail.newPage();await fp.goto(base);await fp.getByRole('heading',{name:'Your room could not be opened'}).waitFor();assert.equal(await fp.getByRole('button',{name:'Open scrapbook',exact:true}).count(),0);await fail.close();console.log('PASS: loading failure blocks room creation and offers retry.');
}finally{await browser.close();}

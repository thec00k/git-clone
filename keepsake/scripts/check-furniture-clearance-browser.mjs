import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5178',output=process.env.QA_ARTIFACT_DIR;
if(output)fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{}),args:['--enable-unsafe-swiftshader']});
try{for(const room of (process.env.QA_ROOM?[process.env.QA_ROOM]:['woodland','beachfront']))for(const variant of (process.env.QA_VARIANT?[Number(process.env.QA_VARIANT)]:[1,2,3])){
 const c=await browser.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage();p.setDefaultTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const button=name=>p.getByRole('button',{name,exact:true}),menu=()=>p.locator('.ks-room-menu>summary').click();
 const shot=async name=>{if(output)await p.screenshot({path:path.join(output,`${room}-${variant}-${name}.png`)});};
 await c.route('**/fit-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Furniture clearance</title>'}));await p.goto(base+'/fit-fixture.html');
 await p.evaluate(async({room,variant})=>{const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');const s=createSeed();s.environment.roomTheme=room;s.environment.timeMode='night';s.environment.roomQuality='high';s.environment.ceilingOn=false;s.environment.lampOn=true;s.environment.shelfLit=true;s.environment.entryMusic='off';s.environment.musicOn=false;s.environment.furniture={[room]:Object.fromEntries(['desk','chair','lamp','beanbag','rug','guestbook-stand','cabinet','crt','bookshelf'].map(k=>[k,`${k}-${variant===3&&!['desk','chair','lamp'].includes(k)?2:variant}`]))};s.ownedRoomThemes=['woodland','beachfront'];s.progress.completedTour=true;await saveState(s);sessionStorage.setItem('ks-tour-done','1');},{room,variant});
 p.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log(m.text().slice(0,250));});
 await p.goto(base);
 await p.waitForFunction(()=>document.querySelector('.ks-room3d')?.dataset.furnitureLoaded?.split(',').length===9).catch(async e=>{await shot('failed');console.log(errors);throw e;});await p.waitForTimeout(2000);await shot('front');
 const measurements=await p.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const T=await import('/node_modules/.vite/deps/three.js');const scene=[..._roots.values()][0].store.getState().scene;
  const bounds=name=>{const o=scene.getObjectByName(name);return o?new T.Box3().setFromObject(o):null;};
  const rug=bounds('furniture:rug-1')??bounds('furniture:rug-2');
  const printer=bounds('Desk_Printer_Assembly'),crt=bounds('furniture:crt-1')??bounds('furniture:crt-2');
  const table=bounds('Round_top')??bounds('Tray_top'),book=bounds('Guestbook_Cover');
  return {rugSize:rug.getSize(new T.Vector3()).toArray(),printerCrtOverlap:printer.intersectsBox(crt),printerCameraOverlap:printer.intersectsBox(bounds('Desk_Camera_Assembly')),guestGap:book.min.y-table.max.y};
 });
 console.log(room,variant,measurements);assert.ok(measurements.rugSize[0]<=1.71&&measurements.rugSize[2]<=1.66&&measurements.rugSize[1]<=.017);assert.equal(measurements.printerCrtOverlap,false);assert.equal(measurements.printerCameraOverlap,false);assert.ok(measurements.guestGap>=-.002&&measurements.guestGap<.012);
 await menu();await button('Ceiling light Off').click();await menu();await p.waitForTimeout(1200);await shot('ceiling-on');await menu();await button('Ceiling light On').click();await menu();
 await button('Room settings').click();await button('day').click();await button('Close room settings').click();await p.waitForTimeout(1400);await shot('day');await button('Room settings').click();await button('night').click();await button('Close room settings').click();await p.waitForTimeout(1200);
 await menu();await button('Bookshelf').click();await menu();await p.waitForTimeout(1600);await shot('shelf');
 for(let i=0;i<4;i++){
  const point=await p.evaluate(async i=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const T=await import('/node_modules/.vite/deps/three.js');const state=[..._roots.values()][0].store.getState();const hits=[];state.scene.traverse(o=>{if(o.name.startsWith('Shelf_spine_hit_'))hits.push(o);});hits.sort((a,b)=>a.getWorldPosition(new T.Vector3()).z-b.getWorldPosition(new T.Vector3()).z);const hit=hits[i],v=hit.getWorldPosition(new T.Vector3());v.x-=.009;v.project(state.camera);const r=state.gl.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height,title:hit.userData.bookTitle};},i);
  await p.mouse.move(point.x,point.y);await p.waitForTimeout(600);await shot(`spine-${i}`);console.log('spine pointer',point,await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.outerHTML.slice(0,600),point));const title=await p.locator('.ks-shelf-book-label').innerText({timeout:10000});assert.equal(title,point.title,'The targeted spine must select its own book');await p.mouse.click(point.x,point.y);await p.getByRole('group',{name:`Selected book: ${title}`,exact:true}).waitFor();await button('Put back').click();await p.mouse.move(10,300);await p.waitForTimeout(800);
 }
 await menu();await button('Reading corner').click();await menu();await p.waitForTimeout(1600);await shot('beanbag');
 await button('Open scrapbook').click();await button('Open scrapbook').last().waitFor();await p.waitForTimeout(1500);await shot('cover');await button('Open scrapbook').last().click();await p.waitForTimeout(300);await shot('opening');await p.locator('.ks-room3d[data-workbench="editing"]').waitFor();await shot('open');
 await button('Close book').click();await p.waitForTimeout(250);await shot('closing');await p.locator('.ks-room3d[data-workbench="cover"]').waitFor();
 assert.deepEqual(errors,[]);console.log(`PASS ${room} combination ${variant}: clearances, four neighboring spine selections, opening and closing`);await c.close();
}}finally{await browser.close();}

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5178',output=process.env.QA_ARTIFACT_DIR;
if(output)fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{}),args:['--enable-unsafe-swiftshader']});
try{for(const room of ['woodland','beachfront']){
 const c=await browser.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage();p.setDefaultTimeout(45000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const button=name=>p.getByRole('button',{name,exact:true}),menu=()=>p.locator('.ks-room-menu>summary').click();
 const shot=async name=>{if(output)await p.screenshot({path:path.join(output,`${room}-${name}.png`)});};
 await c.route('**/asset-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Curated furniture</title>'}));await p.goto(base+'/asset-fixture.html');
 await p.evaluate(async room=>{const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');const s=createSeed();s.environment.roomTheme=room;s.environment.timeMode='night';s.environment.roomQuality='high';s.environment.entryMusic='off';s.environment.musicOn=false;s.environment.furniture={[room]:{lamp:'lamp-2',beanbag:'beanbag-1'}};s.ownedRoomThemes=['woodland','beachfront'];s.progress.completedTour=true;await saveState(s);sessionStorage.setItem('ks-tour-done','1');},room);
 await p.goto(base);await p.waitForFunction(()=>document.querySelector('.ks-room3d')?.dataset.furnitureLoaded==='beanbag-1,lamp-2');await p.waitForTimeout(1800);await shot('lamp-on');
 await menu();await button('Desk lamp On').click();await menu();await p.waitForTimeout(1400);await shot('lamp-off');await menu();await button('Desk lamp Off').click();await button('Reading corner').click();await menu();await p.waitForTimeout(1800);await shot('beanbag');
 await menu();await button('Return to room view').click();await menu();await button('Drawer shop').click();await button('Furniture').click();await p.getByLabel('Furniture category').selectOption('lamp');await p.getByRole('button',{name:/Original piece/}).click();await p.waitForFunction(()=>document.querySelector('.ks-room3d')?.dataset.furnitureLoaded==='beanbag-1');
 await c.route('**/room/furniture/lamp-1.glb',r=>r.abort());await p.getByRole('button',{name:/Sea-glass ceramic/}).click();await button('Place in room').click();await p.getByRole('status').filter({hasText:'That item could not load'}).waitFor();assert.equal(await p.locator('.ks-room3d').getAttribute('data-furniture-loaded'),'beanbag-1');await button('Cancel').click();
 await p.getByRole('button',{name:/Collected banker lamp/}).click();await button('Place in room').click();await p.waitForFunction(()=>document.querySelector('.ks-room3d')?.dataset.furnitureLoaded==='beanbag-1,lamp-2');await button('Close the drawer').click();assert.deepEqual(errors,[]);
 console.log(`PASS ${room}: imported furniture placement, lamp toggle, reading view, restore, failed-download preservation and replacement.`);await c.close();
}}finally{await browser.close();}

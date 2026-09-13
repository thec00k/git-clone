import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER,args:['--enable-unsafe-swiftshader']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5181';
try {for(const room of ['woodland','beachfront']) {
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',timezoneId:'America/Chicago'});const p=await context.newPage();p.setDefaultTimeout(120000);await p.routeWebSocket('**',()=>{});
 await p.route('**/fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await p.goto(base+'/fixture.html');
 await p.evaluate(async room=>{const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');const s=createSeed();s.environment.roomTheme=room;s.environment.timeMode='night';s.environment.musicOn=false;s.environment.entryMusic='off';s.progress.completedTour=true;await saveState(s);sessionStorage.setItem('ks-tour-done','1');},room);
 await p.goto(base);await p.locator('[data-clock-live="1"]').waitFor();await p.waitForTimeout(1500);
 const point=await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js')).name;const {_roots}=await import(url);const state=[..._roots.values()][0].store.getState();const obj=state.scene.getObjectByName('ks_archive_frame_mat');obj.geometry.computeBoundingBox();const v=obj.geometry.boundingBox.getCenter(state.camera.position.clone()).applyMatrix4(obj.matrixWorld);v.project(state.camera);const r=state.gl.domElement.getBoundingClientRect();return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};});
 console.log(room,point);await p.screenshot({path:"art/demo-work/frame-before.png"});await p.mouse.click(point.x,point.y);await p.getByRole('button',{name:'Remove framed photo'}).waitFor();
 await p.getByRole('button',{name:'Remove framed photo'}).click();await p.getByRole('button',{name:'Add framed photo'}).waitFor();
 await p.getByLabel('Choose framed photo').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=','base64')});
 await p.waitForFunction(()=>!document.querySelector('[aria-label="Remove framed photo"]')?.disabled);await p.screenshot({path:`art/demo-work/frame-${room}.png`});
 await p.getByRole('button',{name:'Return to room from photo'}).click();await p.getByRole('button',{name:'Return to room from photo'}).waitFor({state:'hidden'});
 await p.waitForTimeout(800);const saved=await p.evaluate(async()=>await(await import('/src/lib/storage.ts')).loadState());assert.ok(saved.archive.some(a=>a.id===saved.framePhotoId));
 console.log(`PASS ${room}: local clock in night mode, frame close-up, remove, upload, saved selection, return.`);await context.close();
}}finally{await browser.close();}

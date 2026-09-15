import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5182';
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER,args:['--enable-unsafe-swiftshader']});
try{
 const c=await browser.newContext({viewport:{width:1100,height:800},reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(90000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.routeWebSocket('**',()=>{});
 await p.route('**/fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await p.goto(base+'/fixture.html');
 await p.evaluate(async()=>{
  const {createSeed}=await import('/src/data/seed.ts'),{saveState}=await import('/src/lib/storage.ts');const s=createSeed();
  Object.assign(s.environment,{roomTheme:'sky-castle',timeMode:'day',weather:'clear',roomQuality:'balanced',musicOn:false,entryMusic:'off'});
  s.progress.completedTour=true;await saveState(s);sessionStorage.setItem('ks-tour-done','1');
 });
 await p.goto(base);await p.locator('[data-clock-live]').waitFor({timeout:180000});
 const read=source=>p.evaluate(async source=>{
  const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js')).name;
  const {_roots}=await import(url);return new Function('s',source)([..._roots.values()][0].store.getState());
 },source);
 const button=name=>p.getByRole('button',{name,exact:true});
 const info=await read(`const chest=s.scene.getObjectByName('Keepsake_TimeCapsuleChest');const lid=chest.getObjectByName('TimeCapsule_LidPivot');const glow=chest.getObjectByName('Sky_Capsule_Glow');return {gem:!!chest.getObjectByName('Sky_Capsule_Moonstone'),position:chest.position.toArray(),pivot:lid.position.toArray(),light:glow.intensity,shadow:glow.castShadow};`);
 assert.ok(info.gem);assert.deepEqual(info.position,[1.94,.002,-1.79]);assert.ok(Math.abs(info.pivot[1]-.252)<.001);assert.equal(info.light,.10);assert.equal(info.shadow,false);
 await read("window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:{position:[1.25,.87,-.68],target:[1.94,.20,-1.79]}}));");
 await p.waitForTimeout(1200);await p.screenshot({path:'art/sky-castle/review/capsule-day.png',timeout:180000});console.log('Captured capsule day');
 // Click the actual mesh through its screen projection, retaining the existing dialog.
 const hit=await read(`const v=s.camera.position.clone().set(1.94,.18,-1.56).project(s.camera);const r=s.gl.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};`);
 await p.mouse.click(hit.x,hit.y);await p.getByRole('dialog',{name:'Time capsule',exact:true}).waitFor();await button('Close time capsule').click();
 await p.locator('.ks-room-menu > summary').click();await button('Room settings').click();await button('Night').click({timeout:180000});await button('Close room settings').click();
 await p.waitForTimeout(1500);await p.screenshot({path:'art/sky-castle/review/capsule-night.png',timeout:180000});console.log('Captured capsule night');
 assert.deepEqual(errors,[]);console.log('PASS Sky capsule variant, preserved pivot, restrained non-shadow light, day/night and mesh click.');
}finally{await browser.close();}

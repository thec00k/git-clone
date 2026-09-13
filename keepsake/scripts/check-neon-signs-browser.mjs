import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER,args:['--enable-unsafe-swiftshader']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5181';
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(15000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.routeWebSocket('**',()=>{});
 await p.route('**/fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await p.goto(base+'/fixture.html');
 await p.evaluate(async()=>{const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');const s=createSeed();s.environment.roomTheme='cyberpunk';s.environment.entryMusic='off';s.environment.musicOn=false;s.progress.completedTour=true;s.ownedRoomThemes=['woodland','cyberpunk'];s.roomDecor={owned:['neon-cherries'],neonCherry:true};await saveState(s);sessionStorage.setItem('ks-tour-done','1');});
 await p.goto(base);await p.locator('[data-clock-live]').waitFor({timeout:150000});
 const button=name=>p.getByRole('button',{name,exact:true});
 const read=source=>p.evaluate(async(source)=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js')).name;const {_roots}=await import(url);return new Function('s',source)([..._roots.values()][0].store.getState());},source);
 const signs=()=>read("return ['Neon_Cherry_Sign','Neon_Heart_Sign'].filter(n=>s.scene.getObjectByName(n))");
 assert.deepEqual(await signs(),['Neon_Cherry_Sign']);
 await button('Drawer shop').click();await button('Extras').click();await button('Buy Red heart neon sign for 0 stamps').click();
 assert.deepEqual(await signs(),['Neon_Heart_Sign']);assert.equal(await button('Red heart neon sign is on the wall').isDisabled(),true);
 await button('Close the drawer').click();
 await read("window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:{position:[-1.16,1.76,-1.16],target:[-1.72,1.77,-2.045]}}));");await p.waitForTimeout(1000);await p.screenshot({path:'art/demo-work/neon-heart-sign.png'});
 await button('Drawer shop').click();await button('Extras').click();await button('Hang Cherry neon sign').click();assert.deepEqual(await signs(),['Neon_Cherry_Sign']);
 await button('Hang Red heart neon sign').click();assert.deepEqual(await signs(),['Neon_Heart_Sign']);
 await button('Put heart sign away').click();assert.deepEqual(await signs(),[]);
 assert.deepEqual(errors,[]);console.log('PASS legacy cherry placement, heart purchase, mutually exclusive switching, removal and no page errors.');
}finally{await browser.close();}

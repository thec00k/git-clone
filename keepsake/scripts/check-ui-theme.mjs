import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER,args:['--enable-unsafe-swiftshader']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5176';
try {
 for(const room of ['woodland','beachfront','cyberpunk']) {
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const p=await context.newPage();p.setDefaultTimeout(120000);
  await p.routeWebSocket('**',()=>{});
  await p.route('**/ui-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));
  await p.goto(base+'/ui-fixture.html');
  await p.evaluate(async room=>{const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');const s=createSeed();s.environment.roomTheme=room;s.environment.entryMusic='off';s.environment.musicOn=false;s.progress.completedTour=true;s.ownedRoomThemes=['woodland','beachfront','cyberpunk'];await saveState(s);sessionStorage.setItem('ks-tour-done','1');},room);
  await p.goto(base);await p.locator('.ks-room-menu>summary').click();
  await p.getByRole('tab',{name:'Atmosphere',exact:true}).click();
  const toggle=p.getByRole('switch',{name:room==='cyberpunk'?'Lava lamp':'Desk lamp',exact:true});
  const before=await toggle.getAttribute('aria-checked');await toggle.focus();await p.keyboard.press('Space');assert.notEqual(await toggle.getAttribute('aria-checked'),before);
  await p.screenshot({path:`art/demo-work/ui-${room}-menu.png`});
  await p.getByRole('tab',{name:'Atmosphere',exact:true}).focus();await p.keyboard.press('ArrowLeft');
  assert.equal(await p.getByRole('tab',{name:'Collections',exact:true}).getAttribute('aria-selected'),'true');
  await p.keyboard.press('End');assert.equal(await p.getByRole('tab',{name:'Atmosphere',exact:true}).getAttribute('aria-selected'),'true');
  await p.getByRole('button',{name:'Room settings',exact:true}).click();
  const dialog=p.getByRole('dialog',{name:'Room settings',exact:true});await dialog.waitFor();
  for(const tab of ['Room','Sound','Privacy','Storage','Help']) {await dialog.getByRole('button',{name:tab,exact:true}).click();assert.equal(await dialog.getByRole('button',{name:tab,exact:true}).getAttribute('aria-pressed'),'true');}
  await dialog.getByRole('button',{name:'Room',exact:true}).click();
  await p.screenshot({path:`art/demo-work/ui-${room}-settings.png`});
  await p.setViewportSize({width:390,height:844});
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Settings must not overflow horizontally');
  await p.screenshot({path:`art/demo-work/ui-${room}-mobile.png`});
  await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await p.locator('.ks-room-menu>summary').click();
  const panel=p.locator('.ks-room-menu-panel');
  await p.screenshot({path:`art/demo-work/ui-${room}-mobile-menu.png`});
  const menuBounds=await panel.evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,width:innerWidth,scroll:el.scrollWidth,client:el.clientWidth};});
  assert.ok(menuBounds.top>=0&&menuBounds.left>=0&&menuBounds.right<=menuBounds.width&&menuBounds.scroll<=menuBounds.client+1,`Menu fits mobile viewport: ${JSON.stringify(menuBounds)}`);
  assert.ok(await p.locator('.ks-room-controls').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Action bar does not overflow');
  await p.screenshot({path:`art/demo-work/ui-${room}-mobile-menu.png`});await p.keyboard.press('Escape');
  await p.waitForFunction(async room=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js'))?.name;if(!url)return false;const {_roots}=await import(url);const scene=[..._roots.values()][0]?.store.getState().scene;let count=0;scene?.traverse(o=>{if(o.userData.refinedProp)count++;});return count===(room==='beachfront'?3:8);},room);
  await p.setViewportSize({width:1280,height:900});
  await p.getByRole('button',{name:'Drawer shop',exact:true}).click();
  const shop=p.getByRole('dialog',{name:'The drawer mini shop'});await shop.waitFor();
  await p.screenshot({path:`art/demo-work/ui-${room}-shop.png`});
  await p.keyboard.press('Escape');await shop.waitFor({state:'hidden'});
  console.log(`PASS ${room}: keyboard switch, five sections, mobile overflow, Escape.`);
  await context.close();
 }
}finally {await browser.close()}

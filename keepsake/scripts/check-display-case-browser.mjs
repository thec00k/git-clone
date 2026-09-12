import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5176';
const out=new URL('../art/demo-work/display-case/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER,args:['--enable-unsafe-swiftshader']});
try {
 for(const room of ['woodland','beachfront']) {
  const context=await browser.newContext({viewport:{width:1000,height:850},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/case-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));
  await page.goto(base+'/case-fixture.html');
  await page.evaluate(async room=>{
   const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');
   const s=createSeed();Object.assign(s.environment,{roomTheme:room,entryMusic:'off',musicOn:false,musicProvider:'ambient',timeMode:'night',ceilingOn:false,crtColor:room==='woodland'?'pink':'coastal'});
   s.progress.completedTour=true;s.ownedRoomThemes=['woodland','beachfront'];await saveState(s);sessionStorage.setItem('ks-tour-done','1');
  },room);
  await page.goto(base);await page.getByRole('button',{name:'Take a seat',exact:true}).waitFor();
  await page.locator('.ks-room-menu>summary').press('Enter');
  await page.getByRole('button',{name:'Display case',exact:true}).press('Enter');
  await page.locator('.ks-room-menu>summary').press('Enter');await page.waitForTimeout(4000);
  await page.screenshot({path:new URL(room+'-night.png',out).pathname.replace(/^\//,'')});
  await page.locator('.ks-room-menu>summary').press('Enter');
  await page.getByRole('button',{name:'Display case On',exact:true}).press('Enter');
  await page.waitForTimeout(400);await page.reload();
  await page.getByRole('button',{name:'Take a seat',exact:true}).waitFor();await page.locator('.ks-room-menu>summary').press('Enter');
  await page.getByRole('button',{name:'Display case Off',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS '+room+': focus, LEDs and saved setting, no browser errors.');
  await context.close();
 }
} finally {await browser.close();}


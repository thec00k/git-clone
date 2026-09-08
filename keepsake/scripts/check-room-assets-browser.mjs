import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {roomAssets} from '../src/generated/roomAssets.ts';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='http://127.0.0.1:5178';
const output=process.env.TEST_ARTIFACT_DIR;
if(output)fs.mkdirSync(output,{recursive:true});
for(const room of ['woodland','beachfront']) {
  const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{}),args:['--enable-unsafe-swiftshader']});
  try {
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    await context.addInitScript(()=>{try{sessionStorage.setItem('ks-tour-done','1')}catch{}});
    await context.route('**/asset-fixture.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated asset test</title>'}));
    const p=await context.newPage();p.setDefaultTimeout(60000);
    const errors=[],requests=[];
    p.on('pageerror',error=>errors.push(error.message));
    p.on('request',request=>{if(request.url().includes('.glb'))requests.push(request.url());});
    const button=name=>p.getByRole('button',{name,exact:true});
    const ready=()=>p.locator('button[data-tour=guestbook]').waitFor({state:'visible'});
    const settings=()=>button('Room settings').click();
    await p.goto(base+'/asset-fixture.html');
    const bookId=await p.evaluate(async room=>{
      const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');
      const s=createSeed();s.environment.roomTheme=room;s.environment.roomQuality='balanced';s.environment.timeMode='day';
      s.environment.entryMusic='off';s.environment.musicOn=false;s.environment.musicProvider='ambient';
      s.ownedRoomThemes=['woodland','beachfront'];s.progress.completedTour=true;
      await saveState(s);return s.activeBookId;
    },room);
    await p.goto(base);await ready();
    assert.ok(requests.includes(base+roomAssets[room].balanced));
    if(output)await p.screenshot({path:path.join(output,`${room}-balanced.png`)});
    await button('Take a seat').click();
    await settings();await p.getByLabel('Graphics quality').selectOption('high');
    await button('Close room settings').click();
    assert.equal(await p.locator('.ks-room3d').getAttribute('data-seated'),'1','Quality change preserves seated state');
    await button('Stand up').click();await ready();
    assert.ok(requests.includes(base+roomAssets[room].high));
    if(output)await p.screenshot({path:path.join(output,`${room}-high.png`)});
    await button('Drawer shop').click();await p.getByRole('dialog',{name:'The drawer mini shop',exact:true}).waitFor();await button('Close the drawer').click();
    await button('Open scrapbook').click();await button('Edit cover and title page').waitFor();
    await button('Return to the desk').click();await ready();
    if(room==='woodland') {
      await settings();await p.getByText('Choose a room',{exact:true}).click();
      await button('Preview Beachfront').click();
      await context.route('**/beachfront.high.glb*',route=>route.abort());
      await button('Make this my room').click();
      await p.getByText('That room could not load. Your current room is still here. Please try again.',{exact:true}).waitFor();
      assert.ok((await p.locator('.ks-room-name').textContent()).includes('Woodland'));
      await context.unroute('**/beachfront.high.glb*');await button('Make this my room').click();
      await p.getByText('Your room is ready. Close the drawer to look around.',{exact:true}).waitFor();
      await button('Close room settings').click();await ready();
      assert.ok((await p.locator('.ks-room-name').textContent()).includes('Beachfront'));
      assert.ok(requests.includes(base+roomAssets.beachfront.high),'Switching preloads the selected quality');
    }
    await p.waitForTimeout(600);
    assert.equal(await p.evaluate(async()=> (await (await import('/src/lib/storage.ts')).loadState()).activeBookId),bookId);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${room}: real Balanced/High models, seated quality switch, drawer, scrapbook and saved memories.`);
  } finally {await browser.close();}
}
console.log('PASS failed High-room preload keeps the current room; retry loads the correct revision.');

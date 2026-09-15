import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5182';
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER,args:['--enable-unsafe-swiftshader']});
fs.mkdirSync('art/sky-castle/review',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(90000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text().slice(0,240));});await p.routeWebSocket('**',()=>{});
 await p.route('**/fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await p.goto(base+'/fixture.html');
 const original=await p.evaluate(async()=>{
   const {createSeed}=await import('/src/data/seed.ts'),{saveState}=await import('/src/lib/storage.ts');
   const s=createSeed();s.environment.roomTheme='sky-castle';s.environment.timeMode='day';s.environment.weather='clear';s.environment.roomQuality='balanced';s.environment.entryMusic='off';s.environment.musicOn=false;s.environment.crtColor='blue';s.progress.completedTour=true;s.ownedRoomThemes=['woodland','sky-castle'];
   s.books[0].title='A memory above the clouds';s.notes=[{id:'sky-note',text:'Keep this memory',createdAt:1}];
   s.roomDecor={...s.roomDecor,owned:[...new Set([...(s.roomDecor?.owned||[]),'fern'])],sillItem:'fern'};
   await saveState(s);sessionStorage.setItem('ks-tour-done','1');return {books:s.books,archive:s.archive,pins:s.pins,notes:s.notes,activeBookId:s.activeBookId};
 });
 await p.goto(base);await p.locator('[data-clock-live]').waitFor({timeout:180000});console.log('Sky room loaded');
 const button=name=>p.getByRole('button',{name,exact:true});
 const settings=async()=>{await p.locator('.ks-room-menu > summary').click();await button('Room settings').click();};
 const read=source=>p.evaluate(async(source)=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js')).name;const {_roots}=await import(url);return new Function('s',source)([..._roots.values()][0].store.getState());},source);
 const frame=async(name,position,target)=>{
   await read(`window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:{position:${JSON.stringify(position)},target:${JSON.stringify(target)}}}));`);
   await p.waitForTimeout(1200);await p.screenshot({path:`art/sky-castle/review/${name}.png`,timeout:180000});console.log('Captured',name);
 };
 await frame('day-room',[.10,1.55,1.6],[-.15,1.52,-1.8]);
 const preview=await read("s.gl.render(s.scene,s.camera);return s.gl.domElement.toDataURL('image/png')");fs.writeFileSync('public/room/sky-castle/preview.png',Buffer.from(preview.split(',')[1],'base64'));
 const objects=await read("return ['Sky_Window_Masonry','Sky_Cloud_Floor','Chair_Back','Desk_Top','ks_book','ks_shelf','Desk_Drawer','ks_archive_drawer','ks_chair','ks_door','Sky_Waterfall_0','World_Map_Print'].map(n=>[n,!!s.scene.getObjectByName(n)])");
 assert.ok(objects.every(([,found])=>found),JSON.stringify(objects));
 assert.deepEqual(await read("return s.scene.getObjectByName('owned-sill-decoration').position.toArray()"),[-.88,1.115,-2.063]);
 assert.equal(await read("return !s.scene.getObjectByName('Win_Sill') && !!s.scene.getObjectByName('Sky_Sill_Shelf_Left') && !!s.scene.getObjectByName('Sky_Sill_Shelf_Right')"),true);
 assert.deepEqual(await read("return s.scene.getObjectByName('Sky_Waterfalls').position.toArray()"),[-2.8,2.8,-12]);
 const reduced=await read("return s.scene.getObjectByName('Sky_Waterfall_0').material.uniforms.time.value");await p.waitForTimeout(250);assert.equal(await read("return s.scene.getObjectByName('Sky_Waterfall_0').material.uniforms.time.value"),reduced);
 await frame('window',[-.15,1.76,-.70],[-.15,2.03,-2.15]);
 await frame('crystal-furniture',[.65,1.36,.20],[-.3,.62,-1.32]);
 await frame('sill-detail',[.35,1.53,-.5],[-.05,1.19,-2.10]);
 if(process.env.SKY_CHECK!=='sill'){
 await frame('color-shelf',[-.18,1.4,.4],[2.22,1.2,-.12]);
 await frame('color-beanbag',[.55,1.6,.10],[-1.9,.7,1.4]);
 await frame('real-world-atlas',[-.68,1.88,.20],[-2.38,1.85,.05]);
 await settings();await button('Night').click({timeout:180000});await button('Close room settings').click({timeout:90000});
 await frame('night-room',[.10,1.55,1.6],[-.15,1.52,-1.8]);
 assert.equal(await read("return s.scene.getObjectByName('Sky_Waterfall_0').material.uniforms.tint.value.getHexString()"),'79afba');
 await settings();await button('Day').click();await button('Close room settings').click();
 await read("window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:null}));");
 await button('Drawer shop').click();await button('Rooms').click();await button('Preview Woodland Writing Room').click();await button('Make this my room').click();
 await p.getByText('Your room is ready. Close the drawer to look around.',{exact:true}).waitFor({timeout:180000});
 await button('Close the drawer').click();assert.equal(await read('return s.scene.environment===null'),true,'Sky environment is cleaned up when leaving');
 assert.deepEqual(await read("return s.scene.getObjectByName('owned-sill-decoration').position.toArray()"),[-.45,1.138,-2.063],'original room sill placement unchanged');
 await button('Drawer shop').click();await button('Rooms').click();await button('Preview Sky Castle').click();await button('Make this my room').click();await p.getByText('Your room is ready. Close the drawer to look around.',{exact:true}).waitFor({timeout:180000});await button('Close the drawer').click();
 await p.reload();await p.locator('[data-clock-live]').waitFor({timeout:180000});
 const saved=await p.evaluate(async()=>{const {loadState}=await import('/src/lib/storage.ts');return await loadState();});
 for(const key of Object.keys(original))assert.deepEqual(saved[key],original[key],key+' preserved through room switch and reload');
 assert.equal(saved.environment.roomTheme,'sky-castle');assert.ok(await read("return !!s.scene.getObjectByName('Sky_Window_Masonry')"));
 await button('Take a seat').click();await p.locator('[data-workbench=cover]').waitFor();await button('Return to room').click();
 assert.deepEqual(errors,[]);console.log('PASS Sky Castle renders, reduced motion, day/night, UI room switching, memory persistence, reload and chair interaction.');
 }else{
  assert.deepEqual(errors,[]);console.log('PASS split side shelves, left Extra placement, scene loading and visual captures.');
 }
}finally{await browser.close();}

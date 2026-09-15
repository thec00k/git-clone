import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5183';
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER,args:['--enable-unsafe-swiftshader']});
fs.mkdirSync('art/snowy-mountain/review',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(90000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text().slice(0,240));});await p.routeWebSocket('**',()=>{});
 // Observe actual audio contexts without enabling autoplay or touching user storage.
 await p.addInitScript(()=>{const C=window.AudioContext;window.__cabinAudio=[];window.AudioContext=class extends C{constructor(...a){super(...a);window.__cabinAudio.push(this);}};});
 await p.route('**/fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await p.goto(base+'/fixture.html');
 const original=await p.evaluate(async()=>{
  const {createSeed}=await import('/src/data/seed.ts'),{saveState}=await import('/src/lib/storage.ts');const s=createSeed();
  Object.assign(s.environment,{roomTheme:'snowy-mountain',timeMode:'day',weather:'clear',roomQuality:'balanced',entryMusic:'off',musicOn:false,ambienceVolume:.4});s.progress.completedTour=true;s.ownedRoomThemes=['woodland','snowy-mountain'];s.books[0].title='A winter memory';
  s.notes=[{id:'snow-note',text:'Keep this memory',createdAt:1}];await saveState(s);sessionStorage.setItem('ks-tour-done','1');
  return {books:s.books,archive:s.archive,pins:s.pins,notes:s.notes,activeBookId:s.activeBookId};
 });
 await p.goto(base);await p.locator('[data-clock-live]').waitFor({timeout:180000});console.log('Cabin loaded');
 const button=name=>p.getByRole('button',{name,exact:true});
 const read=source=>p.evaluate(async(source)=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@react-three_fiber.js')).name;const {_roots}=await import(url);return new Function('s',source)([..._roots.values()][0].store.getState());},source);
 const frame=async(name,position,target)=>{await read(`window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:{position:${JSON.stringify(position)},target:${JSON.stringify(target)}}}));`);await p.waitForTimeout(1000);await p.screenshot({path:`art/snowy-mountain/review/${name}.png`,timeout:180000});console.log('Captured',name);};
 const settings=async()=>{await p.locator('.ks-room-menu > summary').click();await button('Room settings').click();};
 const setPhase=async name=>{await settings();await button(name).click();await button('Close room settings').click();};
 await frame('day-room',[.65,1.62,1.6],[-.15,1.77,-1.8]);
 const preview=await read("s.gl.render(s.scene,s.camera);return s.gl.domElement.toDataURL('image/png')");fs.writeFileSync('public/room/snowy-mountain/preview.png',Buffer.from(preview.split(',')[1],'base64'));
 assert.equal(await read("return ['Cabin_Window_Triangle','Cabin_Window_Reveal','Cabin_Hide_Rug','Chair_Fur_Back','Lamp_Glass','Cabin_Flames','Cabin_Aurora','Cabin_Hearth','World_Map_Print'].every(n=>s.scene.getObjectByName(n))"),true);
 assert.equal(await read("return s.scene.getObjectByName('Cabin_Aurora').visible"),false);
 assert.ok(await read("return s.camera.far>=100"),'Sky and distant ridges stay inside camera range');
 await frame('fireplace',[.55,1.6,-.45],[-.90,1.13,2.05]);
 await frame('chair-rug',[.92,1.62,.95],[-.10,.40,-.20]);
 await frame('clock-behind-chair',[.25,1.30,1.05],[-.67,.80,-1.99]);
 assert.equal(await p.locator('[data-clock-face]').isVisible(),false,'Chair hides the clock face when it crosses the sightline');
 await frame('lantern',[-.33,1.26,-1.10],[-.86,.95,-1.86]);
 await frame('valley',[.1,1.70,-.9],[.2,1.5,-12]);
 await frame('roof-window',[.35,2.35,.70],[-.1,3.48,-2.1]);
 await frame('display-case',[-.35,1.38,-.65],[1.84,1.07,1.4]);
 assert.deepEqual(await read("return s.scene.getObjectByName('Keepsake_ArtifactDisplayCase').position.toArray()"),[1.84,0,1.4]);
 assert.equal(await read("return !!s.scene.getObjectByName('Case_PaintedTimber').material.map"),true,'Cabin case uses cedar texture');
 assert.equal(await read("let n=0;s.scene.traverse(o=>{if(o.name.startsWith('Case_DoorPivot_'))n++;});return n"),4,'One hinge per glass door after Strict Mode mount');
 const handle=await read("const root=s.scene.getObjectByName('Keepsake_ArtifactDisplayCase');const p=root.localToWorld(root.position.clone().set(-.022,.6125,.224)).project(s.camera);return [(p.x+1)*720,(1-p.y)*480]");
 await p.mouse.click(...handle);await p.getByRole('button',{name:'Add model to shelf 1, space 1',exact:true}).waitFor();
 for(let frame=0;frame<20;frame++){if(await read("return Math.abs(s.scene.getObjectByName('Case_DoorPivot_0').rotation.y)>1.7"))break;await p.waitForTimeout(100);}
 assert.ok(await read("return Math.abs(s.scene.getObjectByName('Case_DoorPivot_0').rotation.y)>1.7"),'Case doors retain opening animation');
 await p.screenshot({path:'art/snowy-mountain/review/display-case-open.png',timeout:180000});
 await p.mouse.click(...handle);
 assert.equal(await read("return s.scene.getObjectByName('Cabin_Deer_Mount').visible||s.scene.getObjectByName('Cabin_Bear_Mount').visible"),false,'Mounts are optional');
 await button('Drawer shop').click();await button('Extras').click();
 await button('Add Deer taxidermy mount').click();await button('Add Bear taxidermy mount').click();await button('Close the drawer').click();
 assert.equal(await read("return s.scene.getObjectByName('Cabin_Deer_Mount').visible&&s.scene.getObjectByName('Cabin_Bear_Mount').visible"),true);
 await frame('wall-mounts',[.35,1.62,1.6],[-.15,2,-2]);
 await setPhase('Dusk');await frame('dusk-room',[.35,1.64,1.6],[-.15,1.92,-2]);
 assert.equal(await read("return s.scene.getObjectByName('Cabin_Aurora').visible"),true);
 assert.equal(await read("return s.scene.getObjectByName('Cabin_Aurora').material.uniforms.strength.value"),.6);
 await setPhase('Night');await frame('night-room',[.35,1.64,1.6],[-.15,1.92,-2]);
 assert.equal(await read("return s.scene.getObjectByName('Cabin_Aurora').material.uniforms.strength.value"),1);
 const times=await read("return ['Cabin_Aurora','Cabin_Flames','Cabin_River'].map(n=>s.scene.getObjectByName(n).material.uniforms.time.value)");await p.waitForTimeout(200);assert.deepEqual(await read("return ['Cabin_Aurora','Cabin_Flames','Cabin_River'].map(n=>s.scene.getObjectByName(n).material.uniforms.time.value)"),times,'Reduced motion freezes fire, aurora and river');
 if(process.env.SNOW_CHECK==='visual'){assert.deepEqual(errors,[]);console.log('PASS cabin visuals and phase/reduced-motion checks');}
 else{
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(200);
  assert.ok(await read("return s.scene.getObjectByName('Cabin_Flames').material.uniforms.time.value>0"));
  await p.locator('.ks-room-menu > summary').click();await p.getByRole('tab',{name:'Atmosphere',exact:true}).click();
  await p.getByRole('switch',{name:'Fireplace sound',exact:true}).click();
  assert.ok(await p.evaluate(()=>window.__cabinAudio.some(c=>c.state==='suspended')),'Mute suspends the fireplace context');
  await p.getByRole('switch',{name:'Fireplace sound',exact:true}).click();await button('Close room menu').click();
  // The sound switch and closing its menu are genuine user gestures.
  assert.ok(await p.evaluate(()=>window.__cabinAudio.some(c=>c.state==='running')),'Fire audio runs after gesture');
  await setPhase('Day');
  await read("window.dispatchEvent(new CustomEvent('ks-frame-view',{detail:null}));");
  await button('Drawer shop').click();await button('Rooms').click();await button('Preview Woodland Writing Room').click();await button('Make this my room').click();await p.getByText('Your room is ready. Close the drawer to look around.',{exact:true}).waitFor({timeout:180000});await button('Close the drawer').click();
  assert.equal(await read("return !!s.scene.getObjectByName('Cabin_Atmosphere')"),false);
  assert.deepEqual(await read("return s.scene.getObjectByName('Keepsake_ArtifactDisplayCase').position.toArray()"),[2.03,0,1.65],'Woodland keeps original case placement');
  assert.equal(await read("return !!s.scene.getObjectByName('Case_PaintedTimber').material.map"),false,'Woodland keeps original case finish');
  assert.ok(await p.evaluate(()=>window.__cabinAudio.some(c=>c.state==='closed')),'Fire audio context closes on leaving');
  await button('Drawer shop').click();await button('Rooms').click();await button('Preview Snowy Mountain').click();await button('Make this my room').click();await p.getByText('Your room is ready. Close the drawer to look around.',{exact:true}).waitFor({timeout:180000});await button('Close the drawer').click();
  await p.reload();await p.locator('[data-clock-live]').waitFor({timeout:180000});const saved=await p.evaluate(async()=>{const {loadState}=await import('/src/lib/storage.ts');return await loadState();});for(const key of Object.keys(original))assert.deepEqual(saved[key],original[key],key+' survives switching and reload');
  assert.equal(saved.environment.roomTheme,'snowy-mountain');
  assert.deepEqual(saved.roomDecor.cabinMounts,['cabin-deer','cabin-bear']);
  await button('Drawer shop').click();await button('Extras').click();await button('Put away Deer taxidermy mount').click();await button('Close the drawer').click();
  assert.equal(await read("return s.scene.getObjectByName('Cabin_Deer_Mount').visible"),false);assert.equal(await read("return s.scene.getObjectByName('Cabin_Bear_Mount').visible"),true);
  await button('Take a seat').click();await p.locator('[data-workbench=cover]').waitFor();await button('Return to room').click();
  assert.deepEqual(errors,[]);console.log('PASS cabin phase, motion, audio lifecycle, switching, memories, reload, chair and book interaction');
 }
}finally{await browser.close();}

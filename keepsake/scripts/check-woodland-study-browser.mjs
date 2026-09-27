import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const poses=JSON.parse(await readFile(new URL('../src/generated/woodlandStudy.json',import.meta.url)));
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5184';
const out=new URL('../art/woodland-study/review/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.TEST_CHANNEL||'msedge',args:['--enable-unsafe-swiftshader']});
const report={checks:[],captures:[],textureCounts:[],errors:[],metrics:null};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const p=await context.newPage();p.setDefaultTimeout(60000);
 p.on('pageerror',e=>report.errors.push(e.message));
 await p.routeWebSocket('**',()=>{});
 await p.route('**/study-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Study fixture</title>'}));
 await p.goto(base+'/study-fixture.html');
 await p.evaluate(async()=>{
  const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');
  const s=createSeed();s.environment.roomTheme='woodland';s.environment.entryMusic='off';s.environment.musicOn=false;s.environment.musicProvider='ambient';s.environment.timeMode='dusk';s.progress.completedTour=true;
  s.timeCapsules=[{id:'study-capsule',title:'A future winter',createdAt:1700000000000,opensAt:2200000000000,photos:[{src:s.archive[0].src}]}];
  const {newCardBinder}=await import('/src/lib/cardBinders.ts');s.cardBinders=[newCardBinder()];
  s.displayCaseScans=[{id:'study-artifact',title:'Miniature scrapbook',modelSrc:'/room/shared/scrapbook.glb',shelf:0,slot:0}];
  s.ownedRoomThemes=['woodland','beachfront','cyberpunk'];await saveState(s);sessionStorage.setItem('ks-tour-done','1');
 });
 await p.goto(base+'/?study=woodland');
 const host=p.locator('.ks-room3d');
 const button=name=>p.getByRole('button',{name,exact:true});
 const check=msg=>{report.checks.push(msg);console.log('PASS',msg);};
 const capture=async name=>{await p.screenshot({path:fileURLToPath(new URL(name+'.png',out))});report.captures.push(name);};
 const settle=async key=>{
  const expected=poses[key];await p.waitForFunction(({pos,fov})=>{
   const el=document.querySelector('.ks-room3d');const actual=(el?.getAttribute('data-cam')||'').split(',').map(Number);
   return actual.length===3&&actual.every((v,i)=>Math.abs(v-pos[i])<.018)&&Math.abs(Number(el.getAttribute('data-fov'))-fov)<.05;
  },{pos:expected.position,fov:expected.fov});
 };
 await settle('establishing');check('Study loads at the authored height without standing-height clamp.');
 for(const [name,id] of [['Room view','establishing'],['Desk view','desk'],['Window view','window']]){
  await button(name).click();await settle(id);await capture('desktop-'+id);
 }
 check('All three desktop camera endpoints and FOVs settle.');
 await button('Room view').click();await button('Window view').click();await button('Desk view').click();await settle('desk');
 check('Rapid view changes finish at the latest requested camera.');
 await button('Window view').focus();await p.keyboard.press('Space');await settle('window');
 await p.keyboard.press('ArrowUp');await settle('window');check('Named views work with the keyboard; arrow keys do not move an authored camera.');
 await p.getByLabel('Season',{exact:true}).selectOption('winter');
 await p.getByLabel('Light',{exact:true}).selectOption('night');await capture('desktop-winter-night');
 await p.getByLabel('Light',{exact:true}).selectOption('day');await capture('desktop-winter-day');
 await p.getByLabel('Season',{exact:true}).selectOption('autumn');
 await p.getByLabel('Light',{exact:true}).selectOption('dusk');
 await button('Take a seat').click();await p.locator('.ks-room3d[data-workbench=cover]').waitFor();
 await p.getByLabel('Book title',{exact:true}).fill('Woodland proof memory');
 await button('Open scrapbook').click();await p.locator('.ks-room3d[data-workbench=editing]').waitFor();
 await p.locator('.ks-workbench-pages .ks-page').last().waitFor();await capture('desktop-editor');
 await button('Next spread').click();await p.getByText('Spread 2 of 2',{exact:true}).waitFor();
 await button('Previous spread').click();await p.getByText('Spread 1 of 2',{exact:true}).waitFor();
 const photo=p.locator('.ks-workbench-pages .ks-el[aria-label=Photograph]').last();await photo.click();
 const style=await photo.getAttribute('style'),box=await photo.boundingBox();
 await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+35,box.y+box.height/2+20,{steps:10});await p.mouse.up();
 assert.notEqual(await photo.getAttribute('style'),style);await button('Undo').click();
 check('Live scrapbook opens, edits its title, turns pages, drags a photo and undoes the change.');
 await button('Close book').click();await p.locator('.ks-room3d[data-workbench=cover]').waitFor();await button('Return to room').click();await p.locator('.ks-room3d[data-workbench=room]').waitFor();
 const memorySnapshot=async()=>p.evaluate(async()=>{
  const s=await(await import('/src/lib/storage.ts')).loadState();
  return {books:s.books,activeBookId:s.activeBookId,pins:s.pins,archive:s.archive,archiveTabs:s.archiveTabs,notes:s.notes,pinNotes:s.pinNotes,timeCapsules:s.timeCapsules,displayCaseScans:s.displayCaseScans,cardBinders:s.cardBinders,guestbook:s.guestbook};
 });
 // Opening the drawer and switching uses flushSave, so snapshots follow the persisted state.
 await button('Drawer shop').click();await button('Rooms').click();
 await p.getByLabel('Shop categories').waitFor();
 const before=await memorySnapshot();
 assert.equal(before.books.find(b=>b.id===before.activeBookId).title,'Woodland proof memory');
 for(const [preview,id] of [['Preview Beachfront','beachfront'],['Preview Neon City','cyberpunk'],['Preview Woodland Writing Room','woodland']]){
  await button(preview).click();await button('Make this my room').click();
  await p.getByRole('status').filter({hasText:'Your room is ready'}).waitFor();
  const current=await p.evaluate(async()=> (await(await import('/src/lib/storage.ts')).loadState()).environment.roomTheme);assert.equal(current,id);
  assert.deepEqual(await memorySnapshot(),before);
  assert.equal(await host.getAttribute('data-study'),id==='woodland'?'woodland':null);
 }
 await button('Close the drawer').click();check('Actual drawer-shop room switches preserve books, photos, pins, capsules, binders and artifact records; other rooms ignore the study route.');
 await p.reload();await settle('establishing');
 assert.deepEqual(await memorySnapshot(),before);check('Edited memories persist after reloading the study.');
 await p.emulateMedia({reducedMotion:'reduce'});
 await button('Window view').click();await settle('window');
 await p.getByLabel('Season',{exact:true}).selectOption('winter');await p.getByLabel('Light',{exact:true}).selectOption('night');
 await p.waitForTimeout(600);
 for(let i=0;i<6;i++){
  await p.getByLabel('Season',{exact:true}).selectOption(i%2?'winter':'autumn');
  await p.getByLabel('Light',{exact:true}).selectOption(i%2?'night':'day');
  await p.waitForTimeout(350);report.textureCounts.push(Number(await host.getAttribute('data-texture-count')));
 }
 assert.ok(Math.max(...report.textureCounts)-Math.min(...report.textureCounts)<=2,'Season textures must settle rather than accumulate');
 check('Six repeated season/light changes keep GPU texture counts stable.');
 await p.setViewportSize({width:390,height:844});
 for(const [name,id] of [['Room view','portraitEstablishing'],['Desk view','portraitDesk'],['Window view','portraitWindow']]){
  await button(name).click();await settle(id);await capture(id);
 }
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 check('Portrait uses its own three poses with no horizontal page overflow, including reduced motion.');
 await button('Open scrapbook').click();await p.locator('.ks-room3d[data-workbench=cover]').waitFor();await button('Open scrapbook').click();await p.locator('.ks-room3d[data-workbench=editing]').waitFor();
 await p.locator('.ks-workbench-pages .ks-el[aria-label=Photograph]').last().waitFor();await p.waitForTimeout(800);await capture('portrait-editor');
 const pageBoxes=await p.locator('.ks-workbench-pages .ks-page').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
 console.log('Portrait page bounds',pageBoxes);assert.ok(pageBoxes.every(r=>r.left>=-3&&r.right<=393),'Open pages fit within portrait width');await button('Close book').click();await p.locator('.ks-room3d[data-workbench=cover]').waitFor();await button('Return to room').click();await p.locator('.ks-room3d[data-workbench=room]').waitFor();
 check('Portrait scrapbook editor opens and returns to the room.');
 report.metrics={draws:await host.getAttribute('data-draw-calls'),triangles:await host.getAttribute('data-triangles'),textures:await host.getAttribute('data-texture-count'),renderer:'Headless Edge / software rendering; not a hardware performance benchmark'};
 assert.deepEqual(report.errors,[]);check('No browser runtime errors.');
 await context.close();
}finally{
 await writeFile(new URL('acceptance.json',out),JSON.stringify(report,null,2)+'\n');await browser.close();
}


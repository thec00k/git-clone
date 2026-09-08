import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5178';
const output=process.env.QA_ARTIFACT_DIR;if(output)fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{}),args:['--enable-unsafe-swiftshader']});
try{for(const room of ['woodland','beachfront']){
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:room==='woodland'?'no-preference':'reduce'});
 const p=await context.newPage();p.setDefaultTimeout(45000);const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
 const button=name=>p.getByRole('button',{name,exact:true});const shot=async name=>{if(output)await p.screenshot({path:path.join(output,`${room}-${name}.png`)});};
 await context.route('**/asset-fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Stationery check</title>'}));await p.goto(base+'/asset-fixture.html');
 await p.evaluate(async room=>{const {createSeed}=await import('/src/data/seed.ts');const {saveState}=await import('/src/lib/storage.ts');const s=createSeed();s.environment.roomTheme=room;s.environment.roomQuality='high';s.environment.entryMusic='off';s.environment.musicOn=false;s.environment.timeMode='day';s.ownedRoomThemes=['woodland','beachfront'];s.progress.completedTour=true;await saveState(s);sessionStorage.setItem('ks-tour-done','1');},room);
 for(const phase of ['day','dusk','night']){await p.goto(base+'/?time='+phase);await button('Open scrapbook').waitFor();await p.waitForTimeout(2200);await shot(phase);}
 await p.goto(base+'/?time=day');await button('Take a seat').click();await p.locator('[data-workbench=cover]').waitFor();await button('Open scrapbook').click();await p.locator('[data-workbench=editing]').waitFor();
 await button('Drawer shop').click();const pack=p.locator('[data-pack="keepsake-field"]');await pack.getByRole('button',{name:'Add to tin · included'}).click();await pack.locator('.ks-sticker-owned').waitFor();await shot('stickers');await button('Creative extras').click();await p.getByRole('button',{name:/Woodland field study/}).click();await p.getByRole('status').filter({hasText:'Woodland field study is in your files'}).waitFor();await button('Close the drawer').click();
 await button('Right page').click();await p.locator('.ks-book-pages-menu>summary').click();
 const paper=p.getByLabel('Paper for selected page');for(const style of ['field','tide','ruled','dots']){await paper.selectOption(style);await p.locator(`.ks-workbench-pages .ks-page[data-paper="${style}"]`).waitFor();assert.equal(await p.locator('.ks-workbench-pages .ks-page').last().getAttribute('data-paper'),style);}
 await paper.selectOption(room==='woodland'?'field':'tide');await p.locator('.ks-book-pages-menu>summary').click();
 await button('Undo').click();await p.locator('.ks-workbench-pages .ks-page[data-paper=dots]').waitFor();assert.equal(await p.locator('.ks-workbench-pages .ks-page').last().getAttribute('data-paper'),'dots');await button('Redo').click();
 await button('Stickers').click();await button('Add sticker Oak leaf').click();await shot('paper');
 await button('Export or print this book').click();assert.ok(await p.locator('.ks-print-page .ks-paper-decoration').count()>0);await button('Close export').click();
 await button('Next spread').click();if(room==='woodland')await p.locator('[data-page-animation=physical]').waitFor();await p.getByText('Spread 2 of 2',{exact:true}).waitFor();
 await p.waitForTimeout(750);
 const saved=await p.evaluate(async()=>{const {loadState}=await import('/src/lib/storage.ts');const {parseRoomBackup,serializeRoom}=await import('/src/lib/roomBackup.ts');return parseRoomBackup(serializeRoom(await loadState()));});
 assert.ok(saved.ownedStickerPacks.includes('keepsake-field'));assert.equal(saved.stamps,12,'Included artwork does not spend stamps');assert.ok(saved.archive.some(a=>a.src==='/artwork/woodland-fern-v1.png'));assert.ok(saved.books.some(b=>b.pages.some(page=>page.elements.some(e=>e.glyph==='keepsake:oak-leaf'))));assert.deepEqual(errors,[]);
 console.log(`PASS ${room}: day/dusk/night shaders, included sticker claim, paper changes/undo/redo, export, physical turn and artwork backup.`);await context.close();
}}finally{await browser.close();}

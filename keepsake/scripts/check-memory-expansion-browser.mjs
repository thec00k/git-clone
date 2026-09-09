import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{})});
try{const c=await browser.newContext(),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5179/tests/memory-expansion.html');
 const state=async()=>JSON.parse(await p.locator('[data-state]').textContent());
 await p.getByLabel('Let the open book gently tint the window light').check();await p.getByLabel(/Mood for/).selectOption('winter');
 await p.getByLabel('Quieter outside sounds').check();
 await p.locator('summary').filter({hasText:'This reminds me of'}).click();const before=await state();const target=before.books.find(b=>b.id!==before.activeBookId);
 await p.getByLabel('Link another book').selectOption(target.id);await p.getByRole('button',{name:'Keep link',exact:true}).click();assert.ok((await state()).books.find(b=>b.id===before.activeBookId).memoryLinks.includes(target.id));
 await p.getByRole('button',{name:'Seed untouched photo'}).click();await p.getByRole('button',{name:'Open found photographs envelope'}).click();assert.equal((await state()).archive[0].activity.dismissed,true);
 await p.locator('summary').filter({hasText:'Make a commemorative ticket'}).click();await p.getByLabel('Event',{exact:true}).fill('A night at the coast');await p.getByLabel('Venue',{exact:true}).fill('Seaside Hall');await p.getByLabel('Date',{exact:true}).fill('2025-08-14');await p.getByRole('button',{name:'Preview ticket'}).click();await p.getByAltText('Commemorative ticket for A night at the coast').waitFor();
 if(process.env.QA_ARTIFACT_DIR){await p.locator('[data-state]').evaluate(e=>e.style.display='none');await p.screenshot({path:process.env.QA_ARTIFACT_DIR+'/memory-tools.png',fullPage:true});}
 await p.getByRole('button',{name:'Keep in filing cabinet'}).click();let saved=await state();assert.equal(saved.archive[0].ticket.provenance,'commemorative-template');assert.equal(saved.archive[0].ticket.event,'A night at the coast');
 await p.getByRole('button',{name:'Save fixture'}).click();await p.waitForTimeout(1000);await p.reload();await p.getByLabel('Let the open book gently tint the window light').waitFor();saved=await state();assert.equal(saved.environment.memoryLighting,true);assert.equal(saved.environment.soundGeography,true);assert.equal(saved.books.find(b=>b.id===saved.activeBookId).memoryMood,'winter');assert.equal(saved.archive[0].ticket.event,'A night at the coast');assert.ok(saved.profile.lastFoundPhotosAt>0);assert.deepEqual(errors,[]);
 console.log('PASS memory settings, manual trails, found envelope, editable ticket preview/save and reload persistence.');await c.close();}finally{await browser.close();}

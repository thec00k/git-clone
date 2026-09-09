import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const b=await chromium.launch({...(process.env.TEST_BROWSER ? {executablePath:process.env.TEST_BROWSER} : {}),headless:true});
try { const p=await b.newPage();await p.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:5179') + '/tests/transforms.html');const el=p.locator('.ks-el');await el.waitFor();
const state=async()=>JSON.parse(await p.locator('output').textContent());
let r=await el.boundingBox();await p.mouse.move(r.x+3,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+53,r.y+r.height/2+20,{steps:20});assert.equal((await state()).count,0);await p.mouse.up();assert.equal((await state()).count,1);assert.ok((await state()).element.x>55);assert.equal(await p.evaluate(()=>getSelection().toString()),'');
let h=await p.locator('[data-resize="se"]').boundingBox();await p.mouse.move(h.x+h.width/2,h.y+h.height/2);await p.mouse.down();await p.mouse.move(h.x+65,h.y+35,{steps:12});await p.mouse.up();assert.ok((await state()).element.w>40);
h=await p.getByTitle('Drag to rotate (hold Shift to snap to 15°)').boundingBox();await p.mouse.move(h.x+h.width/2,h.y+10);await p.mouse.down();await p.mouse.move(h.x+65,h.y+40,{steps:12});await p.mouse.up();assert.ok(Math.abs((await state()).element.rotation)>10);assert.equal((await state()).count,3);
await p.locator('.ks-caption').dblclick();await p.locator('textarea').fill('Edited memory');await p.locator('textarea').press('Tab');assert.equal((await state()).element.text,'Edited memory');console.log('PASS: local drag, single commit, no text selection, resize, rotate, and editing');
}finally{await b.close();}

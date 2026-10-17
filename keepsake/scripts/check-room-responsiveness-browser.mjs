// Fails if the room freezes the page on load or when room toggles are used, or if the
// first view does not face the desk. Run against `vite preview` on the isolated port:
//   npm run build && npx vite preview --host 127.0.0.1 --port 5178
//   PLAYWRIGHT_MODULE=... TEST_BROWSER=... npm run check:responsiveness:browser
// Uses a fresh, muted browser profile; never touches personal room data on 5176.
// Hardware-accelerated GPUs give meaningful numbers; SwiftShader inflates them, so budgets
// can be loosened with LOAD_BLOCK_MS / TOGGLE_BLOCK_MS.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5178';
const loadBudget = Number(process.env.LOAD_BLOCK_MS || 3000), toggleBudget = Number(process.env.TOGGLE_BLOCK_MS || 1000);
const browser = await chromium.launch({headless: true, ...(process.env.TEST_BROWSER ? {executablePath: process.env.TEST_BROWSER} : {}),
  args: ['--mute-audio', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']});
try {
  const context = await browser.newContext({viewport: {width: 1280, height: 800}});
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ks-tour-done', '1'); } catch {}
    window.__long = [];
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__long.push(e.duration); }).observe({type: 'longtask', buffered: true});
  });
  const page = await context.newPage(); page.setDefaultTimeout(90000);
  const longest = () => page.evaluate(() => { const l = window.__long.splice(0); return Math.round(Math.max(0, ...l)); });
  await page.goto(base + '/');
  await page.locator('button[data-tour=guestbook]').waitFor({state: 'visible'});
  await page.waitForTimeout(8000);
  const loadBlock = await longest();
  assert.ok(loadBlock < loadBudget, `Loading blocked the page for ${loadBlock} ms (budget ${loadBudget} ms)`);
  const [yaw, pitch] = (await page.locator('.ks-room3d').getAttribute('data-look')).split(',').map(Number);
  assert.ok(Math.abs(pitch) < .25 && Math.abs(yaw) < .6, `First view should face the desk and window (yaw ${yaw}, pitch ${pitch})`);
  await page.locator('summary', {hasText: 'Room'}).click();
  await page.getByRole('tab', {name: 'Atmosphere'}).click();
  for (const name of ['Desk lamp', 'Ceiling light', 'Bookshelf lights', 'Display case']) {
    for (let i = 0; i < 2; i++) {
      await page.locator('.ks-room-menu-panel').getByText(name, {exact: true}).click();
      await page.waitForTimeout(1200);
      const block = await longest();
      assert.ok(block < toggleBudget, `Toggling ${name} blocked the page for ${block} ms (budget ${toggleBudget} ms)`);
    }
  }
  console.log(`PASS room responsiveness: load block ${loadBlock} ms, first view faces the desk, light toggles stay under ${toggleBudget} ms.`);
  await context.close();
} finally { await browser.close(); }

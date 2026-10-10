// Takes screenshots of the room at chosen dates, hours and settings, so seasonal
// changes can be looked at, not just unit-tested. Needs Playwright and a running
// dev server (see .github/workflows/browser-checks.yml):
//   TEST_BASE_URL=http://127.0.0.1:5184 SHOT_DIR=ci-shots node scripts/capture-room.mjs
// Dates are faked in the browser (page.clock), so no real calendar is needed.
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5184';
const outDir = process.env.SHOT_DIR || 'ci-shots';
await mkdir(outDir, {recursive: true});

// name, fake date (local noon), environment patch, query string
const SHOTS = JSON.parse(process.env.SHOTS_JSON || 'null') ?? [
  ['beachfront-summer-day', '2027-07-20T12:00:00', {roomTheme: 'beachfront', timeMode: 'day'}, ''],
  ['beachfront-winter-dusk', '2027-01-15T12:00:00', {roomTheme: 'beachfront', timeMode: 'dusk'}, ''],
  ['beachfront-autumn-night', '2026-10-10T12:00:00', {roomTheme: 'beachfront', timeMode: 'night'}, ''],
  ['woodland-hearth-autumn-dusk', '2026-10-10T12:00:00', {timeMode: 'dusk'}, '?view=hearth'],
  ['holiday-halloween-hearth', '2026-10-25T12:00:00', {timeMode: 'dusk'}, '?view=hearth'],
  ['holiday-christmas-hearth', '2026-12-20T12:00:00', {timeMode: 'dusk'}, '?view=hearth'],
  ['holiday-valentines-window', '2027-02-10T12:00:00', {timeMode: 'day'}, '?view=window'],
  ['holiday-easter-hearth', '2027-03-28T12:00:00', {timeMode: 'day'}, '?view=hearth'],
  ['holiday-july4-window', '2027-07-03T12:00:00', {timeMode: 'day'}, '?view=window'],
  ['beach-summer-day', '2027-07-20T12:00:00', {timeMode: 'day', roomTheme: 'beachfront'}, ''],
  ['beach-winter-dusk', '2027-01-15T12:00:00', {timeMode: 'dusk', roomTheme: 'beachfront'}, ''],
  ['beach-autumn-night', '2026-10-10T12:00:00', {timeMode: 'night', roomTheme: 'beachfront'}, ''],
  ['woodland-hearth-winter-night', '2027-01-15T12:00:00', {timeMode: 'night'}, '?view=hearth'],
];

const browser = await chromium.launch({headless: true, channel: process.env.TEST_CHANNEL || undefined, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist']});
const errors = [];
try {
  for (const [name, date, env, query] of SHOTS) {
    // Software rendering is slow: a smaller frame and reduced motion keep the page responsive.
    const context = await browser.newContext({viewport: {width: 960, height: 600}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    // Software rendering cannot keep up with a full-rate render loop and starves the page, so
    // screenshots time out. Slow animation frames to about 2 per second.
    // page.screenshot still hangs under software GL, so keep the WebGL buffer and read the canvas directly.
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, attributes) {
        if (typeof type === 'string' && type.includes('webgl')) attributes = {...(attributes || {}), preserveDrawingBuffer: true};
        return getContext.call(this, type, attributes);
      };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => setTimeout(() => raf(callback), 450);
    });
    await page.routeWebSocket('**', () => {});
    await page.clock.setFixedTime(new Date(date));
    await page.route('**/capture-fixture.html', r => r.fulfill({contentType: 'text/html', body: '<!doctype html><title>fixture</title>'}));
    await page.goto(base + '/capture-fixture.html');
    await page.evaluate(async patch => {
      const {createSeed} = await import('/src/data/seed.ts');
      const {saveState} = await import('/src/lib/storage.ts');
      const s = createSeed();
      Object.assign(s.environment, {roomTheme: 'woodland', entryMusic: 'off', musicOn: false, musicProvider: 'ambient', timeMode: 'day'}, patch);
      s.progress.completedTour = true;
      await saveState(s);
      sessionStorage.setItem('ks-tour-done', '1');
    }, env);
    await page.goto(base + '/' + query);
    await page.locator('canvas').first().waitFor();
    await page.waitForTimeout(25000); // models, textures and the first frames
    const dataUrl = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
    await writeFile(`${outDir}/${name}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('captured', name);
    await context.close();
  }
} finally {
  await browser.close();
}
if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exitCode = 1; }

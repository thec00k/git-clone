// Opens the scrapbook in the flat (non-WebGL) room with a caption in every lettering look and
// screenshots the editor and the print view. Plain DOM, so it works under software rendering.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5184';
const outDir = process.env.SHOT_DIR || 'ci-shots';
await mkdir(outDir, {recursive: true});
const LOOKS = [undefined, 'chrome', 'glow', 'rhinestone', 'bubble', 'fire', 'ice', 'ransom'];
const browser = await chromium.launch({headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']});
const errors = [];
try {
  const context = await browser.newContext({viewport: {width: 1280, height: 860}, deviceScaleFactor: 1});
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/capture-fixture.html', r => r.fulfill({contentType: 'text/html', body: '<!doctype html><title>fixture</title>'}));
  await page.goto(base + '/capture-fixture.html');
  await page.evaluate(async looks => {
    const {createSeed} = await import('/src/data/seed.ts');
    const {saveState} = await import('/src/lib/storage.ts');
    const s = createSeed();
    Object.assign(s.environment, {roomTheme: 'woodland', entryMusic: 'off', musicOn: false, musicProvider: 'ambient'});
    s.progress.completedTour = true;
    const book = s.books.find(b => b.id === s.activeBookId) ?? s.books[0];
    book.pages[0].elements = looks.map((look, i) => ({id: 'look' + i, type: 'caption', x: 50, y: 10 + i * 11, w: 80, rotation: i % 2 ? 2 : -2, z: i + 1, text: look ? 'Summer 2004' : 'Summer 2004', fontSize: 7, color: '#2c2418', ...(look ? {look} : {})}));
    await saveState(s);
    sessionStorage.setItem('ks-tour-done', '1');
  }, LOOKS);
  await page.goto(base + '/?room=flat');
  await page.getByRole('button', {name: /^Open scrapbook/}).click();
  await page.waitForTimeout(2500);
  await page.screenshot({path: `${outDir}/book-lettering.png`});
  await page.getByRole('button', {name: 'Export or print this book'}).click();
  await page.waitForTimeout(1500);
  await page.screenshot({path: `${outDir}/print-lettering.png`});
  console.log('captured book and print views');
} finally {
  await browser.close();
}
if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exitCode = 1; }

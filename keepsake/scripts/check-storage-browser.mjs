import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// The 3D room opens the book in two steps (desk hotspot, then the card's button); the hotspot sits under the
// canvas, so click it in the page instead of at its screen position.
async function openBook(page) {
  const open = () =>
    page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')].filter(
        b => (b.getAttribute('aria-label') ?? b.textContent.trim()) === 'Open scrapbook',
      );
      buttons.at(-1)?.click();
    });
  await open();
  await page.getByRole('button', {name: 'Return to room', exact: true}).waitFor();
  await open();
}

// The flat room has a "Room settings" button; the 3D room opens the same panel from its window hotspot.
async function openSettings(page) {
  const button = page.getByRole('button', {name: 'Room settings', exact: true});
  if (await button.count()) return button.click();
  await page
    .locator('[aria-label="Window and room settings"]')
    .first()
    .evaluate(el => el.click());
}
const browser = await chromium.launch({
  headless: true,
  ...(process.env.TEST_BROWSER ? {executablePath: process.env.TEST_BROWSER} : {}),
  args: ['--enable-unsafe-swiftshader'],
});
const base = 'http://127.0.0.1:5178';
try {
  const context = await browser.newContext();
  await context.route('**/storage-review.html', r =>
    r.fulfill({contentType: 'text/html', body: '<!doctype html><title>Isolated storage test</title>'}),
  );
  const a = await context.newPage();
  await a.goto(base + '/storage-review.html');
  await a.evaluate(async () => {
    const {createSeed} = await import('/src/data/seed.ts');
    const s = createSeed();
    s.profile.displayName = 'Legacy room';
    const src = 'data:image/png;base64,dGVzdA==';
    s.archive[0].src = src;
    s.latestPrint = {src, printedAt: 1};
    await new Promise((resolve, reject) => {
      const r = indexedDB.open('keepsake', 2);
      r.onupgradeneeded = () => r.result.createObjectStore('app');
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction('app', 'readwrite');
        tx.objectStore('app').put(s, 'state');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  const result = await a.evaluate(async () => {
    const storage = await import('/src/lib/storage.ts');
    const s = await storage.loadState();
    await storage.saveState(s);
    const restored = await storage.loadState();
    const raw = await new Promise(resolve => {
      const r = indexedDB.open('keepsake', 3);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction(['app', 'images'], 'readonly');
        const read = tx.objectStore('app').get('state'),
          count = tx.objectStore('images').count();
        tx.oncomplete = () => {
          resolve({text: JSON.stringify(read.result), count: count.result});
          db.close();
        };
      };
    });
    return {
      raw,
      name: restored.profile.displayName,
      src: restored.archive[0].src,
      print: restored.latestPrint.src,
    };
  });
  assert.equal(result.name, 'Legacy room');
  assert.equal(result.src, result.print);
  assert.equal(result.raw.count, 1);
  assert.ok(!result.raw.text.includes('data:image/'));
  assert.ok(result.raw.text.includes('keepsake-asset:'));
  const b = await context.newPage();
  await b.goto(base + '/storage-review.html');
  await b.evaluate(async () => {
    window.stale = await (await import('/src/lib/storage.ts')).loadState();
  });
  await a.evaluate(async () => {
    const m = await import('/src/lib/storage.ts');
    const s = await m.loadState();
    s.profile.displayName = 'Newer room';
    await m.saveState(s);
  });
  const conflict = await b.evaluate(async () => {
    const m = await import('/src/lib/storage.ts');
    try {
      await m.saveState(window.stale);
      return false;
    } catch (e) {
      return e instanceof m.SaveConflict;
    }
  });
  assert.equal(conflict, true);
  assert.equal(
    await a.evaluate(
      async () => (await (await import('/src/lib/storage.ts')).loadState()).profile.displayName,
    ),
    'Newer room',
  );
  // A read failure must reject rather than being mistaken for an empty room.
  const readFailure = await b.evaluate(async () => {
    const original = indexedDB.open.bind(indexedDB);
    indexedDB.open = () => {
      throw new Error('Injected read failure');
    };
    try {
      await (await import('/src/lib/storage.ts')).loadState();
      return false;
    } catch {
      return true;
    } finally {
      indexedDB.open = original;
    }
  });
  assert.equal(readFailure, true);
  // A missing image must also stop loading, without replacing the saved record.
  await a.evaluate(
    async () =>
      new Promise(resolve => {
        const r = indexedDB.open('keepsake', 3);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction('images', 'readwrite');
          tx.objectStore('images').clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  assert.equal(
    await a.evaluate(async () => {
      try {
        await (await import('/src/lib/storage.ts')).loadState();
        return false;
      } catch {
        return true;
      }
    }),
    true,
  );
  await context.close();
  console.log(
    'PASS: legacy save migration, image deduplication, hydration, atomic two-tab conflict, read failure, missing-image protection.',
  );
  const ui = await browser.newContext();
  // Software rendering (no GPU) makes every 3D step slow, so allow far longer than Playwright's 30 s.
  ui.setDefaultTimeout(240000);
  await ui.addInitScript(() => {
    try {
      sessionStorage.setItem('ks-tour-done', '1');
    } catch {}
  });
  const page = await ui.newPage();
  await page.goto(base);
  await page.getByRole('button', {name: 'Open scrapbook', exact: true}).waitFor();
  await openSettings(page);
  await page.getByLabel('Graphics quality').selectOption('high');
  await page.getByRole('button', {name: 'Sound', exact: true}).click();
  await page.getByLabel('Music on room entry').selectOption('off');
  await page.getByRole('button', {name: 'Storage', exact: true}).click();
  await page.getByRole('status').filter({hasText: 'All changes saved on this device.'}).waitFor();
  await page.getByRole('button', {name: 'Close room settings', exact: true}).click();
  await page.reload();
  await openSettings(page);
  assert.equal(await page.getByLabel('Graphics quality').inputValue(), 'high');
  await page.getByRole('button', {name: 'Close room settings', exact: true}).click();
  await openBook(page);
  await page.getByRole('button', {name: 'Add photo', exact: true}).click();
  const buffer = readFileSync(new URL('../public/samples/coffee.jpg', import.meta.url));
  await page
    .getByLabel('Select photos from device')
    .setInputFiles(
      Array.from({length: 20}, (_, i) => ({name: `photo-${i}.jpg`, mimeType: 'image/jpeg', buffer})),
    );
  // Uploads land in the review stack; the whole batch waits beside the book until placed.
  // Twenty photos take minutes to decode under software rendering.
  await page.getByRole('heading', {name: 'Review your photographs'}).waitFor({timeout: 900000});
  await page.getByRole('button', {name: 'Add entire batch', exact: true}).click();
  await page.getByRole('button', {name: 'Finish review', exact: true}).click();
  await page.getByRole('button', {name: /^New photographs · 20/}).waitFor();
  // The first spread's left page is the title page, which takes no photos.
  await page.getByRole('button', {name: 'Right page', exact: true}).click();
  await page.getByRole('button', {name: 'Place on selected page', exact: true}).click();
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await page.getByRole('button', {name: 'Redo', exact: true}).click();
  await page.getByRole('button', {name: 'Draw with the blue marker', exact: true}).click();
  await page.getByRole('slider', {name: 'Marker thickness'}).fill('2.8');
  // The page lies in perspective, so its bounding box's corner is off the page; draw across the middle.
  const draw = await page.locator('[data-drawing]').first().boundingBox();
  const cx = draw.x + draw.width / 2,
    cy = draw.y + draw.height / 2;
  await page.mouse.move(cx - 20, cy - 20);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy + 30, {steps: 5});
  await page.mouse.up();
  await page.getByRole('button', {name: 'Put down the blue marker', exact: true}).click();
  await page.locator('summary').filter({hasText: 'Pages'}).click();
  assert.ok(await page.locator('.ks-page-mini polyline[stroke="#347dc1"][stroke-width="2.8"]').count());
  assert.ok(await page.locator('.ks-page-mini img').count());
  // The 3D book closes with "Close book"; the flat room's editor has "Return to the desk".
  await page
    .getByRole('button', {name: /^(Close book|Return to the desk)$/})
    .first()
    .click();
  // Closing the 3D book lands on its cover; one more step returns to the room.
  await page.getByRole('button', {name: 'Return to room', exact: true}).click();
  await openSettings(page);
  await page.getByRole('button', {name: 'Storage', exact: true}).click();
  await page.getByRole('status').filter({hasText: 'All changes saved on this device.'}).waitFor();
  await page.getByRole('button', {name: 'Close room settings', exact: true}).click();
  console.log(
    'PASS: 20-photo import, placing a photo, undo/redo, thumbnails with photos and marker strokes.',
  );
  const second = await ui.newPage();
  await second.goto(base);
  await openSettings(second);
  await second.getByRole('button', {name: 'Help', exact: true}).click();
  await second.getByLabel('Your name', {exact: true}).fill('Second tab');
  await second.getByRole('button', {name: 'Storage', exact: true}).click();
  await second.getByRole('status').filter({hasText: 'All changes saved on this device.'}).waitFor();
  // The first tab had nothing unsaved, so it followed the second tab's save instead of going stale.
  await openSettings(page);
  await page.getByRole('button', {name: 'Help', exact: true}).click();
  assert.equal(await page.getByLabel('Your name', {exact: true}).inputValue(), 'Second tab');
  // Both tabs now edit at the same moment, each with the other's change still unsaved, so the second save to
  // land is stale: that tab shows the recovery screen, the other keeps working.
  await second.getByRole('button', {name: 'Help', exact: true}).click();
  await Promise.all([
    second.getByLabel('Your name', {exact: true}).fill('Second tab, again', {force: true}),
    page.getByLabel('Your name', {exact: true}).fill('First tab, again', {force: true}),
  ]);
  const recovery = tab => tab.getByRole('heading', {name: 'This room changed in another tab'});
  const stale = await Promise.any([
    recovery(page)
      .waitFor()
      .then(() => page),
    recovery(second)
      .waitFor()
      .then(() => second),
  ]).catch(async error => {
    console.log('FIRST', await page.locator('body').innerText());
    console.log('SECOND', await second.locator('body').innerText());
    throw error;
  });
  assert.ok(await stale.getByRole('button', {name: 'Download this tab’s room'}).isVisible());
  await ui.close();
  console.log('PASS: consolidated settings, persistent graphics option, user-facing conflict recovery.');
  const fail = await browser.newContext();
  await fail.addInitScript(() => {
    indexedDB.open = () => {
      throw new Error('Injected storage failure');
    };
  });
  const fp = await fail.newPage();
  await fp.goto(base);
  await fp.getByRole('heading', {name: 'Your room could not be opened'}).waitFor();
  assert.equal(await fp.getByRole('button', {name: 'Open scrapbook', exact: true}).count(), 0);
  await fail.close();
  console.log('PASS: loading failure blocks room creation and offers retry.');
} finally {
  await browser.close();
}

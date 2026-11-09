import assert from 'node:assert/strict';
import {describeImport, importBusy, importPhotos} from '../src/lib/photoImport.ts';

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {storage: {estimate: async () => ({quota: 1024 ** 3, usage: 0})}},
});
const file = (name, size = 1000) => ({name, size});
const load = async f => {
  if (f.name.startsWith('bad')) throw new Error('could not be read');
  return {src: `blob:${f.name}`, aspect: 1};
};
const run = (files, extra = {}) => {
  const added = [],
    progress = [];
  return importPhotos(files, {
    archiveCount: 0,
    preserveOriginals: true,
    add: photo => (added.push(photo.src), `id-${added.length}`),
    shouldStop: () => false,
    onProgress: (done, total) => progress.push([done, total]),
    load,
    ...extra,
  }).then(result => ({result, added, progress}));
};

// Oversized and unreadable photos are named; the rest of the batch still imports.
let {result, added, progress} = await run([
  file('a.jpg'),
  file('big.jpg', 26 * 1024 * 1024),
  file('bad.png'),
  file('c.jpg'),
]);
assert.deepEqual(result.ids, ['id-1', 'id-2']);
assert.deepEqual(added, ['blob:a.jpg', 'blob:c.jpg']);
assert.deepEqual(result.skipped, ['big.jpg (over 25 MB)', 'bad.png (could not be read)']);
assert.deepEqual(progress, [
  [0, 3],
  [1, 3],
  [2, 3],
]);
let shown = describeImport({step: 'finished', result});
assert.equal(
  shown.text,
  'Added 2 of 4 photographs. Skipped: big.jpg (over 25 MB), bad.png (could not be read).',
);
assert.equal(shown.isProblem, true);

// A clean batch is not shown as a problem.
({result} = await run([file('a.jpg')]));
assert.deepEqual(describeImport({step: 'finished', result}), {
  text: 'Added 1 of 1 photographs.',
  isProblem: false,
});

// Stop ends the batch after the current photo and says so.
let calls = 0;
({result, added} = await run([file('a.jpg'), file('b.jpg'), file('c.jpg')], {shouldStop: () => ++calls > 2}));
assert.equal(result.stopped, true);
assert.deepEqual(added, ['blob:a.jpg']);
assert.match(describeImport({step: 'finished', result}).text, /Import stopped\./);

// A full archive stops the whole batch before anything is added.
({result, added} = await run([file('a.jpg')], {archiveCount: 500}));
assert.equal(added.length, 0);
assert.ok(result.problem.length > 0);
assert.equal(describeImport({step: 'finished', result}).isProblem, true);

// Busy only while photos are being read.
assert.equal(importBusy({step: 'idle'}), false);
assert.equal(importBusy({step: 'preparing', done: 0, total: 2}), true);
assert.equal(importBusy({step: 'stopping', done: 1, total: 2}), true);
assert.equal(importBusy({step: 'finished', result}), false);
assert.equal(describeImport({step: 'preparing', done: 0, total: 2}).text, 'Preparing photo 1 of 2…');

console.log('Photo import: named skips, progress, stop, archive limit and busy states passed.');

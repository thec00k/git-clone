// Local storage: file content (photos, card art, 3D scans) is kept once, by hash, outside the room record.
// Uses fake-indexeddb (a dev dependency) to run IndexedDB in Node.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
try {
  await import('fake-indexeddb/auto');
} catch {
  if (pkg.devDependencies?.['fake-indexeddb'])
    throw new Error('fake-indexeddb is listed but not installed: run npm ci');
  console.log('Storage check skipped: fake-indexeddb is not installed yet (added by the format workflow).');
  process.exit(0);
}
const {saveState, loadState} = await import('../src/lib/storage.ts');
const photo = 'data:image/jpeg;base64,' + 'A'.repeat(4000);
const model = 'data:model/gltf-binary;base64,' + 'B'.repeat(8000);
const card = 'data:image/png;base64,' + 'C'.repeat(3000);
const state = {
  version: 1,
  archive: [{id: 'p1', src: photo}],
  books: [{id: 'b', pages: [{id: 'pg', elements: [{id: 'e', type: 'photo', src: photo}]}]}],
  displayCaseScans: [{id: 's', modelSrc: model}],
  cardBinders: [{id: 'c', coverSrc: card, cards: [{id: 'k', backSrc: card}]}],
  environment: {},
};
await saveState(state);
const raw = await new Promise((resolve, reject) => {
  const open = indexedDB.open('keepsake');
  open.onsuccess = () => {
    const r = open.result.transaction('app').objectStore('app').get('state');
    r.onsuccess = () => {
      resolve(r.result);
      open.result.close();
    };
    r.onerror = () => reject(r.error);
  };
});
const text = JSON.stringify(raw);
assert.ok(!text.includes('data:'), 'the room record holds references, not file data');
assert.equal((text.match(/keepsake-asset:/g) ?? []).length, 5, 'every file field is a reference');
const loaded = await loadState();
assert.deepEqual(loaded, state, 'loading restores every file');
// Removing a scan frees its file.
await saveState({...state, displayCaseScans: []});
const keys = await new Promise(resolve => {
  const open = indexedDB.open('keepsake');
  open.onsuccess = () => {
    const r = open.result.transaction('images').objectStore('images').getAllKeys();
    r.onsuccess = () => {
      resolve(r.result);
      open.result.close();
    };
  };
});
assert.equal(keys.length, 2, 'photo and card art remain; the removed model is deleted');
// An autosave of the room as it was before a restore can be queued behind the restore (its timer fired while
// the restore was saving). It is dropped when its turn comes, so the restored room is what stays saved.
let epoch = 2;
const restored = saveState({...state, environment: {label: 'restored'}}, () => epoch === 2);
const older = saveState({...state, environment: {label: 'older autosave'}}, () => epoch === 1);
assert.equal(await restored, true, 'the restore is written');
assert.equal(await older, false, 'the stale autosave is not written');
assert.equal(
  (await loadState()).environment.label,
  'restored',
  'an older autosave cannot overwrite a restore',
);
console.log(
  'Storage: photos, card art and 3D scans stored once by hash outside the room record; removed files are deleted; stale autosaves cannot overwrite a restore.',
);

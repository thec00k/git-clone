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
const {saveState, loadState, inlineFiles} = await import('../src/lib/storage.ts');
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
const images = () =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('keepsake');
    open.onsuccess = () => {
      const tx = open.result.transaction('images');
      const keys = tx.objectStore('images').getAllKeys(),
        values = tx.objectStore('images').getAll();
      tx.oncomplete = () => {
        resolve(new Map(keys.result.map((k, i) => [k, values.result[i]])));
        open.result.close();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
const putImage = (key, value) =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('keepsake');
    open.onsuccess = () => {
      const tx = open.result.transaction('images', 'readwrite');
      tx.objectStore('images').put(value, key);
      tx.oncomplete = () => {
        open.result.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
assert.ok(
  [...(await images()).values()].every(v => v instanceof Blob),
  'files are stored as Blobs',
);
const loaded = await loadState();
const loadedText = JSON.stringify(loaded);
assert.ok(!/data:(image|model)\//.test(loadedText), 'loading does not read file content into the room');
assert.equal((loadedText.match(/"blob:/g) ?? []).length, 5, 'every file field loads as a blob: URL');
assert.equal(loaded.archive[0].src, loaded.books[0].pages[0].elements[0].src, 'one URL per stored file');
assert.deepEqual(await inlineFiles(loaded), state, 'backups get back every file exactly');
// Saving a loaded room keeps every file without rewriting it.
await saveState({...loaded, profile: {}});
assert.equal((await images()).size, 3);
assert.deepEqual(await inlineFiles(await loadState()), {...state, profile: {}});
// Removing a scan frees its file; undo brings it back and it is saved again.
await saveState({...loaded, displayCaseScans: []});
const keys = [...(await images()).keys()];
assert.equal(keys.length, 2, 'photo and card art remain; the removed model is deleted');
await saveState(loaded);
assert.equal((await images()).size, 3, 'an undone deletion is saved again');
assert.deepEqual(await inlineFiles(await loadState()), state);
// Older saves stored data: strings. They still load, and are rewritten as Blobs under the same key.
const [photoKey] = [...(await images()).entries()].find(([, v]) => v.size === 3000);
await putImage(photoKey, photo);
const legacy = await loadState();
assert.equal((await inlineFiles(legacy)).archive[0].src, photo, 'a legacy string loads unchanged');
await saveState(legacy);
assert.ok((await images()).get(photoKey) instanceof Blob, 'the legacy string was upgraded to a Blob');
assert.deepEqual(await inlineFiles(await loadState()), state);
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
  'Storage: files stored once by hash as Blobs outside the room record, loaded on demand as blob: URLs, inlined exactly for backups; removed files are deleted, undone removals saved again, legacy strings upgraded; stale autosaves cannot overwrite a restore.',
);

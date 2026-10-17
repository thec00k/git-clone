// Preserved full-size originals of photos the room no longer uses are deleted when the room loads, unless
// another Keepsake tab is open (it may be part-way through importing). Uses fake-indexeddb to run in Node.
import assert from 'node:assert/strict';
await import('fake-indexeddb/auto');
const {pruneOriginals, referencedOriginals} = await import('../src/lib/originalPhotos.ts');
const original = key => ({key, name: `${key}.jpg`, type: 'image/jpeg', size: 1});
const state = {
  archive: [{id: 'p1', src: 'x', original: original('kept')}],
  books: [{id: 'b', waiting: [{id: 'w', original: original('waiting')}]}],
};
assert.deepEqual([...referencedOriginals(state)].sort(), ['kept', 'waiting'], 'originals found anywhere');
const put = keys =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('keepsake-originals', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('files');
    open.onsuccess = () => {
      const tx = open.result.transaction('files', 'readwrite');
      for (const key of keys) tx.objectStore('files').put(new Blob(['x']), key);
      tx.oncomplete = () => {
        open.result.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
const stored = () =>
  new Promise(resolve => {
    const open = indexedDB.open('keepsake-originals', 1);
    open.onsuccess = () => {
      const r = open.result.transaction('files').objectStore('files').getAllKeys();
      r.onsuccess = () => {
        open.result.close();
        resolve(r.result.map(String).sort());
      };
    };
  });
await put(['kept', 'waiting', 'deleted-photo']);
// Another tab is open: nothing is pruned.
const other = new BroadcastChannel('keepsake-originals');
other.onmessage = e => e.data === 'anyone-open?' && other.postMessage('open');
assert.equal(await pruneOriginals(state), 0, 'no pruning while another tab is open');
other.close();
assert.deepEqual(await stored(), ['deleted-photo', 'kept', 'waiting']);
// Alone: only the unreferenced original goes.
assert.equal(await pruneOriginals(state), 1);
assert.deepEqual(await stored(), ['kept', 'waiting'], 'only originals the room no longer uses are deleted');
console.log('Originals: unused full-size originals are deleted on load; never while another tab is open.');

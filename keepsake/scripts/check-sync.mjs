// Sync client (src/lib/sync/): the outbox sends the local room to a pretend server. Checks that nothing on
// this device is ever changed, nothing is lost offline or mid-send, retries never duplicate, and sending
// pauses instead of overwriting when another device or account is involved.
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {saveState, loadState, assetKey, readAsset} from '../src/lib/storage.ts';
import {link, record, flush, status, PermanentError} from '../src/lib/sync/engine.ts';

const local = {keyOf: assetKey, readFile: readAsset};
const photo = n => 'data:image/jpeg;base64,' + String(n).repeat(400);
const pic = (id, n) => ({
  id,
  type: 'photo',
  src: photo(n),
  photoId: 'a' + n,
  x: 50,
  y: 50,
  w: 40,
  rotation: 0,
  z: 1,
  frame: 'polaroid',
});
const room = () => ({
  version: 1,
  profile: {displayName: 'Tom'},
  archive: [1, 2, 3].map(n => ({
    id: 'a' + n,
    src: photo(n),
    aspect: 1,
    createdAt: n,
    categories: [],
    favorite: false,
  })),
  archiveTabs: [],
  books: [
    {
      id: 'b1',
      title: 'Summer',
      subtitle: '',
      coverStyle: 'forest',
      visibility: 'public',
      createdAt: 1,
      updatedAt: 1,
      pages: [
        {id: 'title', titlePage: true, elements: []},
        {
          id: 'p1',
          elements: [
            pic('e1', 1),
            pic('e2', 2),
            {
              id: 'c',
              type: 'caption',
              text: 'lake',
              x: 1,
              y: 1,
              w: 1,
              rotation: 0,
              z: 2,
              fontSize: 3,
              color: '#000',
            },
          ],
        },
      ],
    },
  ],
  pins: [],
  notes: [],
  pinNotes: [],
  guestbook: [{id: 'g', author: 'Ben', message: 'hi', createdAt: 1}],
  environment: {roomTheme: 'woodland', lampOn: true},
  stamps: 30,
});

function fakeServer(uid = 'user-1') {
  const s = {
    uid,
    online: true,
    revision: 0,
    hasContent: false,
    rooms: [],
    books: new Map(),
    photos: new Map(),
    trashed: [],
    uploads: 0,
    calls: [],
    duringBookSave: null,
    refuse: null,
  };
  const net = () => {
    if (!s.online) throw new Error('Failed to fetch');
  };
  s.backend = {
    userId: async () => s.uid,
    room: async () => (net(), {revision: s.revision, hasContent: s.hasContent}),
    saveRoom: async (r, expected) => {
      net();
      s.calls.push('room');
      if (expected !== s.revision) return null;
      s.rooms.push(structuredClone(r));
      return ++s.revision;
    },
    saveBook: async (id, book) => {
      net();
      s.calls.push('book');
      await s.duringBookSave?.();
      s.books.set(id, structuredClone(book));
    },
    trashBook: async id => (net(), s.trashed.push(id)),
    uploadPhoto: async (key, data) => {
      net();
      assert.ok(data.startsWith('data:image/'), 'the photo file itself is uploaded');
      if (s.refuse === key) throw new PermanentError('A photo was not accepted for backup.');
      s.uploads++;
      if (!s.photos.has(key)) s.photos.set(key, 'srv-' + s.photos.size);
      return s.photos.get(key);
    },
    trashPhoto: async id => (net(), s.trashed.push(id)),
  };
  return s;
}
async function fresh() {
  await new Promise(r => {
    const req = indexedDB.deleteDatabase('keepsake-sync');
    req.onsuccess = req.onerror = req.onblocked = r;
  });
}
let clock = 1_000_000;
const now = () => clock;
const sentText = s => JSON.stringify({rooms: s.rooms, books: [...s.books.values()]});

// 1. Not linked: nothing is queued.
await fresh();
const state = room();
await saveState(state);
await record(state, local);
assert.equal((await status()).pending, 0, 'nothing queued before an account is linked');

// 2. First sync into an empty account sends the whole room; the local room is untouched.
let s = fakeServer();
await link(s.backend);
const before = JSON.stringify(state);
await record(state, local);
assert.equal((await status()).pending, 5, '3 photos, the room and 1 book queued');
await flush(s.backend, local, now);
assert.equal(JSON.stringify(state), before, 'the room object is never changed');
assert.deepEqual(await loadState(), state, 'the room saved on this device is unchanged');
let st = await status();
assert.equal(st.pending, 0, 'everything sent');
assert.ok(st.lastSyncedAt, 'last backup time recorded');
assert.equal(s.uploads, 3, 'each photo uploaded once');
assert.equal(s.books.size, 1);
const [bookId, book] = [...s.books][0];
assert.equal(book.pages.length, 2, 'title page and content page');
assert.equal(book.pages[1].photos.length, 2, 'page photos refer to uploaded photos');
assert.equal(book.visibility, 'private', 'a public book with fewer than 5 photos is not shared');
assert.ok(!sentText(s).includes('data:'), 'no file data inside rows');
assert.equal(
  s.rooms[0].private.guestbook[0].message,
  'hi',
  'private room details are sent to the owner-only part',
);
assert.ok(!('guestbook' in s.rooms[0].settings), 'visitors’ part holds only the room’s look');

// 3. Unchanged room: nothing is sent again.
s.calls = [];
await record(state, local);
await flush(s.backend, local, now);
assert.deepEqual(s.calls, [], 'no change, no traffic');

// 4. Offline: changes wait, then go out once, to the same book (no duplicate).
const edited = structuredClone(state);
edited.books[0].title = 'Summer 2026';
s.online = false;
await record(edited, local);
await flush(s.backend, local, now);
assert.equal((await status()).pending, 1, 'change kept while offline');
assert.ok((await status()).lastError, 'the failure is visible');
s.online = true;
await flush(s.backend, local, now);
assert.equal((await status()).pending, 1, 'waits before retrying');
clock += 60_000;
await flush(s.backend, local, now);
assert.equal((await status()).pending, 0, 'sent after coming back online');
assert.equal(s.books.size, 1, 'retry updated the same book');
assert.equal(s.books.get(bookId).title, 'Summer 2026');

// 5. An edit made while a send is in flight is not lost.
const again = structuredClone(edited);
again.books[0].title = 'Lake days';
const later = structuredClone(again);
later.books[0].title = 'Lake days, again';
s.duringBookSave = async () => {
  s.duringBookSave = null;
  await record(later, local);
};
await record(again, local);
await flush(s.backend, local, now);
assert.equal(s.books.get(bookId).title, 'Lake days, again', 'the newer edit was sent after the older one');

// 6. Deleting a book or photo here moves the server copy to its trash (same ids); nothing else is touched.
const trimmed = structuredClone(later);
trimmed.books = [];
trimmed.archive = trimmed.archive.filter(a => a.id !== 'a3');
await record(trimmed, local);
await flush(s.backend, local, now);
assert.deepEqual(
  s.trashed.sort(),
  [bookId, 'srv-2'].sort(),
  'book and the photo used nowhere else go to the trash',
);

// 7. Another device saved in between: sending pauses, nothing is overwritten, changes keep queueing.
s.revision += 5;
const meanwhile = structuredClone(trimmed);
meanwhile.environment.lampOn = false;
await record(meanwhile, local);
await flush(s.backend, local, now);
st = await status();
assert.equal(st.paused, 'changed-elsewhere');
assert.equal(st.pending, 1, 'the change is kept');
assert.equal(s.rooms.at(-1).settings.environment.lampOn, true, 'the other device’s save was not overwritten');

// 8. A photo the server refuses is reported and dropped; the rest continues.
await fresh();
s = fakeServer();
await link(s.backend);
const key3 = await assetKey(photo(3));
s.refuse = key3;
await record(state, local);
await flush(s.backend, local, now);
st = await status();
assert.equal(st.pending, 0);
assert.equal(st.problems.length, 1, 'the refused photo is reported');
assert.equal(s.uploads, 2);

// 9. An account that already holds a room elsewhere: nothing is sent.
await fresh();
s = fakeServer();
s.hasContent = true;
s.revision = 3;
await link(s.backend);
await record(state, local);
await flush(s.backend, local, now);
assert.equal((await status()).paused, 'server-has-room');
assert.deepEqual(s.calls, [], 'nothing sent into an account that already has a room');

// 10. A different account on the same device: paused, never mixed.
await fresh();
s = fakeServer('user-1');
await link(s.backend);
const other = fakeServer('user-2');
await link(other.backend);
await record(state, local);
await flush(other.backend, local, now);
assert.equal((await status()).paused, 'other-account');
assert.equal(other.uploads + other.calls.length, 0, 'nothing sent to the other account');
await link(s.backend);
assert.equal((await status()).paused, null, 'signing back in with the right account resumes');

console.log(
  'Sync: outbox sends the room without changing it, survives offline and mid-send edits, never duplicates, pauses on conflicts.',
);

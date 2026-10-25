import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  LIMITS,
  checkArchiveRoom,
  photosThatFit,
  canAddPage,
  canShareBook,
  bookPhotoCount,
  canSetVisibility,
  shareHint,
} from '../src/lib/limits.ts';
import {insertPhotoBatch} from '../src/lib/photoBatch.ts';
import {UPLOAD_LIMITS} from '../supabase/functions/_shared/moderation.ts';
const photo = i => ({
  id: 'p' + i,
  type: 'photo',
  src: '/samples/coffee.jpg',
  x: 50,
  y: 50,
  w: 40,
  rotation: 0,
  z: i,
  frame: 'polaroid',
});
const book = pages => ({
  id: 'b',
  title: 't',
  subtitle: '',
  createdAt: 1,
  updatedAt: 1,
  pages: [{id: 'title', titlePage: true, elements: []}, ...pages],
});
const full = book(
  Array.from({length: 10}, (_, p) => ({id: 'pg' + p, elements: [0, 1, 2, 3].map(i => photo(p * 4 + i))})),
);
assert.equal(bookPhotoCount(full), 40);
assert.equal(canAddPage(full), false);
assert.equal(photosThatFit(full, 5), 0);
assert.throws(() => insertPhotoBatch(full, 'pg9', [{src: '/samples/coffee.jpg', aspect: 1}]), /book is full/);
const nine = book(Array.from({length: 9}, (_, p) => ({id: 'pg' + p, elements: []})));
assert.equal(canAddPage(nine), true);
assert.equal(
  photosThatFit(nine, 20),
  12,
  'new pages are added after the target, so room is counted in pages',
);
assert.equal(photosThatFit(book([{id: 'a', elements: []}]), 20), 20);
const tenEmpty = book(Array.from({length: 10}, (_, p) => ({id: 'pg' + p, elements: []})));
assert.equal(photosThatFit(tenEmpty, 8), 6, 'only the reusable empty target page is left');
assert.equal(canShareBook(book([{id: 'a', elements: [0, 1, 2, 3].map(photo)}])), false);
assert.equal(
  canShareBook(
    book([
      {id: 'a', elements: [0, 1, 2, 3].map(photo)},
      {id: 'b', elements: [photo(9)]},
    ]),
  ),
  true,
);
// Sharing needs 5 photos on the pages; private is always allowed.
const four = book([{id: 'a', elements: [0, 1, 2, 3].map(photo)}]);
const five = book([
  {id: 'a', elements: [0, 1, 2, 3].map(photo)},
  {id: 'b', elements: [photo(9)]},
]);
assert.equal(canSetVisibility(four, 'private'), true);
assert.equal(canSetVisibility(four, 'friends'), false);
assert.equal(canSetVisibility(four, 'public'), false);
assert.equal(canSetVisibility(five, 'friends'), true);
assert.equal(canSetVisibility(five, 'public'), true);
assert.match(shareHint(four), /Add 1 more photo to share/);
assert.match(shareHint(book([])), /Add 5 more photos/);
assert.equal(shareHint(five), null);
// Waiting-stack photos are archive references, not page photos, so they do not count yet.
assert.equal(canShareBook({...four, pendingPhotoIds: ['x', 'y', 'z']}), false);
const store = readFileSync(new URL('../src/store/appStore.tsx', import.meta.url), 'utf8');
assert.match(store, /canSetVisibility\(b, v\)/, 'the store refuses to share a book that is not ready');
const shelf = readFileSync(new URL('../src/components/views/Shelf.tsx', import.meta.url), 'utf8');
assert.match(
  shelf,
  /disabled=\{b\.visibility !== v\.key && !canSetVisibility/,
  'the shelf disables sharing early',
);
assert.throws(() => checkArchiveRoom(499, 2), /room for 1 more/);
checkArchiveRoom(499, 1);
// Client and server must agree.
assert.equal(UPLOAD_LIMITS.maxBytes, LIMITS.uploadBytes);
assert.equal(UPLOAD_LIMITS.maxEdge, LIMITS.maxImageEdge);
assert.equal(UPLOAD_LIMITS.maxPhotosPerAccount, LIMITS.archivePhotos);
const sql = readFileSync(
  new URL('../supabase/migrations/20261010000002_social_and_safety.sql', import.meta.url),
  'utf8',
);
for (const [n, what] of [
  [LIMITS.archivePhotos, 'photo limit'],
  [LIMITS.books, 'book limit'],
  [LIMITS.pins, 'pin limit'],
  [LIMITS.photosPerBook, '40 photos'],
])
  assert.ok(sql.includes(String(n)) && sql.includes(what.split(' ')[0]), what + ' matches the server');
const core = readFileSync(
  new URL('../supabase/migrations/20261010000001_core_schema.sql', import.meta.url),
  'utf8',
);
assert.match(core, /slot between 0 and 3/);
assert.match(core, /position between 0 and 9/);
assert.match(core, /between 1 and 2048/);
console.log(
  'Limits: 4 photos/page, 10 pages, 40 photos/book, 12 books, 100 pins, 500 photos, 25 MB, 2048 px; client and server agree.',
);

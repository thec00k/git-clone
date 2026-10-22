import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {PLACES, GUESTBOOK_BOOK_NOTE} from '../src/lib/discoveries.ts';
import {BOOKSHELF_WINDOW_SHIFT} from '../src/components/room3d/furnitureLayout.ts';
// The Woodland cabin the app loads.
const bytes = await readFile(new URL('../public/room/woodland-study/woodland-study.glb', import.meta.url));
const {scene} = await new GLTFLoader()
  .register(() => ({
    name: 'geometry-only',
    loadMaterial: () => Promise.resolve(new THREE.MeshBasicMaterial()),
  }))
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);
const bounds = name => {
  const object = scene.getObjectByName(name);
  assert.ok(object, `${name} exists`);
  return new THREE.Box3().setFromObject(object, true);
};
const surfaces = {
  guestbook: 'Cozy_Guest_Tabletop',
  shelf: 'ks_shelf_board_0',
  frame: 'Archive_Top',
  chair: 'Study_ChairSeat',
  desk: 'Desk_Top',
};
for (const p of PLACES) {
  const b = bounds(surfaces[p.id]);
  const [x, y] = p.position;
  // DiscoveryObject moves the shelf slip with the user's books.
  const z = p.position[2] + (p.id === 'shelf' ? BOOKSHELF_WINDOW_SHIFT : 0);
  const w = 0.145 / 2,
    h = (p.id === 'shelf' ? 0.067 : 0.095) / 2,
    a = p.rotation[2];
  const dx = Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h,
    dz = Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * h;
  assert.ok(
    x - dx >= b.min.x && x + dx <= b.max.x && z - dz >= b.min.z && z + dz <= b.max.z,
    `${p.id} stays on its support`,
  );
  assert.ok(y - 0.0015 >= b.max.y - 0.002 && y - b.max.y < 0.009, `${p.id} rests at surface height`);
  if (p.id === 'shelf')
    scene.traverse(o => {
      if (!/^ks_shelf_book_/.test(o.name)) return;
      const book = bounds(o.name);
      if (book.min.y < y && book.max.y > y)
        assert.ok(
          z - dz > book.max.z || z + dz < book.min.z || x - dx > book.max.x || x + dx < book.min.x,
          `Letter clears ${o.name}`,
        );
    });
}
const cover = bounds('Guestbook_Cover');
const [bx, by, bz] = GUESTBOOK_BOOK_NOTE;
assert.ok(
  bx > cover.min.x && bx < cover.max.x && bz > cover.min.z && bz < cover.max.z,
  'Guest note lies on the guestbook',
);
assert.ok(by >= cover.max.y && by - cover.max.y < 0.009, 'Guest note rests on the guestbook cover');
console.log(
  'All five note locations and the guestbook note fit their supports; shelf slip clears decorative books.',
);
const shelfLetter = PLACES.find(p => p.id === 'shelf');
for (let i = 0; i < 12; i++) {
  const z = -0.69 + i * 0.1015;
  assert.ok(
    z + 0.082 / 2 < shelfLetter.position[2] - 0.067 / 2,
    'Shelf letter also clears a full row of user books',
  );
}

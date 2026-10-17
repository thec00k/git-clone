import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

// The app's sources use extensionless relative imports (Vite resolves them); do the same here.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.')) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});
const {loadRoomAsset, releaseRoomAssetsExcept} = await import('../src/components/room3d/roomAssetCache.ts');
const {loadFurniture, retainFurniture} = await import('../src/components/room3d/furnitureAssetCache.ts');
const {FURNITURE_ITEMS} = await import('../src/lib/furniture.ts');

// No network in this check: every "download" returns a small parsed model whose
// geometry, material and texture report when their GPU memory is released.
const freed = [];
const loads = [];
GLTFLoader.prototype.loadAsync = async function (path) {
  loads.push(path);
  const name = `${path}#${loads.filter(p => p === path).length}`;
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({map: new THREE.Texture()});
  geometry.addEventListener('dispose', () => freed.push(`${name}:geometry`));
  material.addEventListener('dispose', () => freed.push(`${name}:material`));
  material.map.addEventListener('dispose', () => freed.push(`${name}:texture`));
  const scene = new THREE.Group();
  // The room cache checks these anchors before keeping a room.
  for (const anchor of ['Desk', 'ks_book', 'ks_window', 'ks_shelf', 'ks_door'])
    scene.add(Object.assign(new THREE.Object3D(), {name: anchor}));
  scene.add(new THREE.Mesh(geometry, material));
  return {scene};
};
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

// 1. Rooms: switching frees every room that is not on screen and forgets it.
const woodland = await loadRoomAsset('woodland.glb');
assert.equal(await loadRoomAsset('woodland.glb'), woodland, 'the room on screen is shared, not reloaded');
await loadRoomAsset('beachfront.glb');
assert.deepEqual(loads, ['woodland.glb', 'beachfront.glb']);
releaseRoomAssetsExcept('woodland.glb');
assert.deepEqual(
  freed.sort(),
  ['beachfront.glb#1:geometry', 'beachfront.glb#1:material', 'beachfront.glb#1:texture'],
  'the room no longer shown has its geometry, materials and textures released',
);
assert.equal(await loadRoomAsset('woodland.glb'), woodland, 'the room on screen is kept');
await loadRoomAsset('beachfront.glb');
assert.equal(loads.at(-1), 'beachfront.glb', 'the freed room was dropped from the cache, so it loads afresh');
assert.equal(loads.length, 3);
freed.length = 0;
releaseRoomAssetsExcept('beachfront.glb');
assert.deepEqual(
  freed.sort(),
  ['woodland.glb#1:geometry', 'woodland.glb#1:material', 'woodland.glb#1:texture'],
  'switching back frees the other room in turn',
);
freed.length = 0;
releaseRoomAssetsExcept('beachfront.glb');
assert.deepEqual(freed, [], 'releasing again is a no-op');

// 2. Furniture: a piece is freed and forgotten only once nothing in the room shows it.
const piece = FURNITURE_ITEMS[0];
assert.ok(piece, 'there is furniture to test with');
const first = retainFurniture(piece.id);
const second = retainFurniture(piece.id);
await loadFurniture(piece.id);
assert.equal(loads.filter(p => p === piece.asset).length, 1);
second();
await settle();
assert.deepEqual(freed, [], 'still in use by another copy, so nothing is freed');
second();
await settle();
assert.deepEqual(freed, [], 'calling the same release twice does not count twice');
first();
await settle();
assert.deepEqual(
  freed.sort(),
  [`${piece.asset}#1:geometry`, `${piece.asset}#1:material`, `${piece.asset}#1:texture`],
  'the last release frees the piece',
);
await loadFurniture(piece.id);
assert.equal(
  loads.filter(p => p === piece.asset).length,
  2,
  'the freed piece was dropped from the cache, so it loads afresh',
);

// 3. The room and furniture components use these releases.
const read = f => readFileSync(new URL(`../src/components/room3d/${f}`, import.meta.url), 'utf8');
assert.match(
  read('useRoomAsset.ts'),
  /releaseRoomAssetsExcept\(activeRoom\.asset\)/,
  'switching rooms frees the others',
);
for (const f of ['FurnitureModels.tsx', 'FurniturePrinter.tsx'])
  assert.match(read(f), /retainFurniture\(/, `${f} marks the furniture it shows`);
console.log('Rooms and furniture that are no longer shown release their graphics memory.');

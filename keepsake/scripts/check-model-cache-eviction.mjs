import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createAssetCache} from '../src/lib/assetCache.ts';

const freed = [];
const asset = name => {
  const geometry = new THREE.BoxGeometry();
  geometry.addEventListener('dispose', () => freed.push(name));
  return {scene: new THREE.Group().add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()))};
};
let loads = 0;
const cache = createAssetCache({
  max: 2,
  load: async key => {
    loads++;
    return asset(key);
  },
});

// Recent models are kept and shared, so switching back and forth does not reload.
await cache.get('a');
await cache.get('b');
await cache.get('a');
assert.equal(loads, 2, 'a repeat request is served from the cache');
assert.deepEqual(freed, [], 'nothing is freed while within the limit');

// A third model pushes out the least recently used one and frees its graphics memory.
await cache.get('c');
assert.deepEqual(cache.keys().sort(), ['a', 'c'], 'least recently used model (b) is dropped');
assert.deepEqual(freed, ['b'], 'its graphics memory is released');

// A model in use is never dropped, however old it is.
const release = cache.hold('a');
await cache.get('d');
await cache.get('e');
assert.ok(cache.keys().includes('a'), 'pinned model stays');
assert.ok(!freed.includes('a'), 'pinned model is not freed');
release();
release();
assert.ok(cache.keys().includes('a'), 'releasing alone does not drop anything while within the limit');
await cache.get('f');
assert.ok(!cache.keys().includes('a'), 'once released it can be dropped again');
assert.ok(freed.includes('a'), 'released model is freed when over the limit');

// A failed load is not remembered, so it can be retried.
let fail = true;
const flaky = createAssetCache({
  max: 2,
  load: async () => {
    if (fail) throw new Error('offline');
    return asset('ok');
  },
});
await assert.rejects(flaky.get('x'));
fail = false;
await flaky.get('x');

// The real caches and their users use it.
const read = f => readFileSync(new URL(`../src/components/room3d/${f}`, import.meta.url), 'utf8');
for (const f of ['roomAssetCache.ts', 'furnitureAssetCache.ts'])
  assert.match(read(f), /createAssetCache\b/, `${f} is bounded`);
assert.match(read('useRoomAsset.ts'), /holdRoomAsset\(/, 'the active room is pinned');
assert.match(read('FurnitureModels.tsx'), /holdFurniture\(/, 'placed furniture is pinned');
assert.match(read('FurniturePrinter.tsx'), /holdFurniture\(/, 'the placed printer is pinned');
console.log('Room and furniture model caches are bounded, keep models in use, and free the rest.');

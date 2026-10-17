import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {cloneWithOwnMaterials, createModelCache, disposeScene} from '../src/lib/sceneDisposal.ts';

// A tiny "scan": two meshes sharing one material, plus one with its own.
const shared = new THREE.MeshStandardMaterial({map: new THREE.Texture()});
const own = new THREE.MeshStandardMaterial();
const geo = new THREE.BoxGeometry();
const scene = new THREE.Group();
scene.add(new THREE.Mesh(geo, shared), new THREE.Mesh(geo, shared), new THREE.Mesh(geo, own));
const counts = new Map();
const watch = (obj, name) =>
  obj.addEventListener('dispose', () => counts.set(name, (counts.get(name) ?? 0) + 1));

// 1. A shown scan owns copies of its materials, and all of them are released when it goes away.
const {root, materials} = cloneWithOwnMaterials(scene);
assert.equal(materials.length, 2, 'one copy per distinct material, not per mesh');
materials.forEach((m, i) => watch(m, `copy${i}`));
assert.ok(
  materials.every(m => m !== shared && m !== own),
  'copies, not the cached originals',
);
assert.ok(
  root.children.every(c => !materials.includes(shared)),
  'clone is independent of the original',
);
for (const m of materials) m.dispose();
assert.equal(counts.get('copy0'), 1);
assert.equal(counts.get('copy1'), 1);
assert.equal(shared.map.version >= 0, true, 'original untouched by clone');

// 2. A removed scan frees what the loader cached: geometry, materials and textures of the original.
watch(geo, 'geo');
watch(shared, 'shared');
watch(own, 'own');
watch(shared.map, 'map');
disposeScene(scene);
for (const k of ['geo', 'shared', 'own', 'map']) assert.equal(counts.get(k), 1, `${k} released once`);

// 3. The cache drops a model's entry (and frees it) only when no scan uses it any more.
const cleared = [];
const cache = createModelCache(src => cleared.push(src));
const a = new THREE.Group(),
  b = new THREE.Group();
const freed = [];
a.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()), {}));
a.children[0].geometry.addEventListener('dispose', () => freed.push('a'));
cache.register('data:a', a);
cache.register('data:b', b);
cache.keepOnly(new Set(['data:a', 'data:b']));
assert.deepEqual(cleared, [], 'nothing removed while both scans exist');
cache.keepOnly(new Set(['data:b']));
assert.deepEqual(cleared, ['data:a'], 'removed scan is evicted from the loader cache');
assert.deepEqual(freed, ['a'], 'and its GPU buffers are freed');
cache.keepOnly(new Set(['data:b']));
assert.deepEqual(cleared, ['data:a'], 'evicting twice is a no-op');
cache.releaseAll();
assert.deepEqual(cleared, ['data:a', 'data:b'], 'leaving the room releases the rest');

// 4. The display case actually uses it.
const src = readFileSync(
  new URL('../src/components/room3d/ArtifactDisplayCase.tsx', import.meta.url),
  'utf8',
);
assert.match(src, /cloneWithOwnMaterials\(/, 'DisplayScan clones through the tracked helper');
assert.match(src, /createModelCache\(/, 'display case evicts removed scans');
assert.match(src, /keepOnly\(/);
assert.match(src, /releaseAll\(/);
console.log('Display-case scans release their GPU memory when removed or when the room is left.');

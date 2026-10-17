import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {leftStackPose, pageTurnWeights} from '../src/lib/workbench.ts';
import {
  collectRenderedMeshes,
  visibleBounds,
  visibleBoundsInto,
} from '../src/components/room3d/furnitureContact.ts';

// 1. The helpers give the same answers as before, and can fill a caller-owned result.
const out = [9, 9, 9, 9];
assert.equal(pageTurnWeights(0.4, out), out, 'weights are written into the given array');
const expected = [1, 2, 3, 4].map(target => Math.max(0, 1 - Math.abs(1.6 - target)));
assert.deepEqual(out, expected);
assert.deepEqual(pageTurnWeights(0.4), expected, 'without an output array it still returns a fresh one');
const pose = {rotation: 0, x: 0, y: 0};
assert.equal(leftStackPose(1, 0.01, pose), pose, 'pose is written into the given object');
assert.ok(Math.abs(pose.rotation - (1 - Math.PI)) < 1e-9);
assert.ok(Math.abs(pose.y - (0.01 + Math.cos(1) * 0.004)) < 1e-9);
assert.deepEqual(leftStackPose(1, 0.01), pose, 'without an output object it still returns a fresh one');

const chair = new THREE.Group();
const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
const hidden = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshBasicMaterial({visible: false}));
chair.add(seat, hidden);
chair.position.set(2, 0, 0);
const box = new THREE.Box3();
assert.equal(visibleBoundsInto(chair, box), box, 'bounds fill the given box');
assert.ok(box.equals(visibleBounds(chair)), 'same bounds as the allocating version');
assert.equal(box.max.x, 2.5, 'hidden meshes are ignored');
const list = [hidden];
assert.equal(collectRenderedMeshes(chair, list), list);
assert.deepEqual(list, [seat], 'list is reset, then only rendered meshes are added');

// 2. Nothing inside the per-frame callbacks of the two components creates objects, strings or closures.
function frameBodies(source) {
  const bodies = [];
  for (let at = source.indexOf('useFrame('); at >= 0; at = source.indexOf('useFrame(', at + 1)) {
    let depth = 0,
      i = at + 'useFrame'.length;
    do {
      if (source[i] === '(') depth++;
      if (source[i] === ')') depth--;
      i++;
    } while (depth > 0);
    bodies.push(source.slice(at, i));
  }
  return bodies;
}
const banned = [
  [/new THREE\./, 'creates a three.js object'],
  [/\.clone\(\)/, 'clones an object'],
  [/\.traverse\(/, 'builds a closure to walk the scene'],
  [/\.(map|forEach|filter)\(/, 'builds a closure or array'],
  [/padStart|`[^`]*\$\{/, 'builds a string'],
  [/\bfor \(const [^)]* of /, 'creates an iterator'],
];
for (const file of ['WorkbenchBook.tsx', 'DiscoveryObject.tsx']) {
  const source = readFileSync(new URL(`../src/components/room3d/${file}`, import.meta.url), 'utf8');
  const bodies = frameBodies(source);
  assert.ok(bodies.length > 0, `${file} has a frame loop`);
  for (const body of bodies)
    for (const [pattern, why] of banned)
      assert.ok(!pattern.test(body), `${file}: the frame loop ${why} on every frame (${pattern})`);
}
console.log('Workbench book and discovery note reuse their working objects on every frame.');

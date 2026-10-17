import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import ts from 'typescript';
import {leftStackPose, pageTurnWeights} from '../src/lib/workbench.ts';
import {visibleBounds} from '../src/components/room3d/furnitureContact.ts';

// 1. The helpers used every frame can fill a caller-owned result instead of making a new one.
const weights = [9, 9, 9, 9];
assert.equal(pageTurnWeights(0.4, weights), weights, 'page-turn weights are written into the given array');
assert.deepEqual(weights, pageTurnWeights(0.4), 'with the same answer as a fresh array');
const pose = {rotation: 0, x: 0, y: 0};
assert.equal(leftStackPose(1, 0.01, pose), pose, 'the page-stack pose is written into the given object');
assert.deepEqual(pose, leftStackPose(1, 0.01), 'with the same answer as a fresh object');
const chair = new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
const box = new THREE.Box3();
assert.equal(visibleBounds(chair, box), box, 'bounds are written into the given box');
assert.ok(box.equals(visibleBounds(chair)), 'with the same answer as a fresh box');

// 2. Nothing inside the per-frame callbacks creates objects, arrays or strings, and the helpers
//    above are always handed a reusable result to fill.
const fillsResult = {leftStackPose: 3, pageTurnWeights: 2, visibleBounds: 2};
function problems(file) {
  const url = new URL(`../src/components/room3d/${file}`, import.meta.url);
  const ast = ts.createSourceFile(
    url.pathname,
    readFileSync(url, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const frames = [];
  const found = [];
  ts.forEachChild(ast, function find(node) {
    if (ts.isCallExpression(node) && node.expression.getText() === 'useFrame') frames.push(node.arguments[0]);
    ts.forEachChild(node, find);
  });
  for (const frame of frames) {
    const report = (node, why) =>
      found.push(
        `${file}:${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${why}: ${node.getText()}`,
      );
    ts.forEachChild(frame, function walk(node) {
      if (ts.isNewExpression(node)) report(node, 'creates an object');
      if (ts.isArrayLiteralExpression(node)) report(node, 'creates an array');
      if (ts.isObjectLiteralExpression(node)) report(node, 'creates an object');
      if (ts.isTemplateExpression(node)) report(node, 'builds a string');
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : callee.getText();
        if (name === 'clone') report(node, 'clones an object');
        if (name in fillsResult && node.arguments.length < fillsResult[name])
          report(node, 'lets a helper create its result');
      }
      ts.forEachChild(node, walk);
    });
  }
  return {frames: frames.length, found};
}
for (const file of ['WorkbenchBook.tsx', 'DiscoveryObject.tsx']) {
  const {frames, found} = problems(file);
  assert.ok(frames > 0, `${file} has a frame loop`);
  assert.deepEqual(found, [], `${file}: a frame loop allocates on every frame`);
}
console.log('Workbench book and discovery note reuse their working objects on every frame.');

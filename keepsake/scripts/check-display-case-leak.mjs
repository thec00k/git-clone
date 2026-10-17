import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import ts from 'typescript';
import {disposeGltf} from '../src/components/room3d/disposeGltf.ts';

const file = new URL('../src/components/room3d/ArtifactDisplayCase.tsx', import.meta.url);
const source = readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// A tracked "scan": a mesh whose geometry, material and texture report when they are released.
const released = [];
function scan(name) {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({map: new THREE.Texture()});
  geometry.addEventListener('dispose', () => released.push(`${name}:geometry`));
  material.addEventListener('dispose', () => released.push(`${name}:material`));
  material.map.addEventListener('dispose', () => released.push(`${name}:texture`));
  return new THREE.Group().add(new THREE.Mesh(geometry, material));
}

// 1. disposeGltf releases geometry, materials and their textures.
disposeGltf({scene: scan('loose')});
assert.deepEqual(released.sort(), ['loose:geometry', 'loose:material', 'loose:texture']);
released.length = 0;

// 2. Run the display case's own release code (taken from the component source) against stand-ins
//    for the loader cache, so it can be checked without a browser.
let releaseScanSource;
const scanEffects = [];
ts.forEachChild(ast, function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'releaseScan') releaseScanSource = node.getText();
  if (
    ts.isCallExpression(node) &&
    node.expression.getText() === 'useEffect' &&
    node.arguments[0]?.getText().includes('shownScans.current')
  )
    scanEffects.push(node.arguments[0].getText());
  ts.forEachChild(node, visit);
});
assert.ok(releaseScanSource, 'the display case has a releaseScan function');
assert.equal(scanEffects.length, 2, 'one effect for removed scans and one for leaving the room');
const [syncSource, unmountSource] = scanEffects;
const {outputText} = ts.transpileModule(
  `function harness(parsedScans, disposeGltf, useGLTF, shownScans, state) {
    ${releaseScanSource}
    return {sync: ${syncSource}, mount: ${unmountSource}};
  }`,
  {compilerOptions: {target: ts.ScriptTarget.ES2022}},
);
const cleared = [];
const parsedScans = new Map();
const shownScans = {current: new Set()};
const state = {displayCaseScans: []};
const useGLTF = {clear: src => cleared.push(src)};
const {sync, mount} = new Function(`${outputText}; return harness;`)()(
  parsedScans,
  disposeGltf,
  useGLTF,
  shownScans,
  state,
);
const show = (...srcs) => {
  for (const src of srcs) if (!parsedScans.has(src)) parsedScans.set(src, scan(src));
  state.displayCaseScans = srcs.map((modelSrc, i) => ({id: String(i), modelSrc}));
  sync();
};
const leave = mount();

show('data:a', 'data:b');
assert.deepEqual(released, [], 'scans on the shelves are kept');
assert.deepEqual(cleared, []);

show('data:b');
assert.deepEqual(
  released.sort(),
  ['data:a:geometry', 'data:a:material', 'data:a:texture'],
  'a removed scan has its geometry, materials and textures released',
);
assert.deepEqual(cleared, ['data:a'], "a removed scan is cleared from useGLTF's cache");
assert.ok(!parsedScans.has('data:a') && parsedScans.has('data:b'), 'only the removed scan is forgotten');

released.length = 0;
show('data:b', 'data:c');
assert.deepEqual(released, [], 'adding a scan frees nothing');
show('data:c', 'data:b');
assert.deepEqual(released, [], 'moving scans between shelves frees nothing');

leave();
assert.deepEqual(
  released.sort(),
  [
    'data:b:geometry',
    'data:b:material',
    'data:b:texture',
    'data:c:geometry',
    'data:c:material',
    'data:c:texture',
  ],
  'leaving the room releases every scan still shown',
);
assert.deepEqual(cleared.sort(), ['data:a', 'data:b', 'data:c']);
assert.equal(parsedScans.size, 0);

// 3. Each shown scan registers its parse so it can be released, and frees its material copies.
assert.match(source, /parsedScans\.set\(src, scene\)/, 'DisplayScan records its parsed scan');
assert.match(
  source,
  /useEffect\(\(\) => \(\) => materials\.forEach\(m => m\.dispose\(\)\), \[materials\]\)/,
  'DisplayScan frees its own material copies when it unmounts',
);
console.log('Display-case scans release their GPU memory when removed or when the room is left.');

import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshBVH} from 'three-mesh-bvh';
const url = new URL('../public/room/woodland-study/woodland-study.glb', import.meta.url);
const bytes = await readFile(url);
const {scene} = await new GLTFLoader()
  .register(() => ({
    name: 'geometry-only-materials',
    loadMaterial: () => Promise.resolve(new THREE.MeshBasicMaterial({side: THREE.DoubleSide})),
  }))
  .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);
const poses = JSON.parse(await readFile(new URL('../src/generated/woodlandStudy.json', import.meta.url)));
const required = [
  'Desk',
  'Desk_Top',
  'Desk_Drawer',
  'ks_book',
  'ks_window',
  'Win_Sill',
  'ks_chair',
  'ks_shelf',
  'ks_door',
  'ks_archive',
  'ks_archive_drawer',
  'CRT_Screen',
  'Hearth_Light',
];
required.forEach(n => assert.ok(scene.getObjectByName(n), 'Missing functional anchor ' + n));
for (const [id, pose] of Object.entries(poses)) {
  for (const [prefix, point] of [
    ['Camera_', pose.position],
    ['Target_', pose.target],
  ]) {
    const actual = scene.getObjectByName(prefix + id).getWorldPosition(new THREE.Vector3());
    assert.ok(
      actual.distanceTo(new THREE.Vector3(...point)) < 0.00001,
      'Manifest must match authored anchor ' + prefix + id,
    );
  }
}
const meshes = [];
scene.traverse(o => {
  if (o.isMesh) {
    meshes.push(o);
    for (const m of [].concat(o.material)) m.side = THREE.DoubleSide;
  }
});
const ray = new THREE.Raycaster();
const trace = (origin, direction, far = 4) => {
  ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction).normalize());
  ray.near = 0.001;
  ray.far = far;
  return ray.intersectObjects(meshes, false);
};
// Actual mesh raycasts through both apertures, and into the two filled roof corners.
for (const p of [
  [-0.15, 2, -1.9],
  [-0.15, 3.35, -1.9],
])
  assert.equal(trace(p, [0, 0, -1], 1).length, 0, 'Window aperture must remain clear ' + p);
for (const p of [
  [-0.85, 3.65, -1.9],
  [0.55, 3.65, -1.9],
])
  assert.ok(
    trace(p, [0, 0, -1], 1).some(h => h.object.name.startsWith('Study_Transom')),
    'No roof hole outside the triangular opening',
  );
// Camera paths, including the editor approach: test the centerline and a small body envelope.
const points = [...Object.values(poses).map(p => p.position), [-0.15, 1.55, -1.12]];
for (const from of points)
  for (const to of points) {
    const start = new THREE.Vector3(...from),
      end = new THREE.Vector3(...to),
      delta = end.clone().sub(start),
      length = delta.length();
    if (length < 0.001) continue;
    for (const offset of [
      [0, 0, 0],
      [0.04, 0, 0],
      [-0.04, 0, 0],
      [0, 0.04, 0],
      [0, -0.04, 0],
    ]) {
      const hits = trace(
        start
          .clone()
          .add(new THREE.Vector3(...offset))
          .toArray(),
        delta.toArray(),
        length,
      );
      assert.equal(
        hits.length,
        0,
        'Camera corridor collision: ' + from + ' to ' + to + ' / ' + hits.map(h => h.object.name),
      );
    }
  }
const bounds = n => new THREE.Box3().setFromObject(scene.getObjectByName(n));
assert.ok(
  Math.abs(bounds('Desk_Top').max.y - 0.75) < 0.001,
  'Book support height must match live book placement',
);
assert.ok(bounds('Win_Sill').min.y > bounds('Desk_Top').max.y + 0.25, 'Sill does not clip the desk');
const hearth = new THREE.Box3();
meshes
  .filter(o => o.name.startsWith('Study_Hearth'))
  .forEach(o => hearth.union(new THREE.Box3().setFromObject(o)));
assert.ok(!hearth.intersectsBox(bounds('ks_door')), 'Hearth stays clear of door frame');
assert.ok(!hearth.intersectsBox(bounds('Beanbag')), 'Hearth stays clear of sitting cushion');
const chair = scene.getObjectByName('ks_chair');
const forward = new THREE.Vector3(0, 0, -1).transformDirection(chair.matrixWorld);
assert.ok(
  Math.abs(THREE.MathUtils.radToDeg(Math.atan2(forward.x, -forward.z)) - 20) < 0.01,
  'Chair faces 20 degrees toward window-right',
);
const chimney = new THREE.Box3();
meshes
  .filter(o => o.name.startsWith('Study_Chimney'))
  .forEach(o => chimney.union(new THREE.Box3().setFromObject(o)));
assert.ok(chimney.max.y >= bounds('Study_Ceiling').min.y - 0.005, 'Chimney reaches ceiling without a gap');
assert.ok(!chimney.intersectsBox(bounds('ks_door')), 'Chimney does not intrude into the door');
assert.ok(
  meshes.some(o => o.name.startsWith('Cabin_Window_Log')),
  'Cabin courses are exported geometry',
);
// The ceiling fan hangs from the boards between the log joists; no beam, joist or wall log may
// enter the blades' sweep or the drop rod above them.
const fan = scene.getObjectByName('ks_ceiling_fan');
assert.ok(fan && scene.getObjectByName('ks_ceiling_fan_light'), 'Ceiling fan and its light anchor');
const blades = new THREE.Box3().setFromObject(scene.getObjectByName('ks_ceiling_fan_blades'));
const canopy = bounds('Fan_Canopy');
const hub = blades.getCenter(new THREE.Vector3());
const sweep = Math.max(blades.max.x - hub.x, blades.max.z - hub.z) + 0.1;
const a = new THREE.Vector3(),
  b = new THREE.Vector3(),
  v = new THREE.Vector3();
for (const mesh of meshes.filter(o => o.name.startsWith('Cabin_'))) {
  // Logs are long and have vertices only at their ends, so sample along every triangle edge.
  const position = mesh.geometry.attributes.position;
  const index = mesh.geometry.index?.array ?? [...Array(position.count).keys()];
  for (let t = 0; t < index.length; t += 3)
    for (const [i, j] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ]) {
      a.fromBufferAttribute(position, index[t + i]).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, index[t + j]).applyMatrix4(mesh.matrixWorld);
      const steps = Math.ceil(a.distanceTo(b) / 0.05);
      for (let k = 0; k <= steps; k++) {
        v.lerpVectors(a, b, k / steps);
        const inside =
          Math.hypot(v.x - hub.x, v.z - hub.z) < sweep && v.y > blades.min.y - 0.05 && v.y < canopy.min.y;
        assert.ok(!inside, 'Fan clearance: ' + mesh.name + ' enters the blade sweep or drop rod');
      }
    }
}
assert.ok(
  Math.abs(canopy.max.y - bounds('Study_Ceiling').min.y) < 0.03,
  'Fan canopy meets the ceiling boards',
);
// Prop clearance: no prop mesh may cut through the shell, the trim, the beams or another prop,
// with both drawers shut and pulled open. Window and door frames are set into the walls on purpose.
const props = [
  'Beanbag',
  'Desk',
  'ks_book',
  'ks_crt',
  'ks_archive',
  'ks_guestbook',
  'ks_map',
  'ks_shelf',
  'ks_chair',
  'ks_lamp',
  'ks_door',
  'ks_ceiling_fan',
  'ks_clock',
  'ks_window',
];
const pieces = [];
for (const child of scene.children) {
  const parts = [];
  child.traverse(o => o.isMesh && parts.push(o));
  for (const mesh of parts)
    // Indirect trees leave the shared glTF index buffers untouched.
    pieces.push({
      group: props.includes(child.name) ? child.name : 'shell',
      mesh,
      bvh: new MeshBVH(mesh.geometry, {indirect: true}),
    });
}
// Floor contact is checked below as "stands on the floor".
const framed = (p, q) =>
  q.mesh.name === 'Study_Floor' ||
  (['ks_window', 'ks_door'].includes(p.group) && q.group === 'shell' && /^(Cabin|Study)_/.test(q.mesh.name));
const clashes = () => {
  scene.updateMatrixWorld(true);
  const found = [];
  for (const p of pieces) p.box = new THREE.Box3().setFromObject(p.mesh);
  for (let i = 0; i < pieces.length; i++)
    for (let j = i + 1; j < pieces.length; j++) {
      const [p, q] = [pieces[i], pieces[j]];
      if (p.group === q.group || framed(p, q) || framed(q, p) || !p.box.intersectsBox(q.box)) continue;
      const toP = p.mesh.matrixWorld.clone().invert().multiply(q.mesh.matrixWorld);
      if (p.bvh.intersectsGeometry(q.mesh.geometry, toP)) found.push(p.mesh.name + ' / ' + q.mesh.name);
    }
  return found;
};
assert.deepEqual(clashes(), [], 'Props clip with the drawers shut');
const deskDrawer = scene.getObjectByName('Desk_Drawer'),
  archiveDrawer = scene.getObjectByName('ks_archive_drawer');
// Travel matches DRAWER_OPEN_Z and ARCHIVE_DRAWER_OPEN_Z in RoomProps.tsx.
deskDrawer.position.z += 0.26;
archiveDrawer.position.z += 0.34;
assert.deepEqual(clashes(), [], 'Props clip with the drawers open');
deskDrawer.position.z -= 0.26;
archiveDrawer.position.z -= 0.34;
scene.updateMatrixWorld(true);
// Nothing floats: the map hangs on the log crowns, tables stand on the floor, desk things sit on the desk.
let crown = -Infinity;
const map = bounds('ks_map');
for (const mesh of meshes.filter(o => o.name.startsWith('Cabin_Side_Log'))) {
  const position = mesh.geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    if (v.x < 0 && v.y > map.min.y && v.y < map.max.y && v.z > map.min.z && v.z < map.max.z)
      crown = Math.max(crown, v.x);
  }
}
assert.ok(map.min.x - crown > 0 && map.min.x - crown < 0.005, 'Map hangs against the wall logs');
for (const n of ['Desk', 'ks_archive', 'ks_guestbook', 'ks_shelf', 'ks_chair', 'Beanbag'])
  assert.ok(Math.abs(bounds(n).min.y) < 0.005, n + ' stands on the floor');
for (const n of ['ks_book', 'ks_crt', 'ks_lamp', 'ks_clock'])
  assert.ok(Math.abs(bounds(n).min.y - bounds('Desk_Top').max.y) < 0.005, n + ' sits on the desk');
assert.ok(
  bounds('Guestbook_Cover').min.y - bounds('Cozy_Guest_Tabletop').max.y < 0.005,
  'Guestbook rests on its table',
);
let triangles = 0;
for (const mesh of meshes)
  triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
const report = {
  bytes: bytes.length,
  meshes: meshes.length,
  triangles,
  checks: [
    'Functional anchors',
    'Camera manifest alignment',
    'Square and triangular apertures',
    'Roof closure',
    'All authored camera corridors',
    'Desk and sill clearance',
    'Hearth clearance',
    'Chair heading',
    'Chimney ceiling and door clearance',
    'Rounded log geometry',
    'Ceiling fan clearance',
    'Prop clearance, drawers shut and open',
    'Props resting on wall, floor and desk',
  ],
};
await writeFile(
  new URL('../art/woodland-study/review/geometry.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));

/** The very first picture of the room must face the desk and window, not the floor. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {woodlandRoom, roomThemes} from '../src/components/room3d/themes.ts';

// Before the fix the canvas was given only a position; use that if the helper is missing.
const helper = await import('../src/components/room3d/startCamera.ts').catch(() => null);
const startCamera = helper?.startCamera ?? (front => ({position: front.position}));
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

// React Three Fiber turns a camera with no rotation toward (0,0,0), the middle of the floor.
const fiber = read('../node_modules/@react-three/fiber/dist/react-three-fiber.esm.js');
const fiberEvents = fiber.match(/from '\.\/(events-[\w]+\.esm\.js)'/)?.[1];
assert.ok(fiberEvents, 'found the React Three Fiber runtime');
assert.match(
  read(`../node_modules/@react-three/fiber/dist/${fiberEvents}`),
  /if \(!state\.camera && !\(cameraOptions != null && cameraOptions\.rotation\)\) camera\.lookAt\(0, 0, 0\)/,
  'React Three Fiber still aims a camera without a rotation at the floor centre',
);

function firstFrame(options) {
  const camera = new THREE.PerspectiveCamera(50, 16 / 10, 0.08, 40);
  camera.position.set(...options.position);
  if (options.rotation) camera.rotation.set(...options.rotation);
  else camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

const degrees = r => THREE.MathUtils.radToDeg(r);
const before = firstFrame({position: woodlandRoom.views.front.position});
const beforeDir = before.getWorldDirection(new THREE.Vector3());
assert.ok(degrees(Math.asin(beforeDir.y)) < -30, 'without a rotation the camera tilts steeply at the floor');

for (const room of Object.values(roomThemes)) {
  const front = room.views.front;
  const start = startCamera(front);
  assert.deepEqual(start.position, front.position, `${room.id}: starts where the front view stands`);
  const camera = firstFrame(start);
  const dir = camera.getWorldDirection(new THREE.Vector3());
  const want = new THREE.Vector3(...front.target).sub(new THREE.Vector3(...front.position)).normalize();
  const off = degrees(dir.angleTo(want));
  assert.ok(off < 0.01, `${room.id}: first frame looks at the front-view target (off by ${off.toFixed(3)}°)`);
  const pitch = degrees(Math.asin(dir.y));
  assert.ok(
    pitch > -10 && pitch < 10,
    `${room.id}: first frame looks level, not at the floor (${pitch.toFixed(1)}°)`,
  );
  // Follow the line of sight to the desk front and the window wall.
  const at = z => camera.position.clone().addScaledVector(dir, (z - camera.position.z) / dir.z);
  const desk = at(-1.3);
  assert.ok(desk.y > 0.75, `${room.id}: line of sight passes above the desk top (${desk.y.toFixed(2)} m)`);
  assert.ok(
    desk.x > -1.075 && desk.x < 0.775,
    `${room.id}: line of sight crosses the desk (x ${desk.x.toFixed(2)})`,
  );
  const wall = at(-2.11);
  assert.ok(
    wall.y > 1.14 && wall.y < 2.6,
    `${room.id}: line of sight meets the window wall at window height`,
  );
  assert.ok(Math.abs(camera.up.y - 1) < 1e-9, `${room.id}: camera stays upright`);
}

// So the room canvas must hand over a rotation, taken from the approved front (desk) view.
const scene = read('../src/components/room3d/RoomScene3D.tsx');
assert.match(
  scene,
  /camera=\{\{\s*\.\.\.startCamera\(activeRoom\.views\.front\)/,
  'the room canvas starts its camera from startCamera(front view)',
);

console.log(
  `First frame faces the desk and window (before: ${degrees(Math.asin(beforeDir.y)).toFixed(0)}° down at the floor).`,
);

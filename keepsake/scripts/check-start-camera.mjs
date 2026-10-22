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

// The welcome tour: each step that names a place turns the room camera to that place's view.
const {TOUR_STEPS} = await import('../src/lib/tour.ts');
const {faceForHotspot} = await import('../src/lib/roomLayout.ts');
const keyTargets = await import('../src/lib/keyTargets.ts');
// Before the fix the camera paused for every modal, the tour's speech bubble included.
const pauseSelector = keyTargets.CAMERA_PAUSING_DIALOG ?? '[aria-modal="true"]';
const shelfStep = TOUR_STEPS.find(step => step.focus === 'shelf');
assert.ok(shelfStep, 'the tour has a bookshelf step');
assert.equal(
  faceForHotspot(shelfStep.focus),
  'right',
  'the bookshelf step asks for the right (bookshelf) view',
);
for (const room of Object.values(roomThemes)) {
  const right = room.views.right;
  const dir = new THREE.Vector3(...right.target).sub(new THREE.Vector3(...right.position)).normalize();
  const yaw = degrees(Math.atan2(dir.x, -dir.z));
  assert.ok(
    Math.abs(yaw - 90) < 15,
    `${room.id}: the bookshelf view faces the east wall (${yaw.toFixed(1)}°)`,
  );
  const hitY = right.position[1] + (dir.y * (2.2 - right.position[0])) / dir.x;
  assert.ok(hitY > 0.6 && hitY < 2.2, `${room.id}: the bookshelf view meets the shelf at book height`);
}
for (const step of TOUR_STEPS.filter(step => step.focus)) {
  const face = faceForHotspot(step.focus);
  for (const room of Object.values(roomThemes)) {
    assert.ok(room.views[face], `${room.id}: tour step "${step.id}" uses an existing ${face} view`);
  }
}
const tour = read('../src/components/room/RoomTour.tsx');
assert.match(tour, /setRoomFace\(targetFace\)/, 'each tour step sets the room face for its place');
const camera = read('../src/components/room3d/RoomCamera.tsx');
assert.match(camera, /:\s*FACE_VIEW\[face\]\);/, 'while touring the camera aims at the face view');

// The tour bubble stays a modal dialog for screen readers, but must not freeze the camera.
const bubble = read('../src/components/room/DialogueBubble.tsx');
assert.match(bubble, /role="dialog"\s+aria-modal="true"/, 'the tour bubble is still a modal dialog');
assert.match(
  camera,
  /if \(document\.querySelector\(CAMERA_PAUSING_DIALOG\)\)/,
  'the camera pause checks the shared pausing-dialog selector',
);
const marker = keyTargets.TOUR_BUBBLE_ATTR;
assert.ok(marker && bubble.includes(`${marker}=""`), 'the tour bubble carries the tour marker');
assert.equal(
  pauseSelector,
  `[aria-modal='true']:not([${marker}])`,
  'the camera pause skips the tour bubble and still covers every other modal',
);
// Only the tour bubble opts out; every other modal dialog still freezes the camera.
const {readdirSync, statSync} = await import('node:fs');
const marked = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name) && readFileSync(path, 'utf8').includes(`${marker}=`)) marked.push(path);
  }
};
// fileURLToPath keeps this working on Windows, where URL.pathname gives "/C:/...".
walk((await import('node:url')).fileURLToPath(new URL('../src', import.meta.url)));
assert.deepEqual(
  marked.map(p => p.replace(/\\/g, '/').replace(/.*\/src\//, '')),
  ['components/room/DialogueBubble.tsx'],
  'only the tour bubble opts out of the camera pause',
);
// Tour turns use the timed glide (or a snap with reduced motion), not a different path.
const faceMode = camera.match(/const faceMode =([\s\S]*?);/)?.[1] ?? '';
assert.ok(!/!touring;?\s*$/.test(faceMode.trim()), 'tour turns between faces count as face moves');
assert.match(camera, /if \(move && !userMoved\.current && !reduced\)/, 'the glide also runs while touring');

console.log('The tour bubble no longer freezes the camera; the bookshelf step turns to the bookshelf view.');
console.log(
  `First frame faces the desk and window (before: ${degrees(Math.asin(beforeDir.y)).toFixed(0)}° down at the floor).`,
);

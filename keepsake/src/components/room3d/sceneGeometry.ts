import * as THREE from "three";
import { DESK_OBJECT, LAMP_OBJECT } from "../../lib/roomHotspots";
const STAND_IN_TOP_Y = 0.7645;
export function worldPos(scene: THREE.Object3D, names: string | string[], fallback: THREE.Vector3) {
  for (const name of Array.isArray(names) ? names : [names]) {
    const obj = scene.getObjectByName(name);
    if (!obj) continue;
    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    return p;
  }
  return fallback.clone();
}

export function hasGeometry(object: THREE.Object3D | undefined) {
  if (!object) return false;
  let found = false;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) found = true;
  });
  return found;
}

/** Tiny empty helpers do not count as a modeled desk. */
export function isDeskSized(object: THREE.Object3D | undefined) {
  if (!object || !hasGeometry(object)) return false;
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return false;
  const size = box.getSize(new THREE.Vector3());
  return size.x > 0.7 && size.z > 0.28 && box.max.y > 0.45;
}

export function findDeskObject(scene: THREE.Object3D) {
  const named = scene.getObjectByName(DESK_OBJECT);
  if (isDeskSized(named)) return named;
  let found: THREE.Object3D | undefined;
  scene.traverse((obj) => {
    if (found || !/desk/i.test(obj.name)) return;
    if (isDeskSized(obj)) found = obj;
  });
  return found ?? named;
}

/** Underside of `ks_book` — the plane the pages rest on. */
export function bookContactY(scene: THREE.Object3D): number | null {
  const book = scene.getObjectByName("ks_book");
  if (!book || !hasGeometry(book)) return null;
  const box = new THREE.Box3().setFromObject(book);
  if (box.isEmpty()) return null;
  return box.min.y;
}

type DeskMeasure = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
};

export const STAND_IN_DESK: DeskMeasure = {
  minX: -1.04,
  maxX: 0.74,
  minZ: -2.115,
  maxZ: -1.415,
  y: 0.765,
};

export function measureDesk(scene: THREE.Object3D): DeskMeasure {
  // The desk root includes props and drawer handles above the oak surface.
  // Measure the actual tabletop so clutter never inherits their height.
  const top = scene.getObjectByName("Desk_Top");
  if (top && hasGeometry(top)) {
    const box = new THREE.Box3().setFromObject(top);
    return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y: box.max.y };
  }
  const desk = findDeskObject(scene);
  const bookY = bookContactY(scene);
  if (desk && isDeskSized(desk)) {
    const box = new THREE.Box3().setFromObject(desk);
    const y = bookY != null && Math.abs(bookY - box.max.y) < 0.08 ? bookY : box.max.y;
    return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y };
  }
  return { ...STAND_IN_DESK, y: bookY ?? STAND_IN_TOP_Y };
}

/** Left-back corner of the desktop — where the lamp belongs. */
export function deskLampCorner(desk: DeskMeasure) {
  return new THREE.Vector3(desk.minX + 0.14, desk.y + 0.28, desk.minZ + 0.12);
}

export function lampShadePos(scene: THREE.Object3D) {
  const replacement=scene.getObjectByName('Light_Anchor');
  if(replacement)return replacement.getWorldPosition(new THREE.Vector3());
  const lamp = scene.getObjectByName(LAMP_OBJECT);
  if (lamp && hasGeometry(lamp)) {
    const box = new THREE.Box3().setFromObject(lamp);
    const p = new THREE.Vector3();
    box.getCenter(p);
    p.y = box.max.y - 0.03;
    return p;
  }
  const empty = worldPos(scene, LAMP_OBJECT, new THREE.Vector3(Number.NaN, 0, 0));
  if (Number.isFinite(empty.x) && empty.x < 0) {
    if (empty.y < 0.5) empty.y = 1.1;
    return empty;
  }
  return deskLampCorner(measureDesk(scene));
}

/** Locators with no mesh have an empty box — use the empty's world point, lifted off the floor. */
export function objectAnchor(object: THREE.Object3D, emptyLift: number) {
  const box = new THREE.Box3().setFromObject(object);
  const c = new THREE.Vector3();
  if (box.isEmpty()) {
    object.getWorldPosition(c);
    if (c.y < 0.4) c.y += emptyLift;
    return c;
  }
  box.getCenter(c);
  return c;
}

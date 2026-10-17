import * as THREE from 'three';
export function renderedMesh(o: THREE.Object3D): o is THREE.Mesh {
  if (!(o instanceof THREE.Mesh)) return false;
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  const m = o.material;
  if (!Array.isArray(m)) return m.visible;
  for (let i = 0; i < m.length; i++) if (m[i].visible) return true;
  return false;
}
const meshBox = new THREE.Box3();
function addBounds(o: THREE.Object3D, target: THREE.Box3) {
  if (renderedMesh(o)) {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (o.geometry.boundingBox)
      target.union(meshBox.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
  }
  for (let i = 0; i < o.children.length; i++) addBounds(o.children[i], target);
}
/** Same as visibleBounds, but fills a box you own so a per-frame caller allocates nothing. */
export function visibleBoundsInto(root: THREE.Object3D, target: THREE.Box3) {
  target.makeEmpty();
  root.updateWorldMatrix(true, true);
  addBounds(root, target);
  return target;
}
/** Geometry bounds exclude hidden originals and interaction targets. */
export function visibleBounds(root: THREE.Object3D) {
  return visibleBoundsInto(root, new THREE.Box3());
}
function collect(o: THREE.Object3D, out: THREE.Mesh[]) {
  if (renderedMesh(o)) out.push(o);
  for (let i = 0; i < o.children.length; i++) collect(o.children[i], out);
}
/** Empties `out`, then fills it with every rendered mesh under `root` (no allocation). */
export function collectRenderedMeshes(root: THREE.Object3D, out: THREE.Mesh[]) {
  out.length = 0;
  collect(root, out);
  return out;
}

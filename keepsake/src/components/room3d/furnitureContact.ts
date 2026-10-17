import * as THREE from 'three';
export function renderedMesh(o: THREE.Object3D): o is THREE.Mesh {
  if (!(o instanceof THREE.Mesh)) return false;
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return (Array.isArray(o.material) ? o.material : [o.material]).some(m => m.visible);
}
/** Geometry bounds exclude hidden originals and interaction targets. */
const meshBox = new THREE.Box3();
export function visibleBounds(root: THREE.Object3D, b = new THREE.Box3()) {
  b.makeEmpty();
  root.updateWorldMatrix(true, true);
  root.traverse(o => {
    if (renderedMesh(o)) {
      o.geometry.computeBoundingBox();
      if (o.geometry.boundingBox) b.union(meshBox.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
    }
  });
  return b;
}

import * as THREE from 'three';

/**
 * Scans exported before Keepsake Scanner wrote a material use glTF's default material,
 * which is fully metallic and looks almost black without an environment map. Show those
 * as matte instead. Display only: the stored model is not changed.
 */
export function matteDefaultMaterial(root: THREE.Object3D, hasMaterials: boolean) {
  if (hasMaterials) return;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial) { material.metalness = 0; material.roughness = 0.85; }
    }
  });
}

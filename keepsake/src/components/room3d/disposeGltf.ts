import * as THREE from 'three';
/** Releases the GPU copies of a parsed asset: geometry, materials and their textures. */
export function disposeGltf(asset: {scene: THREE.Object3D}) {
  asset.scene.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
      m.dispose();
    }
  });
}

import * as THREE from 'three';

const TEXTURE_KEYS = [
  'map',
  'lightMap',
  'bumpMap',
  'normalMap',
  'specularMap',
  'envMap',
  'alphaMap',
  'aoMap',
  'displacementMap',
  'emissiveMap',
  'gradientMap',
  'metalnessMap',
  'roughnessMap',
] as const;

/**
 * Clone a loaded model so the copy can be tinted without touching the loader's cached original.
 * Returns the copies so the owner can dispose them. Geometry and textures stay shared with the original.
 */
export function cloneWithOwnMaterials(source: THREE.Object3D) {
  const root = source.clone(true);
  const materials = new Map<THREE.Material, THREE.Material>();
  const copy = (original: THREE.Material) => {
    let local = materials.get(original);
    if (!local) {
      local = original.clone();
      materials.set(original, local);
    }
    return local;
  };
  root.traverse(o => {
    if (o instanceof THREE.Mesh)
      o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material);
  });
  return {root, materials: [...materials.values()]};
}

/** Free the GPU memory behind a model that nothing will show again (geometry, materials and textures). */
export function disposeScene(root: THREE.Object3D) {
  const seen = new Set<{dispose: () => void}>();
  const free = (item: {dispose: () => void} | null | undefined) => {
    if (item && !seen.has(item)) {
      seen.add(item);
      item.dispose();
    }
  };
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    free(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const key of TEXTURE_KEYS) free((m as unknown as Record<string, THREE.Texture | null>)[key]);
      free(m);
    }
  });
}

/**
 * Remembers each loaded model by its source so that, once no scan uses a source any more, the loader's
 * cached copy is dropped and its GPU memory freed. `clear` is the loader's own cache eviction.
 */
export function createModelCache(clear: (src: string) => void) {
  const loaded = new Map<string, THREE.Object3D>();
  const evict = (src: string) => {
    const scene = loaded.get(src);
    if (!scene) return;
    loaded.delete(src);
    clear(src);
    disposeScene(scene);
  };
  return {
    register: (src: string, scene: THREE.Object3D) => void loaded.set(src, scene),
    keepOnly: (active: ReadonlySet<string>) => {
      for (const src of [...loaded.keys()]) if (!active.has(src)) evict(src);
    },
    releaseAll: () => {
      for (const src of [...loaded.keys()]) evict(src);
    },
  };
}

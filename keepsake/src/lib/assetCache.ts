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

/** Free the graphics memory behind a loaded model (geometry, materials, textures). */
function disposeModel(root: THREE.Object3D) {
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

interface Entry<V> {
  promise: Promise<V>;
  value?: V;
  pins: number;
}

/**
 * A small least-recently-used cache for loaded models. At most `max` finished models are kept; the
 * oldest one nobody is using is dropped and its graphics memory freed. `hold` marks a model as in use.
 */
export function createAssetCache<K extends string, V extends {scene: THREE.Object3D}>({
  max,
  load,
}: {
  max: number;
  load: (key: K) => Promise<V>;
}) {
  const entries = new Map<K, Entry<V>>();
  const trim = () => {
    let done = [...entries].filter(([, e]) => e.value);
    for (const [key, entry] of done) {
      if (done.length <= max) break;
      if (entry.pins > 0) continue;
      entries.delete(key);
      done = done.filter(([k]) => k !== key);
      disposeModel(entry.value!.scene);
    }
  };
  return {
    get(key: K): Promise<V> {
      const entry = entries.get(key);
      if (entry) {
        entries.delete(key); // re-insert: the most recently used goes last
        entries.set(key, entry);
        return entry.promise;
      }
      const fresh: Entry<V> = {pins: 0, promise: undefined as unknown as Promise<V>};
      fresh.promise = load(key).then(
        value => {
          fresh.value = value;
          trim();
          return value;
        },
        error => {
          if (entries.get(key) === fresh) entries.delete(key);
          throw error;
        },
      );
      entries.set(key, fresh);
      return fresh.promise;
    },
    /** Keep a model while something is showing it. Call the returned function when done. */
    hold(key: K): () => void {
      const entry = entries.get(key);
      if (!entry) return () => {};
      entry.pins++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        entry.pins--;
        trim();
      };
    },
    keys: () => [...entries.keys()],
  };
}

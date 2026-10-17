import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FURNITURE_ITEMS, type FurnitureId} from '../../lib/furniture';
import {disposeGltf} from './disposeGltf';
const cache = new Map<FurnitureId, Promise<GLTF>>();
const users = new Map<FurnitureId, number>();
export function loadFurniture(id: FurnitureId) {
  const item = FURNITURE_ITEMS.find(item => item.id === id);
  if (!item) return Promise.reject(new Error('Unknown furniture choice'));
  let pending = cache.get(id);
  if (!pending) {
    pending = new GLTFLoader()
      .loadAsync(item.asset)
      .then(asset => {
        if (!asset.scene.children.length) throw new Error('Empty furniture asset');
        return asset;
      })
      .catch(error => {
        cache.delete(id);
        throw error;
      });
    cache.set(id, pending);
  }
  return pending;
}
/**
 * Marks a piece as shown in the room. Call the returned release after the
 * clones are removed; the last release frees the parsed asset's GPU memory.
 */
export function retainFurniture(id: FurnitureId) {
  users.set(id, (users.get(id) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const count = (users.get(id) ?? 1) - 1;
    if (count > 0) {
      users.set(id, count);
      return;
    }
    users.delete(id);
    const pending = cache.get(id);
    cache.delete(id);
    pending?.then(disposeGltf, () => {});
  };
}

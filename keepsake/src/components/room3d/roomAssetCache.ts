import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
const cache = new Map<string, Promise<GLTF>>();
/** One parsed asset per room; failed loads can be retried without losing the current room. */
export function loadRoomAsset(path: string): Promise<GLTF> {
  let pending = cache.get(path);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(path).then(asset => {
      for (const anchor of ['Desk','ks_book','ks_window','ks_shelf','ks_door']) {
        if (!asset.scene.getObjectByName(anchor)) throw new Error(`Room is missing ${anchor}`);
      }
      return asset;
    }).catch(error => {cache.delete(path); throw error;});
    cache.set(path, pending);
  }
  return pending;
}

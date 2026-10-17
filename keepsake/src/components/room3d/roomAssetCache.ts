import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {disposeGltf} from './disposeGltf';
const draco = new DRACOLoader().setDecoderPath('/decoders/draco/').setWorkerLimit(2);
const cache = new Map<string, Promise<GLTF>>();
const loaded = new Map<string, GLTF>();
/** One parsed asset per room; failed loads can be retried without losing the current room. */
export function loadRoomAsset(path: string): Promise<GLTF> {
  let pending = cache.get(path);
  if (!pending) {
    const next: Promise<GLTF> = new GLTFLoader()
      .setDRACOLoader(draco)
      .loadAsync(path)
      .then(asset => {
        for (const anchor of ['Desk', 'ks_book', 'ks_window', 'ks_shelf', 'ks_door']) {
          if (!asset.scene.getObjectByName(anchor)) throw new Error(`Room is missing ${anchor}`);
        }
        if (cache.get(path) === next) loaded.set(path, asset);
        return asset;
      })
      .catch(error => {
        if (cache.get(path) === next) cache.delete(path);
        throw error;
      });
    cache.set(path, next);
    pending = next;
  }
  return pending;
}
/**
 * Frees every parsed room except the one on screen. Each path is its own
 * parse, so no geometry, material or texture is shared with the active room.
 * Loads still in flight (a shop preview) stay cached until the next switch.
 */
export function releaseRoomAssetsExcept(path: string) {
  for (const [other, asset] of loaded) {
    if (other === path) continue;
    loaded.delete(other);
    cache.delete(other);
    disposeGltf(asset);
  }
}

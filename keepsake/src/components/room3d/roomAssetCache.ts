import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {createAssetCache} from '../../lib/assetCache';
const draco = new DRACOLoader().setDecoderPath('/decoders/draco/').setWorkerLimit(2);
/** Recent rooms stay parsed so switching back is quick; older unused ones are released. */
const cache = createAssetCache<string, GLTF>({
  max: 2,
  load: path =>
    new GLTFLoader()
      .setDRACOLoader(draco)
      .loadAsync(path)
      .then(asset => {
        for (const anchor of ['Desk', 'ks_book', 'ks_window', 'ks_shelf', 'ks_door']) {
          if (!asset.scene.getObjectByName(anchor)) throw new Error(`Room is missing ${anchor}`);
        }
        return asset;
      }),
});
/** One parsed asset per room; failed loads can be retried without losing the current room. */
export const loadRoomAsset = (path: string): Promise<GLTF> => cache.get(path);
/** Pin the room on screen so it is never released while visible. */
export const holdRoomAsset = (path: string) => cache.hold(path);

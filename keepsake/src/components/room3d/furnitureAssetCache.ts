import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FURNITURE_ITEMS, type FurnitureId} from '../../lib/furniture';
import {createAssetCache} from '../../lib/assetCache';
/** Previewing many shop items must not keep every model in memory; placed furniture is pinned. */
const cache = createAssetCache<FurnitureId, GLTF>({
  max: 6,
  load: id => {
    const item = FURNITURE_ITEMS.find(item => item.id === id);
    if (!item) return Promise.reject(new Error('Unknown furniture choice'));
    return new GLTFLoader().loadAsync(item.asset).then(asset => {
      if (!asset.scene.children.length) throw new Error('Empty furniture asset');
      return asset;
    });
  },
});
export const loadFurniture = (id: FurnitureId): Promise<GLTF> => cache.get(id);
/** Pin furniture that is placed in the room so it is never released while shown. */
export const holdFurniture = (id: FurnitureId) => cache.hold(id);

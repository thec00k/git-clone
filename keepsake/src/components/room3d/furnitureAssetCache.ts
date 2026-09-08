import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {FURNITURE_ITEMS,type FurnitureId} from '../../lib/furniture';
const cache=new Map<FurnitureId,Promise<GLTF>>();
export function loadFurniture(id:FurnitureId){
  const item=FURNITURE_ITEMS.find(item=>item.id===id);
  if(!item)return Promise.reject(new Error('Unknown furniture choice'));
  let pending=cache.get(id);
  if(!pending){pending=new GLTFLoader().loadAsync(item.asset).then(asset=>{
    if(!asset.scene.children.length)throw new Error('Empty furniture asset');return asset;
  }).catch(error=>{cache.delete(id);throw error;});cache.set(id,pending);}
  return pending;
}

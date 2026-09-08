import * as THREE from 'three';

/** Bounds of each mesh only; attached books and plants don't affect fitting. */
export function furnitureBounds(objects:THREE.Mesh[],space:THREE.Object3D){
  space.updateWorldMatrix(true,true);
  const inverse=space.matrixWorld.clone().invert(),box=new THREE.Box3();
  for(const o of objects){o.geometry.computeBoundingBox();if(o.geometry.boundingBox)box.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));}
  return box;
}
export function fitFurniture(model:THREE.Object3D,target:THREE.Box3,preserveAspect=false){
  model.updateMatrixWorld(true);const source=new THREE.Box3().setFromObject(model);
  const size=source.getSize(new THREE.Vector3()),wanted=target.getSize(new THREE.Vector3());
  if(size.toArray().some(v=>v<.00001)||target.isEmpty())throw new Error('Furniture has no usable bounds');
  const scale=wanted.divide(size);
  if(preserveAspect)scale.setScalar(Math.min(scale.x,scale.y,scale.z));
  const destination=target.min.clone();
  if(preserveAspect){const fitted=size.clone().multiply(scale);const center=target.getCenter(new THREE.Vector3());destination.x=center.x-fitted.x/2;destination.z=center.z-fitted.z/2;}
  const move=destination.sub(source.min.multiply(scale));
  model.applyMatrix4(new THREE.Matrix4().makeTranslation(move.x,move.y,move.z).multiply(new THREE.Matrix4().makeScale(scale.x,scale.y,scale.z)));
  model.updateMatrixWorld(true);
}

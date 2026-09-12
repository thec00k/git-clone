import {useFrame} from '@react-three/fiber';
import {useMemo,useRef} from 'react';
import * as THREE from 'three';
import {visibleBounds,renderedMesh} from './furnitureContact';
export function ChairFloorContact({scene}:{scene:THREE.Object3D}){
 const chair=useMemo(()=>scene.getObjectByName('ks_chair'),[scene]);
 const elapsed=useRef(1);
 useFrame((_,dt)=>{
  elapsed.current+=dt;if(elapsed.current<.1)return;elapsed.current=0;
  if(!chair)return;
  const chairBox=visibleBounds(chair);if(chairBox.isEmpty())return;
  let floor=0;
  scene.traverse(o=>{if(!renderedMesh(o))return;let rug=o.name.startsWith('Semantic_Rug_');for(let p=o.parent;p&&!rug;p=p.parent)rug=p.name.startsWith('furniture:rug-');if(!rug)return;
   o.geometry.computeBoundingBox();const b=o.geometry.boundingBox?.clone().applyMatrix4(o.matrixWorld);if(b&&b.min.x<chairBox.max.x&&b.max.x>chairBox.min.x&&b.min.z<chairBox.max.z&&b.max.z>chairBox.min.z)floor=Math.max(floor,b.max.y);
  });
  const previous=Number(chair.userData.floorLift??0);const delta=floor+.001-chairBox.min.y;
  chair.position.y+=delta;chair.userData.floorLift=previous+delta;chair.updateWorldMatrix(true,true);
 });
 return null;
}

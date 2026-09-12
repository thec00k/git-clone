import * as THREE from 'three';
export function renderedMesh(o:THREE.Object3D):o is THREE.Mesh {
 if(!(o instanceof THREE.Mesh))return false;
 for(let p:THREE.Object3D|null=o;p;p=p.parent)if(!p.visible)return false;
 return (Array.isArray(o.material)?o.material:[o.material]).some(m=>m.visible);
}
/** Geometry bounds exclude hidden originals and interaction targets. */
export function visibleBounds(root:THREE.Object3D){const b=new THREE.Box3();root.updateWorldMatrix(true,true);root.traverse(o=>{if(renderedMesh(o)){o.geometry.computeBoundingBox();if(o.geometry.boundingBox)b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return b;}

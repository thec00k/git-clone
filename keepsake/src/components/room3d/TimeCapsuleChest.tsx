import {useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {useNav} from '../../store/nav';
export function TimeCapsuleChest(){
 const {scene}=useGLTF('/room/furniture/time-capsule.glb');const {isVisitor,setDiscoveryOpen}=useNav();
 const model=useMemo(()=>{const copy=scene.clone(true);copy.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return copy;},[scene]);
 return <group name="Keepsake_TimeCapsuleChest" position={[1.94,.002,-1.79]}>
  <primitive object={model} onClick={(e:import('@react-three/fiber').ThreeEvent<MouseEvent>)=>{if(!isVisitor&&e.delta<4){e.stopPropagation();setDiscoveryOpen('capsule');}}}/>
 </group>;
}


import {useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {useApp} from '../../store/appStore';
import {useNav} from '../../store/nav';
export function TimeCapsuleChest(){
 const {environment}=useApp();const sky=environment.roomTheme==='sky-castle';const metal=environment.roomTheme==='cyberpunk'&&environment.capsuleFinish!=='wood';
 const {scene}=useGLTF(sky?'/room/sky-castle/time-capsule.glb?v=129f1cea4a3b':metal?'/room/furniture/time-capsule-metal.glb?v=c005d55ec36d':'/room/furniture/time-capsule.glb');const {isVisitor,setDiscoveryOpen}=useNav();
 const model=useMemo(()=>{const copy=scene.clone(true);copy.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return copy;},[scene]);
 return <group name="Keepsake_TimeCapsuleChest" position={[1.94,.002,-1.79]}>
  {sky&&<pointLight name="Sky_Capsule_Glow" position={[0,.18,.25]} color="#bce9ff" intensity={.10} distance={.85} decay={2}/>}
  <primitive object={model} onClick={(e:import('@react-three/fiber').ThreeEvent<MouseEvent>)=>{if(!isVisitor&&e.delta<4){e.stopPropagation();setDiscoveryOpen('capsule');}}}/>
 </group>;
}


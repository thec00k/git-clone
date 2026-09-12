import {useEffect,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {Bounds,OrbitControls} from '@react-three/drei';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export function BinderScan({src}:{src:string}) {
 const [scene,setScene]=useState<THREE.Group|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;let asset:THREE.Group|undefined;setScene(null);setError('');
  const dispose=(root:THREE.Group)=>root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value instanceof THREE.Texture)value.dispose();m.dispose();}}});
  new GLTFLoader().load(src,g=>{asset=g.scene;if(active)setScene(asset);else dispose(asset);},undefined,()=>{if(active)setError('This scan could not be displayed. Try a new GLB export.');});
  return()=>{active=false;if(asset)dispose(asset);};
 },[src]);
 if(error)return <p role="alert">{error}</p>;
 return <div className="ks-binder-scan" aria-label="3D scanned card. Drag to rotate; scroll to zoom.">
  {!scene&&<p>Opening scan…</p>}
  <Canvas frameloop="demand" dpr={[1,1.25]} camera={{position:[0,0,3]}}><ambientLight intensity={1.5}/><directionalLight position={[2,4,5]} intensity={3}/>{scene&&<Bounds fit clip observe margin={1.25}><primitive object={scene}/></Bounds>}<OrbitControls makeDefault enablePan={false}/></Canvas>
 </div>;
}

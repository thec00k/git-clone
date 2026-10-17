import {useMemo} from 'react';
import * as THREE from 'three';
export function MapPictureLight({scene, night}: {scene?: THREE.Object3D; night: boolean}) {
  const fixture = useMemo(() => {
    const board = scene?.getObjectByName('ks_map');
    if (!board) return null;
    const b = new THREE.Box3().setFromObject(board);
    const z = (b.min.z + b.max.z) / 2;
    const target = new THREE.Object3D();
    target.position.set(b.max.x + 0.015, (b.min.y + b.max.y) / 2, z);
    return {x: b.max.x + 0.15, y: b.max.y + 0.055, z, target};
  }, [scene]);
  if (!fixture) return null;
  const {x, y, z, target} = fixture;
  return (
    <group>
      <mesh position={[x - 0.07, y, z]}>
        <boxGeometry args={[0.14, 0.018, 0.05]} />
        <meshStandardMaterial color="#7c6540" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[x, y, z]}>
        <boxGeometry args={[0.055, 0.035, 0.56]} />
        <meshStandardMaterial color="#7c6540" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[x - 0.005, y - 0.019, z]}>
        <boxGeometry args={[0.034, 0.005, 0.51]} />
        <meshStandardMaterial color="#f0dfb5" emissive="#ffdc98" emissiveIntensity={night ? 2 : 0} />
      </mesh>
      <primitive object={target} />
      {/* Always mounted (intensity 0 by day) so changing the time never changes the light count. */}
      <spotLight
        position={[x, y - 0.025, z]}
        target={target}
        color="#ffe0a3"
        intensity={night ? 4 : 0}
        angle={0.95}
        penumbra={0.65}
        distance={2.3}
        decay={2}
      />
    </group>
  );
}

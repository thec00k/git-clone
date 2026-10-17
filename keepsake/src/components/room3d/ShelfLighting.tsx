import {useMemo} from 'react';
import * as THREE from 'three';
export function ShelfLighting({scene, on}: {scene?: THREE.Object3D; on: boolean}) {
  const strips = useMemo(() => {
    if (!scene) return [];
    return ['ks_shelf_board_0', 'ks_shelf_board_1', 'ks_shelf_board_2', 'Shelf_Top'].flatMap(name => {
      const shelf = scene.getObjectByName(name);
      if (!shelf) return [];
      const box = new THREE.Box3().setFromObject(shelf);
      return [
        {
          name,
          x: box.max.x - 0.045,
          y: box.min.y - 0.008,
          z: (box.min.z + box.max.z) / 2,
          length: box.max.z - box.min.z - 0.1,
        },
      ];
    });
  }, [scene]);
  // Glowing strips under every board plus two washes shared between rows (was 12 point lights). Every light in
  // the scene is part of every material's shader, even at intensity 0, so fewer lights compile and draw faster.
  return (
    <>
      {strips.map(s => (
        <mesh key={s.name} position={[s.x, s.y, s.z]}>
          <boxGeometry args={[0.018, 0.009, s.length]} />
          <meshStandardMaterial
            color="#70634c"
            roughness={0.8}
            emissive="#ffe1ad"
            emissiveIntensity={on ? 0.9 : 0}
          />
        </mesh>
      ))}
      {/* Bounded washes cannot reach the floor, including with Balanced shadows off. */}
      {/* Always mounted: switching off sets intensity 0, so the light count (and every shader) stays the same. */}
      {strips
        .filter((_, i) => i % 2 === 0)
        .map(s => (
          <pointLight
            key={s.name}
            position={[s.x - 0.27, s.y - 0.025, s.z]}
            color="#ffe1ad"
            intensity={on ? 1.3 : 0}
            distance={0.95}
            decay={1}
          />
        ))}
    </>
  );
}

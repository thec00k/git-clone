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
  return (
    <>
      {strips.map(s => (
        <group key={s.name}>
          <mesh position={[s.x, s.y, s.z]}>
            <boxGeometry args={[0.018, 0.009, s.length]} />
            <meshStandardMaterial color="#70634c" roughness={0.8} />
          </mesh>
          {/* Bounded washes cannot reach the floor, including with Balanced shadows off. */}
          {on &&
            [-0.32, 0, 0.32].map(offset => (
              <pointLight
                key={offset}
                position={[s.x - 0.27, s.y - 0.025, s.z + offset * s.length]}
                color="#ffe1ad"
                intensity={0.65}
                distance={0.39}
                decay={1}
              />
            ))}
        </group>
      ))}
    </>
  );
}

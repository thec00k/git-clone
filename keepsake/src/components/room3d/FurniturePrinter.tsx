import {useEffect, useState, type ReactNode} from 'react';
import * as THREE from 'three';
import {holdFurniture, loadFurniture} from './furnitureAssetCache';
import {useApp} from '../../store/appStore';
import {useActiveRoom} from './useActiveRoom';

/** Keeps the printer's photo and click target in the shared desk assembly. */
export function FurniturePrinter({children}: {children: ReactNode}) {
  const {environment} = useApp();
  const room = useActiveRoom().id;
  const id =
    room === 'woodland' || room === 'beachfront' || room === 'cyberpunk'
      ? environment.furniture?.[room]?.printer
      : undefined;
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  // Keep the cached model while it is placed; unused ones may be released.
  useEffect(() => {
    let live = true;
    let release = () => {};
    if (id)
      loadFurniture(id)
        .then(() => {
          if (live) release = holdFurniture(id);
        })
        .catch(() => {});
    return () => {
      live = false;
      release();
    };
  }, [id]);
  useEffect(() => {
    let live = true;
    const materials: THREE.Material[] = [];
    setModel(null);
    if (id)
      loadFurniture(id)
        .then(asset => {
          if (!live) return;
          const next = asset.scene.clone(true);
          next.traverse(o => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (/^(Paper|Photo_inset)/.test(o.name)) o.visible = false;
              const clone = (m: THREE.Material) => {
                const copy = m.clone();
                materials.push(copy);
                return copy;
              };
              o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
            }
          });
          next.position.y = -0.023;
          next.scale.set(0.93, 0.85, 0.95);
          setModel(next);
        })
        .catch(() => {});
    return () => {
      live = false;
      materials.forEach(m => m.dispose());
    };
  }, [id]);
  return model ? <primitive object={model} /> : children;
}

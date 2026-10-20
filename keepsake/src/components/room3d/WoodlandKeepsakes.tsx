import {useEffect} from 'react';
import type {Object3D} from 'three';
import {useApp} from '../../store/appStore';
import {useSeasonal} from '../../hooks/useSeasonal';

/**
 * The Snowy Mountain keepsakes baked into the Woodland study model: the hide rug lies by the
 * hearth only in winter, and each wall mount hangs only when chosen in the drawer (Extras).
 */
export function WoodlandKeepsakes({scene}: {scene: Object3D}) {
  const {state} = useApp();
  const {season} = useSeasonal();
  const mounts = state.roomDecor?.wallMounts ?? [];
  const deer = mounts.includes('mount-deer'),
    bear = mounts.includes('mount-bear');
  useEffect(() => {
    const show = (name: string, visible: boolean) => {
      const node = scene.getObjectByName(name);
      if (node) node.visible = visible;
    };
    show('Hide_Rug', season === 'winter');
    show('Mount_Deer', deer);
    show('Mount_Bear', bear);
  }, [scene, season, deer, bear]);
  return null;
}

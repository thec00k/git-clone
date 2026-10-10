import {useMemo} from 'react';
import * as THREE from 'three';
import {useApp} from '../../store/appStore';
import {roomAgeLevel} from '../../lib/roomAge';
/** Cosmetic ageing: little dust bunnies gather in the corners of an untidied Woodland room. Tidy up at the door clears them. */
const CORNERS: [number, number][] = [[1.9, -2.0], [-1.95, -2.0], [1.9, 1.7], [-1.95, .9], [1.45, -1.4], [-1.9, -1.0], [1.95, .2], [.2, 1.85]];
export function DustBunnies() {
  const {environment} = useApp();
  const level = roomAgeLevel(environment.tidiedAt, Date.now());
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#cfc6b4', roughness: 1, transparent: true, opacity: .8, flatShading: true}), []);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(.05, 0), []);
  if (!level) return null;
  const count = level * 2 + 1 > CORNERS.length ? CORNERS.length : level * 2 + 1;
  return <group name="Dust_Bunnies">{CORNERS.slice(0, count).map(([x, z], i) => <mesh key={i} geometry={geo} material={mat} position={[x, .025, z]} scale={[1 + (i % 3) * .3, .5, 1 + ((i + 1) % 3) * .25]} rotation={[0, i, 0]}/>)}</group>;
}

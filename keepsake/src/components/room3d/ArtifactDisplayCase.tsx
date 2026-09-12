import {useEffect, useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {useApp} from '../../store/appStore';
import {CRT_LIGHT_COLORS} from '../../lib/roomMusic';
RectAreaLightUniformsLib.init();

/** Shared placement: clear of shelf end, wall trim, and the central walking aisle. */
export const DISPLAY_CASE_POSITION: [number, number, number] = [2.03, 0, 1.65];
export const DISPLAY_CASE_VIEW = {position: new THREE.Vector3(-.35,1.38,-.65), target: new THREE.Vector3(2.03,1.07,1.65)};

export function ArtifactDisplayCase() {
  const {environment} = useApp();
  const {scene} = useGLTF('/room/furniture/display-case.glb?v=right-angle-3');
  const tint = CRT_LIGHT_COLORS[environment.crtColor ?? 'green'];
  const on = environment.displayCaseLit !== false;
  const coastal = environment.roomTheme === 'beachfront';
  const model = useMemo(() => {
    const copy = scene.clone(true);
    const materials = new Map<THREE.Material, THREE.Material>();
    copy.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const convert = (original: THREE.Material) => {
        if (!materials.has(original)) materials.set(original, original.clone());
        return materials.get(original)!;
      };
      o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
      o.castShadow = !o.name.includes('Glass'); o.receiveShadow = !o.name.includes('Glass');
    });
    return {copy, materials};
  }, [scene]);
  useEffect(() => () => model.materials.forEach(m => m.dispose()), [model]);
  useEffect(() => {
    model.materials.forEach(m => {
      if (!(m instanceof THREE.MeshStandardMaterial)) return;
      if (m.name === 'Case_LED') {m.color.set(on ? tint : '#d5d0c0');m.emissive.set(tint);m.emissiveIntensity = on ? .85 : 0;}
      if (m.name === 'Case_PaintedTimber') {m.color.set(coastal ? '#eee9db' : '#d1c8af');m.emissive.copy(m.color);m.emissiveIntensity=.10;}
      if (m.name === 'Case_Oak') m.color.set(coastal ? '#ae916a' : '#796047');
      if (m instanceof THREE.MeshPhysicalMaterial && m.name === 'Case_Glass') {
        // Layered cabinet panes must remain readable on phones as well as desktop.
        // Alpha glass avoids multiple full-screen transmission render passes.
        m.transmission = 0; m.transparent = true; m.opacity = .12;
        m.depthWrite = false; m.roughness = .18; m.metalness = .15;
        m.side = THREE.DoubleSide; m.needsUpdate = true;
      }
    });
  }, [model, tint, on, coastal]);
  return <group name="Keepsake_ArtifactDisplayCase" position={DISPLAY_CASE_POSITION} rotation={[0,-3*Math.PI/4,0]}>
    <primitive object={model.copy}/>
    {on && [.60,1.08,1.58,2.04].map(y => <rectAreaLight key={y} color={tint} intensity={3.5} width={.65} height={.18} position={[0,y-.018,.04]} rotation={[-Math.PI/2,0,0]}/>)}
  </group>;
}

import {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import type {Phase} from '../room/RoomFurniture';

/**
 * Dust motes drifting in the Woodland window light (day and dusk; none at night).
 *
 * One THREE.Points draw. Every mote's path is worked out on the graphics card from a single
 * clock value, so nothing is rebuilt or allocated while the room runs: each frame only
 * moves one number. Motes start along the window opening and float slowly down the slope
 * of the sun's beam (the same direction as the window light in RoomLighting), fading in
 * and out. With "reduce motion" on, the effect is not drawn at all.
 */
const COUNT = 90;
const WINDOW_Z = -2.1; // inside face of the window wall in the Woodland study model
// Sun sits at (-0.15, 2.7, -2.6) and points at the room's centre, so light travels this way.
const BEAM = new THREE.Vector3(0.15, -2.7, 2.6).normalize();

const vertex = `
attribute vec2 aSeed;
uniform vec3 uBeam;
uniform float uTime, uPx, uSize;
varying float vAlpha;
void main(){
  float life = fract(position.z + uTime * 0.02);
  vec3 p = vec3(mix(-1.0, 0.7, position.x), mix(1.35, 2.95, position.y), ${WINDOW_Z.toFixed(2)}) + uBeam * (life * 3.0);
  float t = uTime;
  p += 0.07 * vec3(sin(t * 0.31 + aSeed.y * 6.28), sin(t * 0.23 + aSeed.y * 11.0), cos(t * 0.27 + aSeed.y * 9.0));
  float fade = smoothstep(0.0, 0.14, life) * (1.0 - smoothstep(0.7, 1.0, life)) * smoothstep(0.05, 0.45, p.y);
  float glint = 0.65 + 0.35 * sin(t * 0.9 + aSeed.y * 40.0);
  vAlpha = fade * glint;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(uSize * uPx * aSeed.x / -mv.z, 2.5, 9.0);
  gl_Position = projectionMatrix * mv;
}`;
const fragment = `
uniform vec3 uColor;
uniform float uStrength;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vAlpha * uStrength;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

/** Small seeded random numbers so the motes start in the same places every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WARM = {day: new THREE.Color('#fff1cf'), dusk: new THREE.Color('#ffc58a')};

export function WindowDustMotes({phase}: {phase: Phase}) {
  const reduced = useReducedMotion();
  const material = useRef<THREE.ShaderMaterial>(null);
  const clock = useRef(0);
  const geometry = useMemo(() => {
    const rand = mulberry32(185);
    const position = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      position.set([rand(), rand(), rand()], i * 3);
      seed.set([0.6 + rand() * 0.8, rand()], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uTime: {value: 0},
      uPx: {value: 400},
      uSize: {value: 0.03},
      uBeam: {value: BEAM},
      uColor: {value: new THREE.Color()},
      uStrength: {value: 0},
    }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const night = phase === 'night';
  useFrame(({gl}, dt) => {
    if (reduced || night || document.hidden || !material.current) return;
    clock.current += Math.min(dt, 0.05);
    const u = material.current.uniforms;
    u.uTime.value = clock.current;
    // Point sizes are in screen pixels: scale them to the canvas so motes look the same on any screen.
    u.uPx.value = gl.domElement.height * 0.9;
    u.uColor.value.copy(phase === 'dusk' ? WARM.dusk : WARM.day);
    u.uStrength.value = phase === 'dusk' ? 0.8 : 0.9;
  });
  if (reduced || night) return null;
  return (
    <points name="Window_Dust_Motes" geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

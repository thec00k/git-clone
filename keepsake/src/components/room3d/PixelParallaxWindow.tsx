import {useEffect, useMemo, useRef} from 'react';
import {useFrame, useLoader} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import type {Phase} from '../room/RoomFurniture';

/**
 * Prototype: layered pixel-art view for the Beachfront arched window (`?window=pixel`).
 * Art contract (see docs/beach-pixel-window.md): every layer is a 480x400 PNG, registered to one canvas.
 * The window opening fills the central 320x314 box; the rest is overscan that parallax may reveal.
 */
const PIXEL_WINDOW = {
  canvas: [480, 400],
  safe: {left: 80, bottom: 43, width: 320, height: 314},
  /** Measured from beachfront.glb: jamb faces, sill top and arch apex (metres, room space). */
  aperture: {minX: -1.1, maxX: 0.8, minY: 1.137, maxY: 3.0, z: -2.125},
  /** Viewing angle (offset / distance to the window) that counts as "straight on", and the angle at which a layer
   * reaches the edge of its overscan. Beyond it the layers hold still, so an edge can never show. */
  lookRef: [0, -0.35],
  lookMax: [0.6, 0.3],
} as const;

/** Back to front. `parallax` 1 uses the whole overscan; 0 would stay glued to the window frame. */
const LAYERS = [
  {key: '00_sky', parallax: 1, frames: 1},
  {key: '01_clouds', parallax: 0.85, frames: 1},
  {key: '02_far-sea', parallax: 0.7, frames: 1},
  {key: '03_near-water', parallax: 0.4, frames: 4},
  {key: '04_foreground', parallax: 0.15, frames: 1},
] as const;
const LOOP_FPS = 4;
const FADE_SECONDS = 1.5;
const PHASES: Phase[] = ['day', 'dusk', 'night'];

function urls(phase: Phase) {
  return LAYERS.flatMap(l =>
    l.frames === 1
      ? [`/room/beachfront/window/beach_${phase}_${l.key}.png`]
      : Array.from(
          {length: l.frames},
          (_, f) => `/room/beachfront/window/beach_${phase}_${l.key}_f${String(f + 1).padStart(2, '0')}.png`,
        ),
  );
}

const vertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D uA[5];
uniform sampler2D uB[5];
uniform float uParallax[5];
uniform float uFade;
uniform vec2 uShift;
uniform vec2 uMargin;
uniform vec4 uAperture;   // minX, minY, width, height
uniform float uWindowZ;
uniform vec4 uSafe;       // left, bottom, width, height as canvas fractions
varying vec3 vWorld;

vec3 over(vec3 col, vec4 s) { return mix(col, s.rgb, s.a); }
vec2 at(vec2 base, int i) { return base - uParallax[i] * uShift * uMargin; }
// Sampler arrays need constant indices in WebGL, so the five layers are spelled out.
vec3 stackA(vec2 b) {
  vec3 c = texture2D(uA[0], at(b, 0)).rgb;
  c = over(c, texture2D(uA[1], at(b, 1)));
  c = over(c, texture2D(uA[2], at(b, 2)));
  c = over(c, texture2D(uA[3], at(b, 3)));
  return over(c, texture2D(uA[4], at(b, 4)));
}
vec3 stackB(vec2 b) {
  vec3 c = texture2D(uB[0], at(b, 0)).rgb;
  c = over(c, texture2D(uB[1], at(b, 1)));
  c = over(c, texture2D(uB[2], at(b, 2)));
  c = over(c, texture2D(uB[3], at(b, 3)));
  return over(c, texture2D(uB[4], at(b, 4)));
}

void main() {
  // Where this ray crossed the window opening: the window, not the backdrop card, sets the framing.
  vec3 ray = vWorld - cameraPosition;
  vec2 hit = cameraPosition.xy + ray.xy * ((uWindowZ - cameraPosition.z) / ray.z);
  vec2 w = clamp((hit - uAperture.xy) / uAperture.zw, 0.0, 1.0);
  vec2 base = uSafe.xy + w * uSafe.zw;
  gl_FragColor = vec4(mix(stackA(base), stackB(base), uFade), 1.0);
  #include <colorspace_fragment>
}`;

export function PixelParallaxWindow({phase}: {phase: Phase}) {
  const reduced = useReducedMotion();
  const all = useLoader(THREE.TextureLoader, PHASES.flatMap(urls));
  const sets = useMemo(() => {
    for (const t of all) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
    }
    const per = all.length / PHASES.length;
    const bySet = Object.fromEntries(PHASES.map((p, i) => [p, all.slice(i * per, (i + 1) * per)])) as Record<
      Phase,
      THREE.Texture[]
    >;
    // Layer index -> its frames, for each phase.
    return Object.fromEntries(
      PHASES.map(p => {
        let n = 0;
        return [p, LAYERS.map(l => bySet[p].slice(n, (n += l.frames)))];
      }),
    ) as Record<Phase, THREE.Texture[][]>;
  }, [all]);
  useEffect(() => () => all.forEach(t => t.dispose()), [all]);

  const {canvas, safe, aperture} = PIXEL_WINDOW;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        toneMapped: false,
        uniforms: {
          uA: {value: LAYERS.map(() => null)},
          uB: {value: LAYERS.map(() => null)},
          uParallax: {value: LAYERS.map(l => l.parallax)},
          uFade: {value: 0},
          uShift: {value: new THREE.Vector2()},
          // One pixel short of the overscan, so linear minification never reaches past the canvas edge.
          uMargin: {value: new THREE.Vector2((safe.left - 1) / canvas[0], (safe.bottom - 1) / canvas[1])},
          uAperture: {
            value: new THREE.Vector4(
              aperture.minX,
              aperture.minY,
              aperture.maxX - aperture.minX,
              aperture.maxY - aperture.minY,
            ),
          },
          uWindowZ: {value: aperture.z},
          uSafe: {
            value: new THREE.Vector4(
              safe.left / canvas[0],
              safe.bottom / canvas[1],
              safe.width / canvas[0],
              safe.height / canvas[1],
            ),
          },
        },
      }),
    [canvas, safe, aperture],
  );
  useEffect(() => () => material.dispose(), [material]);

  // Cross-fade from the phase on screen to the new one; reduced motion swaps at once.
  const fade = useRef({from: phase, to: phase, t: 1});

  const center = useMemo(
    () => new THREE.Vector2((aperture.minX + aperture.maxX) / 2, (aperture.minY + aperture.maxY) / 2),
    [aperture],
  );
  useFrame(({camera, clock}, delta) => {
    const u = material.uniforms;
    if (fade.current.to !== phase) fade.current = {from: fade.current.to, to: phase, t: reduced ? 1 : 0};
    const f = fade.current;
    f.t = Math.min(1, f.t + delta / FADE_SECONDS);
    const frame = reduced ? 0 : Math.floor(clock.elapsedTime * LOOP_FPS);
    LAYERS.forEach((l, i) => {
      u.uA.value[i] = sets[f.from][i][frame % l.frames];
      u.uB.value[i] = sets[f.to][i][frame % l.frames];
    });
    u.uFade.value = f.t * f.t * (3 - 2 * f.t);
    if (reduced) {
      u.uShift.value.set(0, 0);
      return;
    }
    // Viewing angle to the window centre, measured from "straight on" and clamped to the overscan.
    const distance = Math.max(0.3, camera.position.z - aperture.z);
    const [rx, ry] = PIXEL_WINDOW.lookRef,
      [mx, my] = PIXEL_WINDOW.lookMax;
    u.uShift.value.set(
      THREE.MathUtils.clamp(((camera.position.x - center.x) / distance - rx) / mx, -1, 1),
      THREE.MathUtils.clamp(((camera.position.y - center.y) / distance - ry) / my, -1, 1),
    );
  });

  // A card behind the open casements, wide enough for every ray through the opening from anywhere in the room.
  return (
    <mesh
      name="beachfront-pixel-window"
      position={[center.x, 2.4, -3.05]}
      renderOrder={-10}
      material={material}
    >
      <planeGeometry args={[9, 6]} />
    </mesh>
  );
}

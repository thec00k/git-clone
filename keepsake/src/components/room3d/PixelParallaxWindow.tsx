import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import type {Phase} from '../room/RoomFurniture';

/**
 * Prototype: layered pixel-art view for the Beachfront arched window (`?window=pixel`).
 * Art contract (see docs/beach-pixel-window.md): one looping animation, day -> dusk -> night, exported as a
 * 480x400 PNG frame sequence per layer. The window opening fills the central 320x314 box; the rest is overscan
 * that parallax may reveal.
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

/** Back to front. `parallax` 1 uses the whole overscan; 0 would stay glued to the window frame.
 * A flattened (single-layer) animation would be one entry here; unused shader slots stay transparent. */
const LAYERS = [
  {key: '00_sky', parallax: 1},
  {key: '01_clouds', parallax: 0.85},
  {key: '02_far-sea', parallax: 0.7},
  {key: '03_near-water', parallax: 0.4},
  {key: '04_foreground', parallax: 0.15},
] as const;
const SLOTS = 5;

/** The animation: 15 s at 8 fps. Each time of day is a 40-frame section; its first 16 frames are the change from
 * the time before, the other 24 a steady stretch that loops while the room stays at that time. */
const TIMELINE = {
  fps: 8,
  frames: 120,
  section: 40,
  change: 16,
  start: {day: 0, dusk: 40, night: 80},
} as const;
/** How much faster the playhead runs through a time of day the room skipped (day straight to night). */
const SKIP_SPEED = 4;

const frameUrl = (layer: string, frame: number) =>
  `/room/beachfront/window/beach_${layer}_${String(frame + 1).padStart(3, '0')}.png`;

/** Where the playhead goes next: loop the target's steady stretch, or run forward through the cycle to reach it. */
function advance(head: number, phase: Phase, step: number) {
  const {frames, section, change, start} = TIMELINE;
  const steady = start[phase] + change,
    end = start[phase] + section;
  if (head >= steady && head < end) return steady + ((head - steady + step) % (section - change));
  const inChange = head >= start[phase] && head < steady;
  return (head + step * (inChange ? 1 : SKIP_SPEED)) % frames;
}

const vertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D uLayer[5];
uniform float uParallax[5];
uniform vec2 uShift;
uniform vec2 uMargin;
uniform vec4 uAperture;   // minX, minY, width, height
uniform float uWindowZ;
uniform vec4 uSafe;       // left, bottom, width, height as canvas fractions
varying vec3 vWorld;

vec3 over(vec3 col, vec4 s) { return mix(col, s.rgb, s.a); }
vec2 at(vec2 base, int i) { return base - uParallax[i] * uShift * uMargin; }
// Sampler arrays need constant indices in WebGL, so the five layers are spelled out.
vec3 stack(vec2 b) {
  vec3 c = texture2D(uLayer[0], at(b, 0)).rgb;
  c = over(c, texture2D(uLayer[1], at(b, 1)));
  c = over(c, texture2D(uLayer[2], at(b, 2)));
  c = over(c, texture2D(uLayer[3], at(b, 3)));
  return over(c, texture2D(uLayer[4], at(b, 4)));
}

void main() {
  // Where this ray crossed the window opening: the window, not the backdrop card, sets the framing.
  vec3 ray = vWorld - cameraPosition;
  vec2 hit = cameraPosition.xy + ray.xy * ((uWindowZ - cameraPosition.z) / ray.z);
  vec2 w = clamp((hit - uAperture.xy) / uAperture.zw, 0.0, 1.0);
  vec2 base = uSafe.xy + w * uSafe.zw;
  gl_FragColor = vec4(stack(base), 1.0);
  #include <colorspace_fragment>
}`;

export function PixelParallaxWindow({phase}: {phase: Phase}) {
  const reduced = useReducedMotion();
  // PNG frames stay compressed in memory (a few KB each); only the frame on screen is decoded and uploaded.
  const [blobs, setBlobs] = useState<Blob[][] | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all(
      LAYERS.map(l =>
        Promise.all(
          Array.from({length: TIMELINE.frames}, (_, f) => fetch(frameUrl(l.key, f)).then(r => r.blob())),
        ),
      ),
    ).then(b => live && setBlobs(b));
    return () => {
      live = false;
    };
  }, []);
  const textures = useMemo(
    () =>
      Array.from({length: SLOTS}, () => {
        const t = new THREE.Texture();
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = false; // ImageBitmaps are decoded upside down instead
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        return t;
      }),
    [],
  );
  const blank = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(
    () => () => {
      textures.forEach(t => {
        if (t.image instanceof ImageBitmap) t.image.close();
        t.dispose();
      });
      blank.dispose();
    },
    [textures, blank],
  );

  const {canvas, safe, aperture} = PIXEL_WINDOW;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        toneMapped: false,
        uniforms: {
          uLayer: {value: textures.map((t, i) => (i < LAYERS.length ? t : blank))},
          uParallax: {value: Array.from({length: SLOTS}, (_, i) => LAYERS[i]?.parallax ?? 0)},
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
    [canvas, safe, aperture, textures, blank],
  );
  useEffect(() => () => material.dispose(), [material]);

  const head = useRef<number | null>(null);
  const shown = useRef(-1);
  const decoding = useRef(false);
  const [ready, setReady] = useState(false);
  const show = (frame: number) => {
    if (!blobs || decoding.current || frame === shown.current) return;
    decoding.current = true;
    Promise.all(LAYERS.map((_, i) => createImageBitmap(blobs[i][frame], {imageOrientation: 'flipY'})))
      .then(bitmaps => {
        bitmaps.forEach((bitmap, i) => {
          const old = textures[i].image;
          textures[i].image = bitmap;
          textures[i].needsUpdate = true;
          if (old instanceof ImageBitmap) old.close();
        });
        shown.current = frame;
        setReady(true);
      })
      .finally(() => {
        decoding.current = false;
      });
  };

  const center = useMemo(
    () => new THREE.Vector2((aperture.minX + aperture.maxX) / 2, (aperture.minY + aperture.maxY) / 2),
    [aperture],
  );
  useFrame(({camera}, delta) => {
    const u = material.uniforms;
    const {fps, change, start} = TIMELINE;
    // Reduced motion: hold the first steady frame of the room's time of day, no change animation.
    if (head.current === null || reduced) head.current = start[phase] + change;
    else head.current = advance(head.current, phase, delta * fps);
    show(Math.floor(head.current));
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
      visible={ready}
    >
      <planeGeometry args={[9, 6]} />
    </mesh>
  );
}

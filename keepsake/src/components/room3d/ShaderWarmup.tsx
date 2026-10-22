import {useEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomLoading} from './RoomLoading';
import {setWarmupProgress} from './warmupProgress';

/** Longest we hold the first frame if a driver never reports compile completion. */
const WARMUP_LIMIT_MS = 20000;
/** Main-thread time a frame may spend on warm-up draws before yielding to the next frame. */
// (Also the threshold past which a single draw counts as having waited on the driver.)
const FRAME_BUDGET_MS = 8;
/** A camera layer nothing in the room uses, so one object can be drawn on its own. */
const WARM_LAYER = 31;

type Drawable = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  isMesh?: boolean;
  isPoints?: boolean;
  isLine?: boolean;
  isSprite?: boolean;
};
const isDrawable = (object: THREE.Object3D): object is Drawable => {
  const o = object as Drawable;
  return !!(o.isMesh || o.isPoints || o.isLine || o.isSprite);
};
const materialsOf = (object: Drawable) =>
  (Array.isArray(object.material) ? object.material : [object.material]).filter(
    (m): m is THREE.Material => !!m,
  );

/**
 * Draws one object, with the room's lights, into a single pixel in the corner of the canvas.
 *
 * Linking a shader is not the whole cost of a shader. On Windows the browser's graphics layer (ANGLE on Direct3D)
 * builds the real GPU program for a shader the first time something is actually drawn with it, so a room whose
 * shaders were all "compiled" behind the loading screen still froze for about two seconds on its first visible
 * frame (measured on an RTX 3070: 2.1 s, with the time landing in the first blocking GL call per program), and
 * again for 70 to 220 ms whenever a view showed an object for the first time. Drawing each object once, out of
 * sight, pays that cost where it cannot be felt.
 *
 * The camera is moved to a spare layer and only this object and the lights join it, so the light count (part of
 * every shader) is the room's real one. The object's frustum culling is lifted so it is drawn wherever it is.
 */
export function warmDraw(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  object: THREE.Object3D,
) {
  const lights: THREE.Object3D[] = [];
  scene.traverseVisible(o => {
    if ((o as THREE.Light).isLight) lights.push(o);
  });
  const cameraMask = camera.layers.mask;
  const objectMask = object.layers.mask;
  const culled = object.frustumCulled;
  const lightMasks = lights.map(light => light.layers.mask);
  const scissor = gl.getScissor(new THREE.Vector4());
  const scissorTest = gl.getScissorTest();
  const autoClear = gl.autoClear;
  const shadowNeedsUpdate = gl.shadowMap.needsUpdate;
  const target = gl.getRenderTarget();
  try {
    camera.layers.set(WARM_LAYER);
    object.layers.enable(WARM_LAYER);
    object.frustumCulled = false;
    lights.forEach(light => light.layers.enable(WARM_LAYER));
    gl.setRenderTarget(null);
    gl.setScissorTest(true);
    gl.setScissor(0, 0, 1, 1);
    gl.autoClear = false;
    gl.render(scene, camera);
  } finally {
    camera.layers.mask = cameraMask;
    object.layers.mask = objectMask;
    object.frustumCulled = culled;
    lights.forEach((light, i) => {
      light.layers.mask = lightMasks[i];
    });
    gl.setScissorTest(scissorTest);
    gl.setScissor(scissor);
    gl.autoClear = autoClear;
    gl.shadowMap.needsUpdate = shadowNeedsUpdate;
    gl.setRenderTarget(target);
  }
}

/**
 * One object per distinct GPU program: the shader program three.js chose for the material, together with the
 * geometry's attribute layout (the driver builds a vertex program per layout). Everything else that shares a
 * program is free once its representative has been drawn.
 */
function representatives(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const seen = new Set<string>();
  const picks: THREE.Object3D[] = [];
  // What the first frame will show goes first, so the room can open as soon as possible if the limit is hit.
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  const inView = (object: Drawable) =>
    !object.geometry || !object.geometry.boundingSphere
      ? true
      : frustum.intersectsSphere(object.geometry.boundingSphere.clone().applyMatrix4(object.matrixWorld));
  const later: THREE.Object3D[] = [];
  scene.traverseVisible(object => {
    if (!isDrawable(object) || !object.geometry) return;
    const layout =
      Object.keys(object.geometry.attributes).sort().join(',') + (object.geometry.index ? '#i' : '');
    let fresh = false;
    for (const material of materialsOf(object)) {
      const program = (gl.properties.get(material) as {currentProgram?: {id: number}}).currentProgram;
      const key = `${program ? program.id : 'm' + material.uuid}|${layout}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fresh = true;
    }
    if (fresh) (inView(object) ? picks : later).push(object);
  });
  return picks.concat(later);
}

const isWebGL2 = (ctx: WebGLRenderingContext | WebGL2RenderingContext): ctx is WebGL2RenderingContext =>
  typeof WebGL2RenderingContext !== 'undefined' && ctx instanceof WebGL2RenderingContext;

/**
 * Compiles every room shader before the first frame, then draws one object per shader program out of sight.
 * three.js otherwise compiles each program synchronously on first draw, which froze the page for 20+ seconds on
 * load; compileAsync uses KHR_parallel_shader_compile, so the loading screen stays responsive. The warm-up draws
 * then make the graphics driver finish its own work (see warmDraw), a few per frame, so the loading screen keeps
 * moving instead of the room freezing after it appears.
 * Mount inside the room's Suspense boundary, after the room content, keyed by room/quality.
 */
export function ShaderWarmup({onReady}: {onReady: () => void}) {
  const {gl, scene, camera} = useThree();
  // null while compiling; then the objects still to draw.
  const queue = useRef<THREE.Object3D[] | null>(null);
  const total = useRef(0);
  const finished = useRef(false);
  // Set after each warm-up draw; the next draw waits until the GPU process has finished the previous one.
  const fence = useRef<WebGLSync | null>(null);
  // Whether the driver is answering quickly (a cached shader), so several draws can share a frame.
  const fast = useRef(true);
  useEffect(() => {
    let live = true;
    queue.current = null;
    finished.current = false;
    fast.current = true;
    setWarmupProgress(0);
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const compile = async () => {
      await gl.compileAsync(scene, camera);
      // A second pass catches materials swapped in by effects after the first commit.
      await frame();
      await gl.compileAsync(scene, camera);
    };
    compile()
      .catch(() => undefined)
      .then(() => {
        if (!live) return;
        const picks = representatives(gl, scene, camera);
        total.current = picks.length;
        queue.current = picks;
      });
    const limit = window.setTimeout(() => {
      if (live && !finished.current) {
        finished.current = true;
        queue.current = [];
        setWarmupProgress(1);
        onReady();
      }
    }, WARMUP_LIMIT_MS);
    return () => {
      live = false;
      window.clearTimeout(limit);
      const ctx = gl.getContext();
      if (fence.current && isWebGL2(ctx)) ctx.deleteSync(fence.current);
      fence.current = null;
    };
  }, [gl, scene, camera, onReady]);
  useFrame(() => {
    const pending = queue.current;
    if (finished.current || !pending) return;
    const ctx = gl.getContext();
    const gl2 = isWebGL2(ctx) ? ctx : null;
    if (fence.current && gl2) {
      // The driver builds a program while the previous draw runs, inside the browser's GPU process. Any GL call
      // that needs an answer would wait for it, so no more drawing until the fence says that work is done.
      if (gl2.getSyncParameter(fence.current, gl2.SYNC_STATUS) !== gl2.SIGNALED) return;
      gl2.deleteSync(fence.current);
      fence.current = null;
    }
    const start = performance.now();
    while (pending.length) {
      const object = pending.shift()!;
      // An object can leave the scene (a Suspense swap) between picking and drawing; skip it then.
      if (!object.parent) continue;
      const before = performance.now();
      warmDraw(gl, scene, camera, object);
      // A draw that took the whole budget waited on the driver: from now on, one draw per frame.
      if (performance.now() - before >= FRAME_BUDGET_MS) fast.current = false;
      if (!fast.current || performance.now() - start >= FRAME_BUDGET_MS) break;
    }
    if (gl2) {
      fence.current = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl2.flush();
    }
    setWarmupProgress(total.current ? 1 - pending.length / total.current : 1);
    if (pending.length) return;
    finished.current = true;
    onReady();
  });
  return null;
}

/**
 * After the room is shown, lazily loaded pieces (display case, chest, live scrapbook, map
 * print, furniture swaps) would still compile on first draw and freeze the page for seconds.
 * Each frame, any visible mesh whose material has no program yet is hidden from the camera
 * (layer mask 0, so components that toggle `visible` are unaffected), compiled in parallel,
 * then restored. Objects simply appear a moment later instead of stalling everything.
 * Before an object is restored it gets one warm-up draw (see warmDraw), within a per-frame
 * time budget, so a batch of new objects costs a few short frames rather than one long freeze.
 */
export function LateShaderGuard() {
  const {gl, scene, camera} = useThree();
  const hidden = useMemo(() => new Map<THREE.Mesh, number>(), []);
  useEffect(
    () => () => {
      hidden.forEach((mask, object) => {
        object.layers.mask = mask;
      });
      hidden.clear();
    },
    [hidden],
  );
  useFrame(() => {
    // A program can exist but still be compiling (shared by another, newer material), so
    // readiness is checked too. isReady() polls KHR_parallel_shader_compile without blocking.
    const pendingOn = (object: THREE.Mesh) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      let pending = false;
      for (const material of materials) {
        if (!material) continue;
        const program = (gl.properties.get(material) as {currentProgram?: {isReady(): boolean}})
          .currentProgram;
        if (!program) {
          gl.compile(object, camera, scene);
          pending = true;
        } else if (!program.isReady()) pending = true;
      }
      return pending;
    };
    const start = performance.now();
    hidden.forEach((mask, object) => {
      if (pendingOn(object) || performance.now() - start >= FRAME_BUDGET_MS) return;
      if (object.parent) warmDraw(gl, scene, camera, object);
      object.layers.mask = mask;
      hidden.delete(object);
    });
    scene.traverseVisible(object => {
      if (!(object instanceof THREE.Mesh) || hidden.has(object) || object.layers.mask === 0) return;
      if (pendingOn(object)) {
        hidden.set(object, object.layers.mask);
        object.layers.mask = 0;
      }
    });
  });
  return null;
}

/** Suppresses rendering (a positive-priority frame callback that never draws) until ready. */
function HoldFrames() {
  useFrame(() => undefined, 1);
  return null;
}

/** Shows the loading screen and withholds frames until the room's shaders are compiled. */
export function RoomRenderGate({ready}: {ready: boolean}) {
  if (ready) return <LateShaderGuard />;
  return (
    <>
      <HoldFrames />
      <RoomLoading />
    </>
  );
}

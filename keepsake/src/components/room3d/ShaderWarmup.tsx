import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomLoading } from "./RoomLoading";

/** Longest we hold the first frame if a driver never reports compile completion. */
const WARMUP_LIMIT_MS = 20000;

/**
 * Compiles every room shader before the first frame. three.js otherwise compiles each
 * program synchronously on first draw, which froze the page for 20+ seconds on load.
 * compileAsync uses KHR_parallel_shader_compile, so the loading screen stays responsive.
 * Mount inside the room's Suspense boundary, after the room content, keyed by room/quality.
 */
export function ShaderWarmup({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let live = true;
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const warm = async () => {
      await gl.compileAsync(scene, camera);
      // A second pass catches materials swapped in by effects after the first commit.
      await frame();
      await gl.compileAsync(scene, camera);
    };
    const limit = new Promise(resolve => window.setTimeout(resolve, WARMUP_LIMIT_MS));
    Promise.race([warm().catch(() => undefined), limit]).then(() => { if (live) onReady(); });
    return () => { live = false; };
  }, [gl, scene, camera, onReady]);
  return null;
}

/**
 * After the room is shown, lazily loaded pieces (display case, chest, live scrapbook, map
 * print, furniture swaps) would still compile on first draw and freeze the page for seconds.
 * Each frame, any visible mesh whose material has no program yet is hidden from the camera
 * (layer mask 0, so components that toggle `visible` are unaffected), compiled in parallel,
 * then restored. Objects simply appear a moment later instead of stalling everything.
 */
export function LateShaderGuard() {
  const { gl, scene, camera } = useThree();
  const hidden = useMemo(() => new Map<THREE.Mesh, number>(), []);
  useEffect(() => () => { hidden.forEach((mask, object) => { object.layers.mask = mask; }); hidden.clear(); }, [hidden]);
  useFrame(() => {
    // A program can exist but still be compiling (shared by another, newer material), so
    // readiness is checked too. isReady() polls KHR_parallel_shader_compile without blocking.
    const pendingOn = (object: THREE.Mesh) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      let pending = false;
      for (const material of materials) {
        if (!material) continue;
        const program = (gl.properties.get(material) as { currentProgram?: { isReady(): boolean } }).currentProgram;
        if (!program) { gl.compile(object, camera, scene); pending = true; }
        else if (!program.isReady()) pending = true;
      }
      return pending;
    };
    hidden.forEach((mask, object) => {
      if (!pendingOn(object)) { object.layers.mask = mask; hidden.delete(object); }
    });
    scene.traverseVisible(object => {
      if (!(object instanceof THREE.Mesh) || hidden.has(object) || object.layers.mask === 0) return;
      if (pendingOn(object)) { hidden.set(object, object.layers.mask); object.layers.mask = 0; }
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
export function RoomRenderGate({ ready }: { ready: boolean }) {
  if (ready) return <LateShaderGuard />;
  return <><HoldFrames /><RoomLoading /></>;
}

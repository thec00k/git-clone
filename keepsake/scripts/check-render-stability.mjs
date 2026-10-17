// Static guard against the patterns that froze the room for 8–25 seconds (October 2026).
// See docs/room-load-and-settings-performance.md for the measurements behind each rule.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = new URL('../src/components/room3d/', import.meta.url);
const lights = 'pointLight|spotLight|rectAreaLight|directionalLight|hemisphereLight|ambientLight';
const problems = [];
for (const name of fs.readdirSync(dir).filter(f => /\.(tsx|ts)$/.test(f))) {
  const source = fs.readFileSync(new URL(name, dir), 'utf8');
  source.split('\n').forEach((line, i) => {
    const at = `${path.join('src/components/room3d', name)}:${i + 1}`;
    // Mounting a light conditionally changes the scene's light count; three.js then
    // recompiles every material. Keep lights mounted and set intensity to 0 instead.
    // A light that depends only on which room is loaded is fine (room switches re-run the
    // shader warm-up); mark such lines with `render-stability: per-room`.
    if (new RegExp(`(&&|\\?)\\s*<(${lights})\\b`).test(line) && !line.includes('render-stability: per-room')) problems.push(`${at} conditionally mounts a light; dim it instead`);
    // Rect-area lights make every standard material's shader far heavier to compile and draw.
    if (/<rectAreaLight\b/.test(line)) problems.push(`${at} uses rectAreaLight; use emissive strips plus a point light`);
    // Any transmissive material adds a second full-scene render pass with its own shaders.
    if (/\btransmission\s*[:=]\s*(?!0\b)[\d.]/.test(line)) problems.push(`${at} enables transmission; use alpha glass`);
  });
}
assert.deepEqual(problems, [], `Render stability rules broken:\n${problems.join('\n')}`);

// The room must warm shaders before its first frame and guard late arrivals.
const scene = fs.readFileSync(new URL('RoomScene3D.tsx', dir), 'utf8');
assert.ok(/<RoomRenderGate\b/.test(scene) && /<ShaderWarmup\b/.test(scene), 'RoomScene3D must mount RoomRenderGate and ShaderWarmup');
const asset = fs.readFileSync(new URL('useRoomAsset.ts', dir), 'utf8');
assert.ok(/transmission = 0/.test(asset), 'useRoomAsset must convert transmissive GLB glass to alpha glass');
console.log('Render stability: no conditional lights, rect-area lights or transmission; shader warm-up gate present.');

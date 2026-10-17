// Static guard against the heavy-shader patterns that froze the room for 3–25 seconds (October 2026).
// Complements check-constant-lights.mjs (which keeps the light count fixed); see
// docs/room-load-and-settings-performance.md for the measurements behind each rule.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = new URL('../src/components/room3d/', import.meta.url);
const problems = [];
for (const name of fs.readdirSync(dir).filter(f => /\.(tsx|ts)$/.test(f))) {
  const source = fs.readFileSync(new URL(name, dir), 'utf8');
  source.split('\n').forEach((line, i) => {
    const at = `${path.join('src/components/room3d', name)}:${i + 1}`;
    // Rect-area lights make every standard material's shader far heavier to compile and draw.
    if (/<rectAreaLight\b/.test(line))
      problems.push(`${at} uses rectAreaLight; use emissive strips plus a point light`);
    // Any transmissive material adds a second full-scene render pass with its own shaders.
    if (/\btransmission\s*[:=]\s*(?!0\b)[\d.]/.test(line))
      problems.push(`${at} enables transmission; use alpha glass`);
  });
}
assert.deepEqual(problems, [], `Render stability rules broken:\n${problems.join('\n')}`);

// The room must compile shaders behind the loading screen and guard late arrivals.
const scene = fs.readFileSync(new URL('RoomScene3D.tsx', dir), 'utf8');
assert.ok(
  /<RoomRenderGate\b/.test(scene) && /<ShaderWarmup\b/.test(scene),
  'RoomScene3D must mount RoomRenderGate and ShaderWarmup',
);
const asset = fs.readFileSync(new URL('useRoomAsset.ts', dir), 'utf8');
assert.ok(/transmission = 0/.test(asset), 'useRoomAsset must convert transmissive GLB glass to alpha glass');
const model = fs.readFileSync(new URL('RoomModel.tsx', dir), 'utf8');
assert.ok(
  /<DisplayCaseLights\s*\/>/.test(model),
  'Display-case lights must mount with the room, not with the lazily loaded case',
);
console.log(
  'Render stability: no rect-area lights or transmission; shader warm-up gate and room-mounted case lights present.',
);

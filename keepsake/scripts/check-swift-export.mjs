// Runs Keepsake's own importer budget on a GLB written by the Swift exporter.
// Used by CI after the simulator test exports a worst-case scan:
//   node scripts/check-swift-export.mjs /path/to/export.glb
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLB_BUDGET, inspectGlb} from '../src/lib/glbBudget.ts';
import {toArrayBuffer} from './glb-fixtures.mjs';

const path = process.argv[2];
assert.ok(path, 'usage: check-swift-export.mjs <file.glb>');
const bytes = readFileSync(path);
const report = inspectGlb(toArrayBuffer(bytes));
assert.equal(report.triangles, 45_000, 'worst-case test mesh has 45,000 triangles');
assert.equal(report.vertexColors, true, 'exporter wrote COLOR_0');
assert.ok(bytes.length <= GLB_BUDGET.maxBytes, `file is ${bytes.length} bytes`);
assert.equal(report.images.length, 0, 'scans carry no textures');
console.log(`Swift export OK: ${report.triangles} triangles, ${(bytes.length / 1048576).toFixed(2)} MB, vertex colours`);

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLB_BUDGET, imageSize, inspectGlb} from '../src/lib/glbBudget.ts';
import {validateCardGlb} from '../src/lib/cardBinders.ts';
import {PNG_1X1, buildGlb, jpegWithSize, pngWithSize, toArrayBuffer} from './glb-fixtures.mjs';

const check = (options) => inspectGlb(toArrayBuffer(buildGlb(options)));
const rejects = (options, pattern, label) => assert.throws(() => check(options), pattern, label);
const png = (width, height) => ({mimeType: 'image/png', bytes: pngWithSize(width, height)});
const jpeg = (width, height) => ({mimeType: 'image/jpeg', bytes: jpegWithSize(width, height)});

// A plain scan mesh and a mesh with one real texture pass.
assert.equal(check().triangles, 1);
const textured = check({images: [{mimeType: 'image/png', bytes: PNG_1X1}], materials: 1});
assert.deepEqual(textured.images, [{mimeType: 'image/png', width: 1, height: 1}]);

// Header parsing for both formats.
assert.deepEqual(imageSize(pngWithSize(640, 480), 'image/png'), {width: 640, height: 480});
assert.deepEqual(imageSize(jpegWithSize(1024, 768), 'image/jpeg'), {width: 1024, height: 768});
assert.throws(() => imageSize(Buffer.from('not an image'), 'image/png'));
assert.throws(() => imageSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'image/jpeg'));
assert.throws(() => imageSize(PNG_1X1, 'image/webp'));

// Texture budget: side length, total pixels, format.
assert.equal(check({images: [png(GLB_BUDGET.maxImageSide, GLB_BUDGET.maxImageSide)]}).texturePixels, GLB_BUDGET.maxTexturePixels, 'one 2048 atlas fits exactly');
assert.equal(check({images: [jpeg(1024, 1024), jpeg(1024, 1024), jpeg(1024, 1024), jpeg(1024, 1024)]}).images.length, 4, 'four 1024 images fit exactly');
rejects({images: [png(4096, 4096)]}, /2048 pixels/, 'oversized texture side');
assert.equal(check({images: [png(2048, 4)]}).texturePixels, 8192, 'a long thin texture within the side limit is fine');
assert.throws(() => check({images: [png(2048, 4096)]}));
rejects({images: [png(2048, 2048), png(1024, 1024)]}, /too much memory/, 'total pixels');
rejects({images: [{mimeType: 'image/webp', bytes: PNG_1X1}]}, /PNG or JPEG/, 'unsupported format');
rejects({images: [png(0, 10)]}, /2048 pixels/, 'zero-sized texture');
rejects({images: Array.from({length: 5}, () => png(8, 8))}, /four textures/, 'image count');

// Embedded image data must lie inside the binary chunk.
rejects({images: [png(8, 8)], edit: (json) => ({...json, bufferViews: json.bufferViews.map((view, index) => (index === 1 ? {...view, byteLength: 1_000_000} : view))})}, /could not be read/, 'out-of-range texture');
rejects({images: [png(8, 8)], edit: (json) => ({...json, images: [{...json.images[0], mimeType: undefined}]})}, /could not be read/, 'missing mime type');

// Draw-call style limits.
assert.equal(check({primitives: GLB_BUDGET.maxPrimitives}).primitives, 16);
rejects({primitives: GLB_BUDGET.maxPrimitives + 1}, /16 mesh parts/, 'too many primitives');
rejects({materials: GLB_BUDGET.maxMaterials + 1}, /8 materials/, 'too many materials');

// Geometry and safety rules that predate this budget still hold.
rejects({edit: (json) => ({...json, accessors: [{count: 150003}]})}, /50,000 triangles/, 'triangle cap');
rejects({edit: (json) => ({...json, buffers: [{uri: 'https://example.com/a.bin'}]})}, /embedded textures/, 'remote buffer');
rejects({edit: (json) => ({...json, extensionsRequired: ['KHR_draco_mesh_compression']})}, /no required extensions/, 'required extension');
rejects({edit: (json) => ({...json, nodes: [{children: [0]}]})}, /circular/, 'node cycle');
assert.throws(() => inspectGlb(new ArrayBuffer(20)));

// Restoring a backup keeps the old rules: a model saved before the texture budget still restores.
const legacy = buildGlb({images: [png(4096, 4096)], primitives: 20, materials: 12});
assert.throws(() => validateCardGlb(toArrayBuffer(legacy)), /2048 pixels|16 mesh parts/, 'new imports are strict');
assert.equal(validateCardGlb(toArrayBuffer(legacy), false).asset.version, '2.0', 'restore accepts a previously saved model');
const remote = buildGlb({edit: (json) => ({...json, images: [{uri: 'https://example.com/t.png'}]})});
assert.throws(() => validateCardGlb(toArrayBuffer(remote), false), /embedded textures/, 'restore still refuses network references');

// The Swift scanner cannot import the budget, so make sure its constant does not drift past it.
const swift = readFileSync(new URL('../KeepsakeScanner/LowPolyMesh.swift', import.meta.url), 'utf8');
const swiftBudget = Number((/triangleBudget\s*=\s*([\d_]+)/.exec(swift) ?? [])[1]?.replaceAll('_', ''));
assert.ok(swiftBudget > 0 && swiftBudget <= GLB_BUDGET.maxTriangles, `scanner triangleBudget (${swiftBudget}) must be set and no larger than ${GLB_BUDGET.maxTriangles}`);

console.log('PASS scan budget: texture size/memory, parts, materials and format limits; backup restore stays lenient; scanner triangle budget within limit.');

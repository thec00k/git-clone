// Upload processing (supabase/functions/_shared/processImage.ts) with the same image library the edge
// function uses (magick-wasm): shrinks to 2048 px, turns photos upright, re-encodes as WebP without
// metadata, refuses unsafe or unknown files. imagescript only makes the test pictures here.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import * as magick from '@imagemagick/magick-wasm';
import imagescript from 'imagescript';
import {
  toWebp,
  headerSize,
  fitWithin,
  magickLib,
  UnsupportedImage,
  MAX_EDGE,
} from '../supabase/functions/_shared/processImage.ts';

const {Image} = imagescript;
await magick.initializeImageMagick(
  readFileSync(createRequire(import.meta.url).resolve('@imagemagick/magick-wasm/magick.wasm')),
);
const lib = magickLib(magick);
const text = bytes => Buffer.from(bytes).toString('latin1');

const wide = new Image(3000, 1500);
wide.fill(0x3366ccff);
const jpeg = await wide.encodeJPEG(80);
assert.deepEqual(headerSize(jpeg), {type: 'jpeg', width: 3000, height: 1500});
const png = await new Image(640, 480).encode();
assert.deepEqual(headerSize(png), {type: 'png', width: 640, height: 480});
assert.deepEqual(fitWithin(4000, 1000), {width: MAX_EDGE, height: 512});
assert.deepEqual(fitWithin(800, 600), {width: 800, height: 600});

// A JPEG carrying location data in an EXIF block comes out without it.
const exif = Buffer.concat([Buffer.from('Exif\0\0'), Buffer.from('GPS-SECRET-51.5,-0.12')]);
const app1 = Buffer.concat([
  Buffer.from([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff]),
  exif,
]);
const tagged = Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
assert.ok(text(tagged).includes('GPS-SECRET'), 'test file carries the location block');
assert.deepEqual(
  headerSize(tagged),
  {type: 'jpeg', width: 3000, height: 1500},
  'size found past the EXIF block',
);
const out = await toWebp(new Uint8Array(tagged), lib);
assert.equal(out.width, 2048);
assert.equal(out.height, 1024);
assert.equal(text(out.webp.subarray(0, 4)), 'RIFF');
assert.equal(text(out.webp.subarray(8, 12)), 'WEBP');
assert.ok(!text(out.webp).includes('GPS-SECRET') && !text(out.webp).includes('Exif'), 'no metadata kept');

// A phone photo stored sideways with an "turn right" tag (EXIF orientation 6) comes out upright.
const tiff = Buffer.from([
  0x4d,
  0x4d,
  0,
  0x2a,
  0,
  0,
  0,
  8, // big-endian TIFF header, first IFD at 8
  0,
  1,
  0x01,
  0x12,
  0,
  3,
  0,
  0,
  0,
  1,
  0,
  6,
  0,
  0,
  0,
  0,
  0,
  0, // one entry: orientation = 6; no next IFD
]);
const orient = Buffer.concat([Buffer.from('Exif\0\0'), tiff]);
const sideways = Buffer.concat([
  jpeg.subarray(0, 2),
  Buffer.from([0xff, 0xe1, (orient.length + 2) >> 8, (orient.length + 2) & 0xff]),
  orient,
  jpeg.subarray(2),
]);
const upright = await toWebp(new Uint8Array(sideways), lib);
assert.deepEqual([upright.width, upright.height], [1024, 2048], 'turned upright, then shrunk');

const small = await toWebp(png, lib);
assert.deepEqual([small.width, small.height], [640, 480], 'small photos keep their size');

// A tiny file claiming to be enormous is refused before decoding.
const bomb = new Uint8Array(png);
new DataView(bomb.buffer).setUint32(16, 20000);
new DataView(bomb.buffer).setUint32(20, 20000);
let decoded = false;
await assert.rejects(
  toWebp(bomb, {toWebp: async (...a) => ((decoded = true), lib.toWebp(...a))}),
  UnsupportedImage,
  'decompression bomb refused',
);
assert.ok(!decoded, 'never decoded');
await assert.rejects(toWebp(new TextEncoder().encode('not an image at all'), lib), UnsupportedImage);
await assert.rejects(
  toWebp(new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 10, 0, 10, 3, 1, 2, 3]), lib),
  UnsupportedImage,
  'broken JPEG',
);

console.log(
  'Image processing (magick-wasm): 2048 px limit, upright, WebP output, metadata removed, oversized and unknown files refused.',
);

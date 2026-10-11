// Upload processing (supabase/functions/_shared/processImage.ts) with the same image library the edge
// function uses: shrinks to 2048 px, re-encodes as WebP without metadata, refuses unsafe or unknown files.
import assert from 'node:assert/strict';
import imagescript from 'imagescript';
import {
  toWebp,
  headerSize,
  fitWithin,
  UnsupportedImage,
  MAX_EDGE,
} from '../supabase/functions/_shared/processImage.ts';

const {Image} = imagescript;
const lib = {decode: bytes => Image.decode(bytes)};
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

const small = await toWebp(png, lib);
assert.deepEqual([small.width, small.height], [640, 480], 'small photos keep their size');

// A tiny file claiming to be enormous is refused before decoding.
const bomb = new Uint8Array(png);
new DataView(bomb.buffer).setUint32(16, 20000);
new DataView(bomb.buffer).setUint32(20, 20000);
let decoded = false;
await assert.rejects(
  toWebp(bomb, {decode: async b => ((decoded = true), lib.decode(b))}),
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
  'Image processing: 2048 px limit, WebP output, metadata removed, oversized and unknown files refused.',
);

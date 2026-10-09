// Small GLB builders shared by the scan budget and scanner receiver checks.
// Everything here is generated in memory; no model or image files are read.

/** A real 1x1 PNG. */
export const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** The PNG above with a different size written into its header (the pixels are not decoded by the budget check). */
export function pngWithSize(width, height) {
  const copy = Buffer.from(PNG_1X1);
  copy.writeUInt32BE(width, 16);
  copy.writeUInt32BE(height, 20);
  return copy;
}

/** Just enough of a JPEG for its frame header to be read: SOI, one SOF0 segment, EOI. */
export function jpegWithSize(width, height) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);
}

const pad4 = (length) => (4 - (length % 4)) % 4;

/**
 * Build a GLB holding one triangle.
 * options.primitives: number of mesh primitives (all share the same triangle)
 * options.materials: number of (empty) materials
 * options.images: [{mimeType, bytes}] embedded as buffer views
 * options.edit: (json) => json, applied last
 */
export function buildGlb({primitives = 1, materials = 0, images = [], edit = (json) => json} = {}) {
  const positions = Buffer.alloc(36);
  [-0.3, -0.4, 0, 0.3, -0.4, 0, 0, 0.4, 0].forEach((value, index) => positions.writeFloatLE(value, index * 4));
  const parts = [positions];
  const bufferViews = [{buffer: 0, byteOffset: 0, byteLength: 36}];
  let offset = 36;
  const jsonImages = [];
  for (const image of images) {
    const padding = Buffer.alloc(pad4(image.bytes.length));
    bufferViews.push({buffer: 0, byteOffset: offset, byteLength: image.bytes.length});
    jsonImages.push({bufferView: bufferViews.length - 1, mimeType: image.mimeType});
    parts.push(image.bytes, padding);
    offset += image.bytes.length + padding.length;
  }
  const binary = Buffer.concat(parts);
  const json = edit({
    asset: {version: '2.0'}, scene: 0, scenes: [{nodes: [0]}], nodes: [{mesh: 0}],
    meshes: [{primitives: Array.from({length: primitives}, () => ({attributes: {POSITION: 0}}))}],
    ...(materials ? {materials: Array.from({length: materials}, () => ({}))} : {}),
    ...(jsonImages.length ? {images: jsonImages} : {}),
    buffers: [{byteLength: binary.length}], bufferViews,
    accessors: [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.3, -0.4, 0], max: [0.3, 0.4, 0]}],
  });
  const text = JSON.stringify(json);
  const jsonChunk = Buffer.from(text + ' '.repeat(pad4(text.length)));
  const file = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binary.length);
  file.writeUInt32LE(0x46546c67, 0); file.writeUInt32LE(2, 4); file.writeUInt32LE(file.length, 8);
  file.writeUInt32LE(jsonChunk.length, 12); file.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(file, 20);
  const binaryHeader = 20 + jsonChunk.length;
  file.writeUInt32LE(binary.length, binaryHeader); file.writeUInt32LE(0x004e4942, binaryHeader + 4); binary.copy(file, binaryHeader + 8);
  return file;
}

export const toArrayBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

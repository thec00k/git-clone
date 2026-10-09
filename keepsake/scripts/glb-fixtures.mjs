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
 * options.colors: true for Keepsake Scanner's vertex colours (normalized 16-bit RGBA, one per vertex)
 * options.edit: (json) => json, applied last
 */
export function buildGlb({primitives = 1, materials = 0, images = [], colors = false, edit = (json) => json} = {}) {
  const positions = Buffer.alloc(36);
  [-0.3, -0.4, 0, 0.3, -0.4, 0, 0, 0.4, 0].forEach((value, index) => positions.writeFloatLE(value, index * 4));
  const parts = [positions];
  const bufferViews = [{buffer: 0, byteOffset: 0, byteLength: 36}];
  let offset = 36;
  const accessors = [{bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.3, -0.4, 0], max: [0.3, 0.4, 0]}];
  const attributes = {POSITION: 0};
  if (colors) {
    const rgba = Buffer.alloc(3 * 8);
    [[65535, 0, 0], [0, 65535, 0], [0, 0, 65535]].forEach(([r, g, b], vertex) => { rgba.writeUInt16LE(r, vertex * 8); rgba.writeUInt16LE(g, vertex * 8 + 2); rgba.writeUInt16LE(b, vertex * 8 + 4); rgba.writeUInt16LE(65535, vertex * 8 + 6); });
    bufferViews.push({buffer: 0, byteOffset: offset, byteLength: rgba.length});
    accessors.push({bufferView: bufferViews.length - 1, componentType: 5123, normalized: true, count: 3, type: 'VEC4'});
    attributes.COLOR_0 = accessors.length - 1;
    parts.push(rgba); offset += rgba.length;
  }
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
    meshes: [{primitives: Array.from({length: primitives}, () => ({attributes: {...attributes}}))}],
    ...(materials ? {materials: Array.from({length: materials}, () => ({}))} : {}),
    ...(jsonImages.length ? {images: jsonImages} : {}),
    buffers: [{byteLength: binary.length}], bufferViews,
    accessors,
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

/**
 * The exact layout KeepsakeScanner/GLBExporter.swift writes: float positions, normalized
 * 16-bit RGBA COLOR_0, uint32 indices, one matte material, mode 4, buffer view targets.
 * `triangles` independent triangles (no shared vertices) is the worst case for file size.
 */
export function scannerGlb({triangles = 1, colors = true} = {}) {
  const vertexCount = triangles * 3;
  const positions = Buffer.alloc(vertexCount * 12);
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    const t = Math.floor(vertex / 3), corner = vertex % 3;
    positions.writeFloatLE((t % 300) * 0.004 + (corner === 1 ? 0.003 : 0), vertex * 12);
    positions.writeFloatLE(Math.floor(t / 300) * 0.004 + (corner === 2 ? 0.003 : 0), vertex * 12 + 4);
    positions.writeFloatLE(0, vertex * 12 + 8);
  }
  const parts = [positions], bufferViews = [{buffer: 0, byteOffset: 0, byteLength: positions.length, target: 34962}];
  const accessors = [{bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min: [0, 0, 0], max: [1.2, 0.6, 0]}];
  const attributes = {POSITION: 0};
  let offset = positions.length;
  if (colors) {
    const rgba = Buffer.alloc(vertexCount * 8);
    for (let vertex = 0; vertex < vertexCount; vertex++) { rgba.writeUInt16LE(40000, vertex * 8); rgba.writeUInt16LE(20000, vertex * 8 + 2); rgba.writeUInt16LE(9000, vertex * 8 + 4); rgba.writeUInt16LE(65535, vertex * 8 + 6); }
    bufferViews.push({buffer: 0, byteOffset: offset, byteLength: rgba.length, target: 34962});
    accessors.push({bufferView: 1, componentType: 5123, normalized: true, count: vertexCount, type: 'VEC4'});
    attributes.COLOR_0 = 1;
    parts.push(rgba); offset += rgba.length;
  }
  const indices = Buffer.alloc(vertexCount * 4);
  for (let vertex = 0; vertex < vertexCount; vertex++) indices.writeUInt32LE(vertex, vertex * 4);
  bufferViews.push({buffer: 0, byteOffset: offset, byteLength: indices.length, target: 34963});
  accessors.push({bufferView: bufferViews.length - 1, componentType: 5125, count: vertexCount, type: 'SCALAR'});
  parts.push(indices);
  const binary = Buffer.concat(parts);
  const json = {
    asset: {version: '2.0', generator: 'Keepsake Scanner'}, scene: 0, scenes: [{nodes: [0]}], nodes: [{mesh: 0}],
    meshes: [{primitives: [{attributes, indices: accessors.length - 1, material: 0, mode: 4}]}],
    materials: [{name: 'Keepsake scan', pbrMetallicRoughness: {baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.85}}],
    buffers: [{byteLength: binary.length}], bufferViews, accessors,
  };
  const text = JSON.stringify(json);
  const jsonChunk = Buffer.from(text + ' '.repeat(pad4(text.length)));
  const file = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binary.length);
  file.writeUInt32LE(0x46546c67, 0); file.writeUInt32LE(2, 4); file.writeUInt32LE(file.length, 8);
  file.writeUInt32LE(jsonChunk.length, 12); file.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(file, 20);
  const binaryHeader = 20 + jsonChunk.length;
  file.writeUInt32LE(binary.length, binaryHeader); file.writeUInt32LE(0x004e4942, binaryHeader + 4); binary.copy(file, binaryHeader + 8);
  return file;
}

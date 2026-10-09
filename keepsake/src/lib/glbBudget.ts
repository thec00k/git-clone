/**
 * Shared limits for scanned and imported GLB models.
 *
 * Pure TypeScript with no DOM or Node APIs, so the browser importer
 * (`validateCardGlb`) and the desktop scan receiver enforce identical rules.
 * The Swift scanner cannot import this file; `scripts/check-scan-budget.mjs`
 * verifies that its triangle budget stays at or under `maxTriangles`.
 */
export const GLB_BUDGET = {
  maxBytes: 5 * 1024 * 1024,
  maxTriangles: 50_000,
  maxNodes: 200,
  maxPrimitives: 16,
  maxMaterials: 8,
  maxImages: 4,
  /** Longest side of any embedded texture. */
  maxImageSide: 2048,
  /**
   * Total decoded texture pixels across all images: one 2048x2048 atlas or four
   * 1024x1024 images. About 22 MB of GPU memory once mipmaps are included.
   */
  maxTexturePixels: 4_194_304,
} as const;

export interface GltfJson {
  asset?: {version?: string};
  meshes?: {primitives?: {attributes?: {POSITION?: number}; indices?: number; mode?: number}[]}[];
  nodes?: {children?: number[]}[];
  materials?: unknown[];
  images?: {uri?: string; bufferView?: number; mimeType?: string}[];
  buffers?: {uri?: string}[];
  bufferViews?: {byteOffset?: number; byteLength?: number}[];
  accessors?: {count?: number}[];
  extensionsRequired?: string[];
}

export interface GlbReport {
  triangles: number;
  nodes: number;
  primitives: number;
  materials: number;
  images: {mimeType: string; width: number; height: number}[];
  texturePixels: number;
  json: GltfJson;
}

const BIN_CHUNK = 0x004e4942;

/** Width and height from a PNG or JPEG header, without decoding the image. */
export function imageSize(bytes: Uint8Array, mimeType: string): {width: number; height: number} {
  const fail = () => new Error('An embedded texture could not be read. Use PNG or JPEG textures.');
  if (mimeType === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 24 || signature.some((value, index) => bytes[index] !== value)) throw fail();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {width: view.getUint32(16, false), height: view.getUint32(20, false)};
  }
  if (mimeType === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw fail();
    let position = 2;
    while (position + 4 <= bytes.length) {
      if (bytes[position] !== 0xff) { position++; continue; }
      const marker = bytes[position + 1];
      if (marker === 0xff) { position++; continue; }
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { position += 2; continue; }
      const length = (bytes[position + 2] << 8) | bytes[position + 3];
      if (length < 2) throw fail();
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        if (position + 9 > bytes.length) throw fail();
        return {height: (bytes[position + 5] << 8) | bytes[position + 6], width: (bytes[position + 7] << 8) | bytes[position + 8]};
      }
      position += 2 + length;
    }
    throw fail();
  }
  throw new Error('Embed PNG or JPEG textures only.');
}

/**
 * Check a binary GLB against the budget and return what it contains.
 * Rejects network references, required extensions and anything over budget
 * before a model is stored or loaded into the room.
 *
 * `strict` (the default) is for new imports. Pass `strict: false` when restoring
 * a saved room backup: models the user already kept must keep restoring even if
 * they predate the part-count and texture limits, so only the original safety
 * and size rules apply.
 */
export function inspectGlb(buffer: ArrayBuffer, {strict = true}: {strict?: boolean} = {}): GlbReport {
  const data = new DataView(buffer);
  if (buffer.byteLength < 28 || buffer.byteLength > GLB_BUDGET.maxBytes || data.getUint32(0, true) !== 0x46546c67 || data.getUint32(4, true) !== 2 || data.getUint32(8, true) !== buffer.byteLength) throw new Error('Choose a self-contained GLB under 5 MB.');
  const size = data.getUint32(12, true);
  if (data.getUint32(16, true) !== 0x4e4f534a || size > buffer.byteLength - 20) throw new Error('Invalid GLB header.');
  let json: GltfJson;
  try { json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, size))) as GltfJson; } catch { throw new Error('Invalid GLB header.'); }
  if (!json.asset || json.asset.version !== '2.0' || !json.meshes?.length) throw new Error('This file contains no card mesh.');
  if ((json.buffers ?? []).some((b) => b.uri) || (json.images ?? []).some((i) => i.uri) || (json.extensionsRequired ?? []).length) throw new Error('Export an uncompressed GLB with embedded textures and no required extensions.');

  const nodes = json.nodes ?? [];
  if (nodes.length > GLB_BUDGET.maxNodes) throw new Error('Simplify the scan to 200 nodes or fewer.');
  const visited = new Set<number>(), visiting = new Set<number>();
  const visit = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= nodes.length || visiting.has(index)) throw new Error('Invalid or circular scene hierarchy.');
    if (visited.has(index)) return;
    visiting.add(index); for (const child of nodes[index].children ?? []) visit(child); visiting.delete(index); visited.add(index);
  };
  nodes.forEach((_, index) => visit(index));

  let triangles = 0, primitives = 0;
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    primitives++;
    const accessor = primitive.indices ?? primitive.attributes?.POSITION;
    const count = accessor === undefined ? undefined : json.accessors?.[accessor]?.count;
    if (count === undefined || !Number.isFinite(count) || count <= 0 || (primitive.mode !== undefined && primitive.mode !== 4)) throw new Error('Use a triangle mesh for the card.');
    triangles += count / 3;
  }
  if (primitives === 0) throw new Error('This file contains no card mesh.');
  const materials = json.materials?.length ?? 0;
  const imageList = json.images ?? [];
  if (triangles > GLB_BUDGET.maxTriangles || imageList.length > GLB_BUDGET.maxImages) throw new Error('Simplify this card to 50,000 triangles, 200 nodes and four textures or fewer.');
  if (strict && (primitives > GLB_BUDGET.maxPrimitives || materials > GLB_BUDGET.maxMaterials)) throw new Error('Merge the scan into 16 mesh parts and 8 materials or fewer.');

  const images: GlbReport['images'] = [];
  if (strict && imageList.length) {
    const binaryHeader = 20 + size;
    if (binaryHeader + 8 > buffer.byteLength || data.getUint32(binaryHeader + 4, true) !== BIN_CHUNK) throw new Error('Embedded textures need a binary chunk.');
    const binaryStart = binaryHeader + 8;
    const binaryLength = Math.min(data.getUint32(binaryHeader, true), buffer.byteLength - binaryStart);
    for (const image of imageList) {
      const view = image.bufferView === undefined ? undefined : json.bufferViews?.[image.bufferView];
      const offset = view?.byteOffset ?? 0, length = view?.byteLength;
      if (!view || !image.mimeType || length === undefined || !Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length <= 0 || offset + length > binaryLength) throw new Error('An embedded texture could not be read. Use PNG or JPEG textures.');
      const {width, height} = imageSize(new Uint8Array(buffer, binaryStart + offset, length), image.mimeType);
      if (!(width > 0 && height > 0) || width > GLB_BUDGET.maxImageSide || height > GLB_BUDGET.maxImageSide) throw new Error('Textures can be at most 2048 pixels on a side. Reduce the texture size.');
      images.push({mimeType: image.mimeType, width, height});
    }
  }
  const texturePixels = images.reduce((sum, image) => sum + image.width * image.height, 0);
  if (texturePixels > GLB_BUDGET.maxTexturePixels) throw new Error('Textures use too much memory. Keep the total under about four million pixels, such as one 2048 by 2048 image.');
  return {triangles, nodes: nodes.length, primitives, materials, images, texturePixels, json};
}

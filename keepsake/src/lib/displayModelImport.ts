import * as THREE from 'three';
import {validateCardGlb} from './cardBinders';

export const DISPLAY_MODEL_ACCEPT = '.glb,.usdz,.obj,.ply,.stl';
export const DISPLAY_MODEL_FORMATS = 'GLB, USDZ, OBJ, PLY, or STL';
/** The room copy of a display-case object (owner decision, option C: about 10-15,000 triangles). */
export const DISPLAY_ROOM_TRIANGLES = 15_000;
/** Longest side of any texture in the room copy. */
export const DISPLAY_ROOM_TEXTURE = 1024;

function extension(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
}

function geometryObject(geometry: THREE.BufferGeometry) {
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const hasVertexColors = Boolean(geometry.getAttribute('color'));
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: hasVertexColors ? '#ffffff' : '#c9b995',
      vertexColors: hasVertexColors,
      roughness: 0.72,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );
}

function normalizeForCase(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) throw new Error('This file contains no visible model geometry.');
  const size = bounds.getSize(new THREE.Vector3()),
    largest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(largest) || largest <= 0) throw new Error('This model has invalid dimensions.');
  const center = bounds.getCenter(new THREE.Vector3()),
    scale = 1.6 / largest;
  root.scale.multiplyScalar(scale);
  root.position.addScaledVector(center, -scale);
  root.updateMatrixWorld(true);
  return root;
}

function triangleCount(root: THREE.Object3D) {
  let triangles = 0;
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const g = o.geometry as THREE.BufferGeometry;
    triangles += (g.index?.count ?? g.getAttribute('position')?.count ?? 0) / 3;
  });
  return triangles;
}

/** A small GLB that already fits the room copy is kept byte for byte. */
function fitsRoom(buffer: ArrayBuffer) {
  try {
    const json = validateCardGlb(buffer);
    let triangles = 0;
    for (const m of json.meshes)
      for (const p of m.primitives) triangles += json.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    return triangles <= DISPLAY_ROOM_TRIANGLES;
  } catch {
    return false;
  }
}

/**
 * Phone scans are often several hundred thousand triangles with a 4K or 8K texture. Reduce every mesh in proportion
 * so the whole object lands near DISPLAY_ROOM_TRIANGLES. meshoptimizer keeps UV seams closed while it collapses
 * edges; if a mesh still cannot get small enough, the sloppy pass (which ignores seams) finishes the job.
 */
async function reduceForRoom(root: THREE.Object3D) {
  const total = triangleCount(root);
  if (total <= DISPLAY_ROOM_TRIANGLES) return;
  const {MeshoptSimplifier} = await import('three/addons/libs/meshopt_simplifier.module.js');
  const {mergeVertices} = await import('three/addons/utils/BufferGeometryUtils.js');
  await MeshoptSimplifier.ready;
  const share = DISPLAY_ROOM_TRIANGLES / total;
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    let geometry = o.geometry as THREE.BufferGeometry;
    // Split normals (STL, faceted OBJ) stop vertices from merging; they are recomputed afterwards.
    geometry.deleteAttribute('normal');
    if (!geometry.index) geometry = mergeVertices(geometry);
    const position = geometry.getAttribute('position');
    const positions = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++)
      positions.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3);
    const indices = new Uint32Array(geometry.index!.array);
    const target = Math.max(3, Math.floor((indices.length * share) / 3) * 3);
    let [reduced] = MeshoptSimplifier.simplify(indices, positions, 3, target, 1);
    if (reduced.length > target * 1.25)
      [reduced] = MeshoptSimplifier.simplifySloppy(indices, positions, 3, null, target, 1);
    const [remap, unique] = MeshoptSimplifier.compactMesh(reduced);
    const next = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      const size = attribute.itemSize,
        values = new Float32Array(unique * size);
      for (let i = 0; i < attribute.count; i++) {
        const to = remap[i];
        if (to === 0xffffffff) continue;
        for (let c = 0; c < size; c++) values[to * size + c] = attribute.getComponent(i, c);
      }
      next.setAttribute(name, new THREE.BufferAttribute(values, size, false));
    }
    next.setIndex(new THREE.BufferAttribute(reduced, 1));
    next.computeVertexNormals();
    if (geometry !== o.geometry) geometry.dispose();
    (o.geometry as THREE.BufferGeometry).dispose();
    o.geometry = next;
  });
}

/**
 * Convert common scanner/interchange formats into Keepsake's internal GLB format. Large scans from phone apps
 * (Scaniverse, Polycam, Reality Composer and others) are reduced on this device to a room copy of about
 * DISPLAY_ROOM_TRIANGLES triangles with textures no larger than DISPLAY_ROOM_TEXTURE.
 */
export async function importDisplayModel(file: File): Promise<ArrayBuffer> {
  const ext = extension(file.name);
  if (!['glb', 'usdz', 'obj', 'ply', 'stl'].includes(ext))
    throw new Error(`Choose a ${DISPLAY_MODEL_FORMATS} file.`);
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a source model smaller than 25 MB.');

  let root: THREE.Object3D;
  if (ext === 'glb') {
    const buffer = await file.arrayBuffer();
    if (fitsRoom(buffer)) return buffer;
    const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
    const {MeshoptDecoder} = await import('three/addons/libs/meshopt_decoder.module.js');
    try {
      root = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '')).scene;
    } catch (e) {
      if (e instanceof Error && /draco|ktx2|basis/i.test(e.message))
        throw new Error('This GLB is compressed. Export it again without Draco or KTX2 compression.');
      throw new Error('Could not read this GLB. Export it again as a self-contained GLB.');
    }
  } else if (ext === 'obj') {
    const {OBJLoader} = await import('three/addons/loaders/OBJLoader.js');
    root = new OBJLoader().parse(await file.text());
  } else if (ext === 'ply') {
    const {PLYLoader} = await import('three/addons/loaders/PLYLoader.js');
    const geometry = new PLYLoader().parse(await file.arrayBuffer());
    // PLY files with no faces are point clouds; drawing their points as triangles makes noise.
    if (!geometry.index)
      throw new Error('This PLY is a point cloud. Export the scan as a mesh (GLB, OBJ or PLY with faces).');
    root = geometryObject(geometry);
  } else if (ext === 'stl') {
    const {STLLoader} = await import('three/addons/loaders/STLLoader.js');
    root = geometryObject(new STLLoader().parse(await file.arrayBuffer()));
  } else {
    const {USDLoader} = await import('three/addons/loaders/USDLoader.js');
    const url = URL.createObjectURL(file);
    try {
      root = await new USDLoader().loadAsync(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  normalizeForCase(root);
  await reduceForRoom(root);
  // Keep photo textures as JPEG; PNG re-encoding would make the room copy several times larger.
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m.map && !m.transparent && m.map.userData.mimeType !== 'image/png')
        m.map.userData.mimeType = 'image/jpeg';
  });
  const {GLTFExporter} = await import('three/addons/exporters/GLTFExporter.js');
  const result = await new GLTFExporter().parseAsync(root, {
    binary: true,
    onlyVisible: true,
    truncateDrawRange: true,
    maxTextureSize: DISPLAY_ROOM_TEXTURE,
  });
  if (!(result instanceof ArrayBuffer)) throw new Error('Could not convert this model to GLB.');
  return result;
}

export async function modelDataUrl(buffer: ArrayBuffer) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not store the converted model.'));
    reader.readAsDataURL(new Blob([buffer], {type: 'model/gltf-binary'}));
  });
}

import * as THREE from 'three';

export const DISPLAY_MODEL_ACCEPT = '.glb,.usdz,.obj,.ply,.stl';
export const DISPLAY_MODEL_FORMATS = 'GLB, USDZ, OBJ, PLY, or STL';

function extension(name:string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
}

function geometryObject(geometry:THREE.BufferGeometry) {
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const hasVertexColors=Boolean(geometry.getAttribute('color'));
  return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
    color:hasVertexColors?'#ffffff':'#c9b995',vertexColors:hasVertexColors,
    roughness:.72,metalness:.04,side:THREE.DoubleSide,
  }));
}

function normalizeForCase(root:THREE.Object3D) {
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) throw new Error('This file contains no visible model geometry.');
  const size=bounds.getSize(new THREE.Vector3()),largest=Math.max(size.x,size.y,size.z);
  if (!Number.isFinite(largest)||largest<=0) throw new Error('This model has invalid dimensions.');
  const center=bounds.getCenter(new THREE.Vector3()),scale=1.6/largest;
  root.scale.multiplyScalar(scale);
  root.position.addScaledVector(center,-scale);
  root.updateMatrixWorld(true);
  return root;
}

/** Convert common scanner/interchange formats into Keepsake's internal GLB format. */
export async function importDisplayModel(file:File):Promise<ArrayBuffer> {
  const ext=extension(file.name);
  if (!['glb','usdz','obj','ply','stl'].includes(ext)) throw new Error(`Choose a ${DISPLAY_MODEL_FORMATS} file.`);
  if (file.size>25*1024*1024) throw new Error('Choose a source model smaller than 25 MB.');
  if (ext==='glb') return file.arrayBuffer();

  let root:THREE.Object3D;
  if (ext==='obj') {
    const {OBJLoader}=await import('three/addons/loaders/OBJLoader.js');
    root=new OBJLoader().parse(await file.text());
  } else if (ext==='ply') {
    const {PLYLoader}=await import('three/addons/loaders/PLYLoader.js');
    root=geometryObject(new PLYLoader().parse(await file.arrayBuffer()));
  } else if (ext==='stl') {
    const {STLLoader}=await import('three/addons/loaders/STLLoader.js');
    root=geometryObject(new STLLoader().parse(await file.arrayBuffer()));
  } else {
    const {USDLoader}=await import('three/addons/loaders/USDLoader.js');
    const url=URL.createObjectURL(file);
    try { root=await new USDLoader().loadAsync(url); }
    finally { URL.revokeObjectURL(url); }
  }

  normalizeForCase(root);
  const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  const result=await new GLTFExporter().parseAsync(root,{
    binary:true,onlyVisible:true,truncateDrawRange:true,maxTextureSize:2048,
  });
  if (!(result instanceof ArrayBuffer)) throw new Error('Could not convert this model to GLB.');
  return result;
}

export async function modelDataUrl(buffer:ArrayBuffer) {
  return new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new Error('Could not store the converted model.'));
    reader.readAsDataURL(new Blob([buffer],{type:'model/gltf-binary'}));
  });
}

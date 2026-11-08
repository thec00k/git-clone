import * as THREE from 'three';
import {USDZExporter} from 'three/addons/exporters/USDZExporter.js';

export async function usdZTriangleFile() {
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  geometry.computeVertexNormals();
  scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: '#c9b995'})));
  const data = await new USDZExporter().parseAsync(scene);
  return new File([data as BlobPart], 'triangle.usdz', {type: 'model/vnd.usdz+zip'});
}

/** A phone-scan-sized GLB: about 320,000 triangles with a 4096 px photo texture, well over the 5 MB room budget. */
export async function largeScanFile() {
  const {GLTFExporter} = await import('three/addons/exporters/GLTFExporter.js');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 4096;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `hsl(${(i * 37) % 360} 60% ${30 + (i % 50)}%)`;
    ctx.fillRect((i * 97) % 4096, (i * 53) % 4096, 120, 120);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.userData.mimeType = 'image/jpeg';
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 400, 400), new THREE.MeshStandardMaterial({map})));
  const data = (await new GLTFExporter().parseAsync(scene, {binary: true})) as ArrayBuffer;
  return new File([data], 'phone-scan.glb', {type: 'model/gltf-binary'});
}

/** A PLY with vertices and no faces, as some scanner apps export. */
export function pointCloudPly() {
  return new File(
    [
      'ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nend_header\n0 0 0\n1 0 0\n0 1 0\n',
    ],
    'points.ply',
    {type: 'application/octet-stream'},
  );
}

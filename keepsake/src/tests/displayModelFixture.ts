import * as THREE from 'three';
import {USDZExporter} from 'three/addons/exporters/USDZExporter.js';

export async function usdZTriangleFile() {
  const scene=new THREE.Scene();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
  geometry.computeVertexNormals();
  scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#c9b995'})));
  const data=await new USDZExporter().parseAsync(scene);
  return new File([data as BlobPart],'triangle.usdz',{type:'model/vnd.usdz+zip'});
}

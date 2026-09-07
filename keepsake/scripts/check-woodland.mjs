import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Matrix4, Vector3, Box3, Quaternion } from 'three';
import { woodlandRoom } from '../src/components/room3d/themes.ts';
const budget = woodlandRoom.budget;
const theme = process.argv.includes('--beachfront') ? 'beachfront' : 'woodland';
const file = new URL('../public/room/'+theme+'/'+theme+'.glb', import.meta.url);
const bytes = fs.readFileSync(file);
assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
assert.equal(bytes.readUInt32LE(4), 2, 'GLTF version 2');
assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB length');
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const required = ['Desk', 'Desk_Drawer', 'ks_book', 'ks_window', 'ks_lamp', 'ks_chair', 'ks_archive', 'ks_archive_drawer', 'ks_shelf', 'ks_crt', 'ks_map', 'ks_guestbook', 'ks_door', 'ks_clock', 'ks_clock_digits', 'ks_ceiling_fan_blades'];
for (const name of required) assert.equal(json.nodes.filter(node => node.name === name).length, 1, `One ${name} anchor required`);
const parents = new Map();
json.nodes.forEach((node, i) => node.children?.forEach(child => parents.set(child, i)));
function world(index) {
  const node = json.nodes[index];
  const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
    new Vector3(...(node.translation ?? [0,0,0])),
    new Quaternion(...(node.rotation ?? [0,0,0,1])),
    new Vector3(...(node.scale ?? [1,1,1])),
  );
  return parents.has(index) ? world(parents.get(index)).multiply(local) : local;
}
export function bounds(name) {
  const index = json.nodes.findIndex(node => node.name === name);
  assert.ok(index >= 0, `${name} exists`);
  const box = new Box3();
  function visit(i) {
    const node = json.nodes[i];
    for (const primitive of json.meshes?.[node.mesh]?.primitives ?? []) {
      const accessor = json.accessors[primitive.attributes.POSITION];
      box.union(new Box3(new Vector3(...accessor.min), new Vector3(...accessor.max)).applyMatrix4(world(i)));
    }
    node.children?.forEach(visit);
  }
  visit(index); return box;
}
assert.ok(json.nodes.some(node => node.name === 'Beanbag'), 'Remodeled beanbag exported');
assert.ok(json.nodes.some(node => node.name === 'Beanbag_StitchedSeams'), 'Beanbag stitched seams exported');
assert.ok(!json.nodes.some(node => node.name === 'Beanbag_Original_Backup'), 'Old beanbag excluded');
const desk = bounds('Desk_Top');
const book = bounds('ks_book');
const map = bounds('ks_map');
const shelf = bounds('ks_shelf');
const cactus = bounds('Accent_Pot');
const sill = bounds('Win_Sill');
assert.ok(cactus.min.x >= sill.min.x && cactus.max.x <= sill.max.x && cactus.min.z >= sill.min.z && cactus.max.z <= sill.max.z, 'Cactus pot fully fits the sill');
assert.ok(Math.abs(cactus.min.y - sill.max.y) < .006, 'Cactus sits on the sill');
assert.ok(!json.nodes.some(node => node.name === 'Rug_Oval' || /Cozy_.*Vine|Cozy_Woodland_Vine_Leaf/.test(node.name)), 'Duplicate rug and vines removed');
assert.ok(json.nodes.some(node => node.name === 'Cozy_Chair_Cushion'), 'Chair cushion exported');
const readingSeat = bounds('Beanbag');
assert.ok(readingSeat.min.z > .5, 'Beanbag is out of the desk area, by the door');
assert.ok(map.min.y > 1.10, 'Corkboard clears the dado rail');
assert.ok(shelf.max.x < 2.40, 'Bookshelf stands in front of the wall trim');
const switchIndex = json.nodes.findIndex(node => node.name === 'ks_ceiling_switch');
assert.ok(switchIndex >= 0 && new Vector3().setFromMatrixPosition(world(switchIndex)).x < -1.45, 'Light switch clears the curtains');
assert.ok(desk.max.y > .65 && desk.max.y < .85, 'Desktop exported Y-up at correct height');
assert.ok(Math.abs(book.min.y - desk.max.y) < .04, 'Book rests on the desk');
assert.ok(book.min.x >= desk.min.x && book.max.x <= desk.max.x, 'Book fits desk horizontally');
assert.ok(book.min.z >= desk.min.z && book.max.z <= desk.max.z, 'Book fits desk in depth');
const triangles = json.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((s,p) => s + (json.accessors[p.indices ?? p.attributes.POSITION].count / 3), 0), 0);
const primitives = json.meshes.reduce((sum, mesh) => sum + mesh.primitives.length, 0);
assert.ok(bytes.length <= budget.maxBytes, 'Room under 8 MiB');
assert.ok(triangles <= budget.maxTriangles, 'Room under 180k triangles');
assert.ok(json.materials.length <= budget.maxMaterials, 'Room under 80 materials');
assert.ok(primitives <= budget.maxPrimitives, 'Room under 350 primitives');
assert.ok(!json.nodes.some(node => node.name === 'Outside_View' || node.name === 'Win_Glass'), 'Window clear for live scenery');
assert.ok(json.images.every(image => image.bufferView !== undefined), 'All textures embedded for offline loading');
console.log(JSON.stringify({ bytes: bytes.length, triangles, materials: json.materials.length, primitives, anchors: required.length, deskTopY: desk.max.y, bookBottomY: book.min.y }, null, 2));




const bowl=bounds('Fan_Bowl');
for(const name of ['Fan_Chain_0','Fan_Chain_1','Fan_ChainWeight']){const chain=bounds(name);assert.ok(chain.max.x<bowl.min.x || chain.min.x>bowl.max.x,'Pull chain clears the light bowl: '+name);}
console.log('Ceiling pull chains and weight clear the light bowl.');
export {json};

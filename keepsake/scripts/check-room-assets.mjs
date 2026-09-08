import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {roomAssets} from '../src/generated/roomAssets.ts';
import {roomDeviceTier,roomRenderProfile} from '../src/components/room3d/themes.ts';
for (const room of ['woodland','beachfront']) {
  const directory = new URL(`../public/room/${room}/`,import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('asset-manifest.json',directory),'utf8'));
  for (const quality of ['balanced','high']) {
    const asset = manifest.qualities[quality];
    const bytes = fs.readFileSync(new URL(asset.file,directory));
    assert.equal(asset.bytes,bytes.length);
    assert.equal(asset.sha256,createHash('sha256').update(bytes).digest('hex'),'Run assets:refresh after changing a model');
    assert.equal(roomAssets[room][quality],`/room/${room}/${asset.file}?v=${asset.sha256.slice(0,12)}`,'Runtime must request this model revision');
    assert.ok(bytes.length <= (quality==='high'?12:8)*1048576);
    const gltf = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
    assert.ok(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'));
    assert.ok(gltf.materials.filter(m=>m.normalTexture).length>=30,'Room retains the exported material detail');
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      const normal = gltf.materials[primitive.material]?.normalTexture;
      if (normal) assert.notEqual(primitive.attributes[`TEXCOORD_${normal.texCoord??0}`],undefined,'Normal map must have its UV channel');
    }
  }
  assert.ok(manifest.qualities.balanced.estimatedTextureBytes < manifest.qualities.high.estimatedTextureBytes);
}
assert.equal(roomDeviceTier(390),'phone');
assert.equal(roomDeviceTier(820),'tablet');
assert.equal(roomDeviceTier(1440),'desktop');
assert.equal(roomDeviceTier(640),'tablet');
assert.equal(roomDeviceTier(1100),'desktop');
for (const tier of ['phone','tablet','desktop']) {
  const balanced=roomRenderProfile('balanced',tier),high=roomRenderProfile('high',tier);
  assert.ok(high.dpr>balanced.dpr && high.particles>balanced.particles);
  assert.equal(high.shadows,true);assert.equal(balanced.shadows,false);
}
const wasm=fs.readFileSync(new URL('../public/decoders/draco/draco_decoder.wasm',import.meta.url));
assert.equal(wasm.readUInt32LE(0),0x6d736100);
assert.ok(fs.readFileSync(new URL('../public/decoders/draco/LICENSE',import.meta.url),'utf8').includes('Apache License'));
console.log('Room assets: both graphics levels, content hashes, detail UVs, local decoder and responsive render budgets passed.');

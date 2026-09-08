import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const roomIndex = argv.indexOf('--room');
const rooms = roomIndex >= 0 ? [argv[roomIndex + 1]] : ['woodland', 'beachfront'];
if (rooms.some(room => !['woodland', 'beachfront'].includes(room))) throw Error('Choose --room woodland or beachfront.');
const polish = argv.includes('--polish');
const checkOnly = argv.includes('--check-only');

function blenderBinary() {
  if (process.env.BLENDER_BIN) return process.env.BLENDER_BIN;
  if (process.platform === 'win32') {
    const base = path.join(process.env.ProgramFiles || 'C:/Program Files', 'Blender Foundation');
    if (fs.existsSync(base)) {
      const versions = fs.readdirSync(base).map(name => ({name, version: Number(name.match(/Blender (\d+\.\d+)/)?.[1] || 0)}))
        .filter(entry => entry.version >= 5.1).sort((a,b) => b.version - a.version);
      for (const entry of versions) {
        const exe = path.join(base, entry.name, 'blender.exe');
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  if (process.platform === 'darwin' && fs.existsSync('/Applications/Blender.app/Contents/MacOS/Blender')) return '/Applications/Blender.app/Contents/MacOS/Blender';
  return 'blender';
}
const blender = blenderBinary();
const versionResult = spawnSync(blender, ['--version'], {encoding:'utf8'});
if (versionResult.error || versionResult.status !== 0) throw Error('Blender could not start. Set BLENDER_BIN to your Blender 5.1 executable.');
const version = versionResult.stdout.match(/Blender (\d+)\.(\d+)\.(\d+)/);
if (!version || Number(version[1]) < 5 || (Number(version[1]) === 5 && Number(version[2]) < 1)) throw Error('Keepsake requires Blender 5.1 or newer.');
console.log(`Using ${version[0]}: ${blender}`);
if (argv.includes('--doctor')) process.exit(0);

const stagingRoot = path.join(root, 'art/.staging'); fs.mkdirSync(stagingRoot, {recursive:true});
const stage = fs.mkdtempSync(path.join(stagingRoot, 'refresh-'));
const reports = {};
const sourceHashes = {};
for (const room of rooms) {
  const file = path.join(root,'art',room,`${room}.blend`);
  const bytes = fs.readFileSync(file);
  sourceHashes[room] = createHash('sha256').update(bytes).digest('hex');
  fs.mkdirSync(path.join(stage,'originals'),{recursive:true});
  fs.writeFileSync(path.join(stage,'originals',`${room}.blend`),bytes);
}
function imageSize(bytes, mime) {
  if (mime === 'image/png') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (mime === 'image/jpeg') {
    for (let at = 2; at + 8 < bytes.length;) {
      if (bytes[at++] !== 0xff) continue;
      const marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      const length = bytes.readUInt16BE(at);
      if ([0xc0,0xc1,0xc2].includes(marker)) return [bytes.readUInt16BE(at+5), bytes.readUInt16BE(at+3)];
      if (length < 2) break;
      at += length;
    }
  }
  throw Error(`Could not inspect embedded ${mime} texture.`);
}
function inspect(file, quality, source) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20,20+jsonLength));
  const binary = bytes.subarray(28+jsonLength);
  let pixels = 0;
  const limit = quality === 'high' ? 1024 : 512;
  for (const image of gltf.images || []) {
    assert.equal(image.uri, undefined, 'Web models must embed all images');
    const view = gltf.bufferViews[image.bufferView];
    const dimensions = imageSize(binary.subarray(view.byteOffset || 0,(view.byteOffset || 0)+view.byteLength), image.mimeType);
    assert.ok(Math.max(...dimensions) <= limit, `${quality} texture exceeds ${limit}px`);
    pixels += dimensions[0] * dimensions[1];
  }
  for (const [name,tint] of Object.entries(source.materialTints)) {
    const material = gltf.materials.find(material => material.name === name);
    if (!material) continue; // Hidden source-only materials are intentionally excluded.
    const exported = material.pbrMetallicRoughness.baseColorFactor || [1,1,1,1];
    assert.ok(tint.every((value,i) => Math.abs(value-exported[i]) < .0001), `${name}: exported tint differs from Blender`);
  }
  const triangles = gltf.meshes.reduce((total,mesh) => total + mesh.primitives.reduce((n,p) => n + gltf.accessors[p.indices ?? p.attributes.POSITION].count/3,0),0);
  return {file:path.basename(file), bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex'),
    triangles, materials:gltf.materials.length, primitives:gltf.meshes.reduce((n,m)=>n+m.primitives.length,0),
    images:gltf.images.length, maxTextureSize:limit, estimatedTextureBytes:Math.ceil(pixels*4*4/3),
    normalMappedMaterials:gltf.materials.filter(m=>m.normalTexture).length};
}
for (const room of rooms) {
  console.log(`Preparing ${room}${polish ? ' with the original material-detail pass' : ''}…`);
  const output = path.join(stage, room); fs.mkdirSync(output);
  const log = fs.openSync(path.join(output,'blender.log'), 'w');
  const args = ['--background','--factory-startup','--python',path.join(root,'art/pipeline/refresh-room.py'),'--','--room',room,'--output',output];
  if (polish) args.push('--polish');
  const result = spawnSync(blender,args,{cwd:root,env:{...process.env,XDG_CACHE_HOME:path.join(stage,'cache')},stdio:['ignore',log,log],windowsHide:true});
  fs.closeSync(log);
  if (result.error || result.status !== 0) throw Error(`Blender failed; original assets are untouched. See ${output}/blender.log`);
  const source = JSON.parse(fs.readFileSync(path.join(output,'source-report.json'),'utf8'));
  reports[room] = {pipelineVersion:1, blender:version[0], source:source.source, qualities:{}};
  for (const quality of ['balanced','high']) {
    const file = path.join(output, `${room}${quality === 'high' ? '.high' : ''}.glb`);
    const checkArgs = [path.join(root,'scripts/check-woodland.mjs'),'--file',file];
    if (room === 'beachfront') checkArgs.push('--beachfront');
    if (quality === 'high') checkArgs.push('--high');
    const check = spawnSync(process.execPath,checkArgs,{cwd:root,encoding:'utf8'});
    if (check.status !== 0) throw Error(`Asset checks failed; original assets are untouched.\n${check.stdout}\n${check.stderr}`);
    reports[room].qualities[quality] = inspect(file,quality,source);
    console.log(`  ${quality}: ${(reports[room].qualities[quality].bytes/1048576).toFixed(2)} MiB; geometry, anchors, contacts and textures passed.`);
  }
}
fs.writeFileSync(path.join(stage,'report.json'), JSON.stringify(reports,null,2)+'\n');
if (checkOnly) {console.log(`Checked without publishing: ${stage}`); process.exit(0);}

// Stage and validate every requested room before replacing any working file.
for (const room of rooms) {
  const current = createHash('sha256').update(fs.readFileSync(path.join(root,'art',room,`${room}.blend`))).digest('hex');
  assert.equal(current,sourceHashes[room],`${room} was saved in Blender during export. Nothing was published; run the refresh again to include that save.`);
}
function replaceFile(from,to) {
  fs.mkdirSync(path.dirname(to),{recursive:true});
  fs.copyFileSync(from,`${to}.next`); fs.renameSync(`${to}.next`,to);
}
for (const room of rooms) {
  for (const name of [`${room}.glb`,`${room}.high.glb`]) replaceFile(path.join(stage,room,name),path.join(root,'public/room',room,name));
  replaceFile(path.join(stage,room,`${room}.blend`),path.join(root,'art',room,`${room}.blend`));
  fs.writeFileSync(path.join(root,'public/room',room,'asset-manifest.json'), JSON.stringify(reports[room],null,2)+'\n');
}
const runtime = {};
for (const room of ['woodland','beachfront']) {
  const manifest = path.join(root,'public/room',room,'asset-manifest.json');
  if (!fs.existsSync(manifest)) continue;
  const data = JSON.parse(fs.readFileSync(manifest,'utf8'));
  runtime[room] = Object.fromEntries(Object.entries(data.qualities).map(([quality,asset]) => [quality,`/room/${room}/${asset.file}?v=${asset.sha256.slice(0,12)}`]));
}
fs.mkdirSync(path.join(root,'src/generated'),{recursive:true});
fs.writeFileSync(path.join(root,'src/generated/roomAssets.ts'), `// Generated by npm run assets:refresh. Stable filenames, content-versioned URLs.\nexport const roomAssets = ${JSON.stringify(runtime,null,2)} as const;\n`);
console.log(`Published validated assets and portable Blender sources. Audit: ${stage}`);

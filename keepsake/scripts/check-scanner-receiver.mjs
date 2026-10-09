import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PNG_1X1, buildGlb, pngWithSize} from './glb-fixtures.mjs';

const port = 43000 + Math.floor(Math.random() * 2000);
const output = await mkdtemp(join(tmpdir(), 'keepsake-receiver-'));
const server = spawn(process.execPath, [new URL('./scanner-receiver.mjs', import.meta.url).pathname], {
  env: {...process.env, KEEPSAKE_SCANNER_PORT: String(port), KEEPSAKE_SCANNER_OUTPUT: output}, stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (chunk) => { log += chunk; });
server.stderr.on('data', (chunk) => { log += chunk; });

async function until(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt++) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out waiting for ${label}.\n${log}`);
}

try {
  await until(() => /Pairing code: [0-9A-F]{8}/.test(log), 'the receiver to start');
  const code = /Pairing code: ([0-9A-F]{8})/.exec(log)[1];
  const base = `http://127.0.0.1:${port}`;
  const upload = (body, headers = {}) => fetch(`${base}/upload`, {
    method: 'POST', body,
    headers: {'Content-Type': 'model/gltf-binary', 'X-Keepsake-Pair-Code': code, 'X-Keepsake-Scan-Name': 'test scan', ...headers},
  });
  const reject = async (response, status, pattern, label) => {
    assert.equal(response.status, status, `${label}: expected ${status}`);
    assert.match((await response.json()).error, pattern, label);
  };
  const files = async () => (await readdir(output).catch(() => [])).length;

  assert.equal((await (await fetch(`${base}/health`)).json()).maxBytes, 5 * 1024 * 1024);
  assert.equal((await fetch(`${base}/latest`)).status, 404, 'nothing has arrived yet');

  // Authentication and shape.
  await reject(await upload(buildGlb(), {'X-Keepsake-Pair-Code': 'WRONG123'}), 401, /pairing code/, 'wrong code');
  await reject(await upload(buildGlb(), {'Content-Type': 'text/plain'}), 415, /GLB/, 'wrong content type');
  await reject(await upload(Buffer.alloc(64, 7)), 422, /valid GLB/, 'not a GLB');

  // The same budget Keepsake applies on import.
  await reject(await upload(buildGlb({images: [{mimeType: 'image/png', bytes: pngWithSize(4096, 4096)}]})), 422, /2048 pixels/, 'oversized texture');
  await reject(await upload(buildGlb({primitives: 17})), 422, /16 mesh parts/, 'too many parts');
  await reject(await upload(buildGlb({edit: (json) => ({...json, accessors: [{count: 150003}]})})), 422, /50,000 triangles/, 'too many triangles');
  await reject(await upload(buildGlb({edit: (json) => ({...json, buffers: [{uri: 'https://example.com/a.bin'}]})})), 422, /embedded textures/, 'remote reference');
  assert.equal(await files(), 0, 'rejected scans are never written to disk');

  // A good scan, with and without a texture, tagged for a room.
  const good = await upload(buildGlb({images: [{mimeType: 'image/png', bytes: PNG_1X1}], materials: 1}), {'X-Keepsake-Room-Theme': 'beachfront'});
  assert.equal(good.status, 201);
  assert.equal(await files(), 1);
  const inbox = (await (await fetch(`${base}/inbox`)).json()).latest;
  assert.equal(inbox.roomTheme, 'beachfront');
  const latest = await fetch(`${base}/latest`);
  assert.equal(latest.status, 200);
  assert.equal(latest.headers.get('content-type'), 'model/gltf-binary');
  assert.equal(Buffer.from(await latest.arrayBuffer()).readUInt32LE(0), 0x46546c67);

  // Room tags: the retired Snowy Mountain room becomes Woodland; unknown names fall back to Woodland.
  for (const [sent, expected] of [['snowy', 'woodland'], ['snowy-mountain', 'woodland'], ['SKY-CASTLE', 'woodland'], ['', 'woodland'], ['cyberpunk', 'cyberpunk']]) {
    assert.equal((await upload(buildGlb(), {'X-Keepsake-Room-Theme': sent})).status, 201);
    assert.equal((await (await fetch(`${base}/inbox`)).json()).latest.roomTheme, expected, `room tag "${sent}"`);
  }
  assert.equal(await files(), 6);
  console.log('PASS scanner receiver: pairing, content type, budget rejection before write, room tags and latest-scan round trip.');
} finally {
  server.kill();
  await rm(output, {recursive: true, force: true});
}

import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash, randomBytes} from 'node:crypto';
import {request as httpRequest} from 'node:http';
import {mkdtemp, readdir, rm, stat} from 'node:fs/promises';
import {networkInterfaces, tmpdir} from 'node:os';
import {join} from 'node:path';
import {CONTENT_TYPE, KDF, deriveKey, normalizeCode, open, receipt, seal} from './scan-envelope.mjs';
import {PNG_1X1, buildGlb, pngWithSize, scannerGlb} from './glb-fixtures.mjs';

// ---------------------------------------------------------------------------
// Test vectors. KeepsakeScanner/ScanTransfer.swift checks the same values in
// `ScanTransfer.selfTest()` (DEBUG builds), so the phone and the receiver cannot
// drift apart silently. If you change the protocol, update both together.
// ---------------------------------------------------------------------------
const VECTOR = {
  typed: 'k7qf-m2xd-9pl0',
  normalized: 'K7QFM2XD9P10',
  salt: Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex'),
  master: '04f0ce7ddc7a65a657999f387db525e7e482d2fbfdd7743761b44e708eafb506',
  encryptKey: 'ddcff700f153d0facfc594b1c9382a3fe8bf7a7f4ca2a9c626fc32cceaae9524',
  receiptKey: 'dcfce0f14f0cc5fce4f132fe3f2c3b3cbeaaed4200f438ad146a850143fcce9e',
  session: '0123456789abcdef0123456789abcdef',
  // Keys in sorted order: the Swift side encodes with JSONEncoder .sortedKeys.
  header: {id: '00112233445566778899aabbccddeeff', name: 'mug', roomTheme: 'woodland', v: 1},
  glb: Buffer.from('keepsake test vector', 'utf8'),
  nonce: Buffer.from('000102030405060708090a0b', 'hex'),
  envelopeSha256: '16225e750e535f85c2460f93a34295c3d0ddf432baa27d4adf3e3b18c35dc5c9',
  receipt: 'oI6PVnrQ4kxQ31b6UjbOXPxrVKa+UUdt3H/6bqJu4BM=',
};
assert.equal(normalizeCode(VECTOR.typed), VECTOR.normalized);
assert.equal(normalizeCode('K7QF M2XD 9PIO'), VECTOR.normalized, 'I -> 1, O -> 0, spaces ignored');
for (const bad of ['', 'K7QF-M2XD-9P1', 'K7QF-M2XD-9P100', 'K7QF-M2XD-9PU0', 'K7QF-M2XD-9P!0']) assert.throws(() => normalizeCode(bad), undefined, `rejects "${bad}"`);
const vectorKey = deriveKey(VECTOR.typed, VECTOR.salt, KDF.iterations);
assert.equal(vectorKey.master.toString('hex'), VECTOR.master, 'PBKDF2 test vector');
assert.equal(vectorKey.encrypt.toString('hex'), VECTOR.encryptKey, 'HKDF encryption key');
assert.equal(vectorKey.receipt.toString('hex'), VECTOR.receiptKey, 'HKDF receipt key');
assert.notEqual(VECTOR.encryptKey, VECTOR.receiptKey, 'each key has one purpose');
const vectorEnvelope = seal(vectorKey, VECTOR.session, VECTOR.header, VECTOR.glb, VECTOR.nonce);
assert.equal(createHash('sha256').update(vectorEnvelope).digest('hex'), VECTOR.envelopeSha256, 'envelope test vector');
assert.equal(receipt(vectorKey, VECTOR.header.id), VECTOR.receipt, 'receipt test vector');
const reopened = open(vectorKey, VECTOR.session, vectorEnvelope);
assert.deepEqual(reopened.header, VECTOR.header);
assert.ok(reopened.glb.equals(VECTOR.glb));
assert.throws(() => open(vectorKey, 'ffffffffffffffffffffffffffffffff', vectorEnvelope), /could not be unlocked/, 'bound to its session');
const flipped = Buffer.from(vectorEnvelope); flipped[30] ^= 1;
assert.throws(() => open(vectorKey, VECTOR.session, flipped), /could not be unlocked/, 'tampering is detected');

// ---------------------------------------------------------------------------
// Running receiver
// ---------------------------------------------------------------------------
function call({port, method = 'GET', path, headers = {}, body, address = '127.0.0.1'}) {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest({host: address, port, method, path, agent: false, headers: {...(body ? {'Content-Length': body.length} : {}), ...headers}}, (incoming) => {
      const parts = [];
      incoming.on('data', (part) => parts.push(part));
      incoming.on('end', () => {
        const raw = Buffer.concat(parts);
        let json; try { json = JSON.parse(raw.toString('utf8')); } catch { json = undefined; }
        resolve({status: incoming.statusCode, headers: incoming.headers, raw, json});
      });
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

async function startReceiver(env = {}) {
  const port = 43000 + Math.floor(Math.random() * 2000);
  const output = await mkdtemp(join(tmpdir(), 'keepsake-receiver-'));
  const child = spawn(process.execPath, [new URL('./scanner-receiver.mjs', import.meta.url).pathname], {
    env: {...process.env, KEEPSAKE_SCANNER_PORT: String(port), KEEPSAKE_SCANNER_OUTPUT: output, ...env}, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const state = {port, output, child, log: ''};
  child.stdout.on('data', (chunk) => { state.log += chunk; });
  child.stderr.on('data', (chunk) => { state.log += chunk; });
  await until(() => state.log.includes('Receiver is ready'), 'the receiver to start', state);
  return state;
}

async function until(predicate, label, state) {
  for (let attempt = 0; attempt < 150; attempt++) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out waiting for ${label}.\n${state?.log ?? ''}`);
}

const codes = (log) => [...log.matchAll(/Pairing code: ([0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4})/g)].map((match) => match[1]);

/** What the phone does: fetch pairing parameters, derive the key, encrypt, upload. */
async function phone(receiver, code, glb, {name = 'test scan', roomTheme = 'woodland', id = randomBytes(16).toString('hex'), mutate} = {}) {
  const pairing = (await call({port: receiver.port, path: '/pairing'})).json;
  const keys = deriveKey(code, Buffer.from(pairing.kdf.salt, 'base64'), pairing.kdf.iterations);
  let body = seal(keys, pairing.session, {id, name, roomTheme, v: 1}, glb);
  if (mutate) body = mutate(body);
  const response = await call({port: receiver.port, method: 'POST', path: '/upload', body, headers: {'Content-Type': CONTENT_TYPE, 'X-Keepsake-Session': pairing.session}});
  return {...response, id, keys, pairing, body};
}

const files = async (receiver) => (await readdir(receiver.output).catch(() => [])).filter((name) => name.endsWith('.glb'));
const receivers = [];

try {
  const receiver = await startReceiver();
  receivers.push(receiver);
  const {port} = receiver;
  let code = codes(receiver.log).at(-1);
  assert.ok(code, 'the receiver shows a pairing code');

  // Nothing secret is public.
  const health = await call({port, path: '/health'});
  assert.deepEqual(Object.keys(health.json).sort(), ['maxBytes', 'protocol', 'ready']);
  const pairing = (await call({port, path: '/pairing'})).json;
  assert.equal(pairing.kdf.alg, 'PBKDF2-SHA256');
  assert.equal(pairing.kdf.iterations, KDF.iterations);
  assert.equal(Buffer.from(pairing.kdf.salt, 'base64').length, KDF.saltBytes);
  assert.ok(!JSON.stringify(pairing).includes(code.replaceAll('-', '')), 'pairing data does not include the code');

  // Old plaintext clients are told to update; wrong shapes are refused.
  assert.equal((await call({port, method: 'POST', path: '/upload', body: buildGlb(), headers: {'Content-Type': 'model/gltf-binary', 'X-Keepsake-Pair-Code': 'ABCDEF12'}})).status, 426);
  assert.equal((await call({port, method: 'POST', path: '/upload', body: Buffer.from('hello'), headers: {'Content-Type': 'text/plain', 'X-Keepsake-Session': pairing.session}})).status, 415);
  assert.equal((await call({port, method: 'POST', path: '/upload', body: Buffer.from('hello'), headers: {'Content-Type': CONTENT_TYPE, 'X-Keepsake-Session': 'f'.repeat(32)}})).status, 410, 'unknown session');
  assert.equal((await call({port, method: 'POST', path: '/upload', body: Buffer.from('not an envelope at all'), headers: {'Content-Type': CONTENT_TYPE, 'X-Keepsake-Session': pairing.session}})).status, 400);
  assert.equal((await call({port, method: 'POST', path: '/upload', body: Buffer.alloc(16), headers: {'Content-Type': CONTENT_TYPE, 'X-Keepsake-Session': pairing.session, 'Content-Length': String(6 * 1024 * 1024)}}).catch(() => ({status: 413}))).status, 413, 'declared size too large');

  // Wrong code, tampering and the model budget.
  const wrongCode = code.startsWith('0') ? '1' + code.slice(1) : '0' + code.slice(1);
  const wrong = await phone(receiver, wrongCode, buildGlb());
  assert.equal(wrong.status, 401, 'wrong code');
  assert.equal((await phone(receiver, code, buildGlb(), {mutate: (body) => { const copy = Buffer.from(body); copy[copy.length - 1] ^= 1; return copy; }})).status, 401, 'tampered upload');
  assert.equal((await phone(receiver, code, buildGlb({images: [{mimeType: 'image/png', bytes: pngWithSize(4096, 4096)}]}))).status, 422, 'oversized texture');
  assert.equal((await phone(receiver, code, buildGlb({primitives: 17}))).status, 422, 'too many parts');
  assert.equal((await phone(receiver, code, Buffer.from('not a model'))).status, 422, 'not a GLB');
  assert.equal((await files(receiver)).length, 0, 'refused scans are never written');

  // A good scan: receipt proves the receiver knows the code; replay is refused.
  const good = await phone(receiver, code, buildGlb({images: [{mimeType: 'image/png', bytes: PNG_1X1}], materials: 1}), {name: 'blue mug', roomTheme: 'beachfront'});
  assert.equal(good.status, 201);
  assert.equal(good.json.receipt, receipt(good.keys, good.id));
  assert.equal(good.json.file, undefined, 'the phone is not told local file paths');
  const replay = await call({port, method: 'POST', path: '/upload', body: good.body, headers: {'Content-Type': CONTENT_TYPE, 'X-Keepsake-Session': good.pairing.session}});
  assert.equal(replay.status, 409, 'replayed upload');
  const saved = await files(receiver);
  assert.equal(saved.length, 1);
  if (process.platform !== 'win32') {
    assert.equal((await stat(join(receiver.output, saved[0]))).mode & 0o777, 0o600, 'saved scan is private to this user');
    assert.equal((await stat(receiver.output)).mode & 0o777, 0o700, 'an existing scan folder is made private');
  }

  // One upload at a time: a second upload while the first is still arriving is told to retry.
  {
    const pairingNow = (await call({port, path: '/pairing'})).json;
    const keys = deriveKey(code, Buffer.from(pairingNow.kdf.salt, 'base64'), pairingNow.kdf.iterations);
    const slow = seal(keys, pairingNow.session, {id: randomBytes(16).toString('hex'), name: 'slow', roomTheme: 'woodland', v: 1}, buildGlb());
    const first = new Promise((resolve, reject) => {
      const outgoing = httpRequest({host: '127.0.0.1', port, method: 'POST', path: '/upload', agent: false, headers: {'Content-Type': CONTENT_TYPE, 'X-Keepsake-Session': pairingNow.session, 'Content-Length': slow.length}}, (incoming) => { incoming.resume(); incoming.on('end', () => resolve(incoming.statusCode)); });
      outgoing.on('error', reject);
      outgoing.write(slow.subarray(0, 40));
      setTimeout(async () => {
        try { assert.equal((await phone(receiver, code, buildGlb())).status, 503, 'second upload waits'); } catch (error) { reject(error); }
        outgoing.end(slow.subarray(40));
      }, 150);
    });
    assert.equal(await first, 201, 'the first upload still completes');
    assert.equal((await phone(receiver, code, buildGlb({colors: true}))).status, 201, 'uploads continue afterwards');
  }

  assert.equal((await phone(receiver, code, scannerGlb({triangles: 2000}), {name: 'coloured scan'})).status, 201, 'a coloured scan in the scanner\'s own layout');
  assert.equal((await call({port, path: '/inbox'})).json.latest.name.startsWith('coloured-scan-'), true);
  // Put the beachfront scan back as the latest for the read checks below.
  assert.equal((await phone(receiver, code, buildGlb(), {name: 'blue mug', roomTheme: 'beachfront'})).status, 201);

  // Reading: this computer, its own host names and Keepsake origins only.
  const latest = await call({port, path: '/latest', headers: {Origin: 'http://localhost:5174'}});
  assert.equal(latest.status, 200);
  assert.equal(latest.headers['content-type'], 'model/gltf-binary');
  assert.equal(latest.raw.readUInt32LE(0), 0x46546c67);
  assert.equal(latest.headers['access-control-allow-origin'], 'http://localhost:5174');
  assert.match(latest.headers['access-control-expose-headers'], /Content-Disposition/);
  assert.match(latest.headers['content-disposition'], /blue-mug-\d+\.glb/);
  assert.equal(latest.headers['x-keepsake-room-theme'], 'beachfront');
  assert.equal((await call({port, path: '/latest'})).status, 200, 'no Origin (same-computer tool) is allowed');
  assert.equal((await call({port, path: '/inbox', headers: {Origin: 'http://127.0.0.1:4173'}})).json.latest.roomTheme, 'beachfront');
  assert.equal((await call({port, path: '/latest', headers: {'Sec-Fetch-Site': 'none', 'Sec-Fetch-Mode': 'navigate'}})).status, 200, 'address typed into the browser');
  assert.equal((await call({port, path: '/latest', headers: {'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'no-cors'}})).status, 403, 'no-cors request from another site');
  for (const origin of ['https://evil.example', 'http://localhost.evil.example', 'null', 'http://192.168.1.20:5174']) {
    const refused = await call({port, path: '/latest', headers: {Origin: origin}});
    assert.equal(refused.status, 403, `origin ${origin}`);
    assert.equal(refused.headers['access-control-allow-origin'], undefined);
  }
  assert.equal((await call({port, path: '/latest', headers: {Host: `rebind.example:${port}`}})).status, 403, 'DNS rebinding host');
  const preflight = await call({port, method: 'OPTIONS', path: '/latest', headers: {Origin: 'http://localhost:5174', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Private-Network': 'true'}});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['access-control-allow-private-network'], 'true');
  assert.equal((await call({port, method: 'OPTIONS', path: '/latest', headers: {Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET'}})).status, 403);
  const lanAddress = Object.values(networkInterfaces()).flat().find((entry) => entry && entry.family === 'IPv4' && !entry.internal)?.address;
  if (lanAddress) {
    assert.equal((await call({port, path: '/latest', address: lanAddress, headers: {Host: `127.0.0.1:${port}`}})).status, 403, 'another device on the network cannot read scans');
    const viaNetwork = await call({port, path: '/latest', address: lanAddress, headers: {Origin: 'http://localhost:5174'}});
    assert.equal(viaNetwork.status, 403, 'Keepsake using the network address is refused…');
    assert.equal(viaNetwork.headers['access-control-allow-origin'], 'http://localhost:5174', '…but can read why');
    assert.equal((await call({port, path: '/pairing', address: lanAddress})).status, 200, 'but the phone can still pair over the network');
  } else console.log('  (no network interface: skipped the other-device read check)');

  // Room tags: the retired Snowy Mountain room becomes Woodland; unknown names fall back to Woodland.
  for (const [sent, expected] of [['snowy', 'woodland'], ['snowy-mountain', 'woodland'], ['SKY-CASTLE', 'woodland'], ['', 'woodland'], ['cyberpunk', 'cyberpunk']]) {
    assert.equal((await phone(receiver, code, buildGlb(), {roomTheme: sent})).status, 201);
    assert.equal((await call({port, path: '/inbox'})).json.latest.roomTheme, expected, `room tag "${sent}"`);
  }

  // Guessing: ten failed unlocks replace the code and end the old session.
  // `wrong` and the tampered upload above already counted two failures; eight more make ten.
  const before = codes(receiver.log).length;
  for (let attempt = 0; attempt < 8; attempt++) assert.equal((await phone(receiver, wrongCode, buildGlb())).status, 401);
  await until(() => codes(receiver.log).length > before, 'the code to be replaced', receiver);
  assert.equal((await call({port, method: 'POST', path: '/upload', body: good.body, headers: {'Content-Type': CONTENT_TYPE, 'X-Keepsake-Session': good.pairing.session}})).status, 410, 'old session has ended');
  const oldCode = code; code = codes(receiver.log).at(-1);
  assert.notEqual(code, oldCode);
  assert.equal((await phone(receiver, oldCode, buildGlb())).status, 401, 'the old code no longer works');
  assert.equal((await phone(receiver, code, buildGlb())).status, 201, 'the new code works');

  // Idle expiry replaces the code on its own.
  const quick = await startReceiver({KEEPSAKE_SCANNER_SESSION_TTL_MS: '600'});
  receivers.push(quick);
  const firstQuick = codes(quick.log).at(-1);
  await until(() => codes(quick.log).length > 1, 'the idle code to expire', quick);
  assert.match(quick.log, /expired/);
  assert.ok([401, 410, 503].includes((await phone(quick, firstQuick, buildGlb())).status), 'an expired code is useless');

  // An explicit origin list replaces the default.
  const narrow = await startReceiver({KEEPSAKE_SCANNER_ORIGINS: 'https://keepsake.example'});
  receivers.push(narrow);
  assert.equal((await call({port: narrow.port, path: '/inbox', headers: {Origin: 'https://keepsake.example'}})).status, 200);
  assert.equal((await call({port: narrow.port, path: '/inbox', headers: {Origin: 'http://localhost:5174'}})).status, 403);

  console.log('PASS scanner receiver: encrypted pairing (test vectors, split keys, wrong code, tampering, replay, lockout, expiry), one upload at a time, budget before write, private files and folder, local-only reads, origins, Sec-Fetch-Site and room tags.');
} finally {
  for (const receiver of receivers) { receiver.child.kill(); await rm(receiver.output, {recursive: true, force: true}); }
}

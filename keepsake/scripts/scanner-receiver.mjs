#!/usr/bin/env node
/**
 * Keepsake Scanner Receiver (transfer protocol 1)
 *
 * A small, dependency-free receiver for scans sent from Keepsake Scanner on the same
 * Wi-Fi network. It is not an internet service and uses no outside service.
 *
 * What it protects against:
 * - Anyone else on the network reading a scan in transit or uploading one: every upload is
 *   encrypted and authenticated (AES-256-GCM) with a key derived from the pairing code shown
 *   here. The code itself never crosses the network. See scan-envelope.mjs.
 * - Other devices, or web pages from other sites open in this computer's browser, reading
 *   received scans: /latest and /inbox answer only on this computer (loopback), only for
 *   its own host names (blocks DNS rebinding), and only to allowed origins (no wildcard
 *   CORS). By default that is any page served from this computer, because the Keepsake dev
 *   server's port varies; set KEEPSAKE_SCANNER_ORIGINS to allow only Keepsake's exact origin.
 * - Replayed uploads, guessing, and stale codes: each upload id is accepted once, ten failed
 *   unlocks or 30 idle minutes replace the code, and a restart always makes a new one.
 *
 * Not protected: software already running as you on this computer (it can read the saved
 * files, as it can read the browser's storage), or someone who can see this terminal.
 * An attacker on the network can still make the code change (by failing on purpose) or
 * pretend to be this receiver; neither reveals a scan. Other pages served from this computer
 * can read scans unless KEEPSAKE_SCANNER_ORIGINS is set.
 */
import {createServer} from 'node:http';
import {chmod, mkdir, readFile, writeFile} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {join, resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {GLB_BUDGET, inspectGlb} from '../src/lib/glbBudget.ts';
import {CONTENT_TYPE, ENVELOPE_OVERHEAD, EnvelopeError, KDF, PROTOCOL, deriveKeyAsync, formatCode, newCode, open, receipt} from './scan-envelope.mjs';

const port = Number(process.env.KEEPSAKE_SCANNER_PORT || 4318);
const outputDirectory = resolve(process.env.KEEPSAKE_SCANNER_OUTPUT || 'scanner-imports');
const sessionIdleMs = Number(process.env.KEEPSAKE_SCANNER_SESSION_TTL_MS || 30 * 60_000);
const maxFailures = 10;
const maxEnvelopeBytes = GLB_BUDGET.maxBytes + ENVELOPE_OVERHEAD;
// Origins allowed to read scans. By default, any page served from this computer
// (the Keepsake dev server's port varies). Set KEEPSAKE_SCANNER_ORIGINS to an exact,
// comma-separated list to narrow it or to add a deployed Keepsake origin.
const configuredOrigins = (process.env.KEEPSAKE_SCANNER_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const loopbackOrigin = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
const loopbackHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);
// Rooms a scan can be tagged for. Older scanner builds offer the retired Snowy Mountain
// room; that room is now Woodland's winter season, so it maps to Woodland.
const roomThemes = new Set(['woodland', 'beachfront', 'cyberpunk']);
const legacyRoomThemes = {snowy: 'woodland', 'snowy-mountain': 'woodland'};

let session = null;
let latest = null;
let uploading = false;

/**
 * Replace the pairing code. The old session ends at once; uploads get "try again" (503)
 * until the new key is ready. Stretching the code runs off the event loop, so forcing
 * code changes cannot stall the receiver. The code is kept only inside the key.
 */
async function startSession(reason) {
  const code = newCode();
  const salt = randomBytes(KDF.saltBytes);
  const next = {id: randomBytes(16).toString('hex'), salt, keys: null, failures: 0, seen: new Set(), lastUsed: Date.now()};
  session = next;
  next.keys = await deriveKeyAsync(code, salt, KDF.iterations);
  if (session !== next) return;
  if (reason) console.log(`\n${reason}`);
  console.log(`Pairing code: ${formatCode(code)}`);
}

function localAddresses() {
  return Object.values(networkInterfaces()).flat().filter((entry) => entry && entry.family === 'IPv4' && !entry.internal).map((entry) => entry.address);
}

function send(response, status, body, contentType = 'application/json', headers = {}) {
  response.writeHead(status, {'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers});
  // Strings and file bytes go out as-is; only plain objects are JSON. (JSON.stringify on a
  // Buffer would send {"type":"Buffer",...} instead of the GLB.)
  response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const isLoopback = (address = '') => address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.');
const originAllowed = (origin) => configuredOrigins.length ? configuredOrigins.includes(origin) : loopbackOrigin.test(origin);

/** Reading scans: this computer only, its own host names, and allowed origins only. */
function readAccess(request) {
  const origin = request.headers.origin;
  if (origin !== undefined && !originAllowed(origin)) return {allowed: false, headers: {Vary: 'Origin'}};
  // An allowed page may read why it was refused (for example, Keepsake opened the computer's network address).
  const cors = origin === undefined ? {Vary: 'Origin'} : {'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Expose-Headers': 'Content-Disposition, X-Keepsake-Room-Theme'};
  if (!isLoopback(request.socket.remoteAddress) || !loopbackHosts.has(String(request.headers.host || '').toLowerCase())) return {allowed: false, headers: cors};
  // Browsers leave out Origin on requests other sites make with <img>, <script> or no-cors
  // fetches. Without an Origin, allow only requests that did not come from a web page:
  // tools such as curl send no Sec-Fetch-Site, and an address typed into the browser sends "none".
  if (origin === undefined && request.headers['sec-fetch-site'] !== undefined && request.headers['sec-fetch-site'] !== 'none') return {allowed: false, headers: {}};
  return {allowed: true, headers: cors};
}

function roomTheme(value) {
  const cleaned = String(value || '').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 32);
  const theme = legacyRoomThemes[cleaned] ?? cleaned;
  return roomThemes.has(theme) ? theme : 'woodland';
}

function filename(value) {
  const cleaned = String(value || 'keepsake-scan').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return `${cleaned || 'keepsake-scan'}-${Date.now()}.glb`;
}

function readBody(request, limit) {
  return new Promise((resolveBody, reject) => {
    const parts = []; let size = 0; let done = false;
    request.on('data', (part) => {
      if (done) return;
      size += part.length;
      if (size > limit) { done = true; reject(Object.assign(new Error('too large'), {status: 413})); request.resume(); return; }
      parts.push(part);
    });
    request.on('end', () => { if (!done) { done = true; resolveBody(Buffer.concat(parts)); } });
    request.on('error', (error) => { if (!done) { done = true; reject(error); } });
  });
}

async function handleUpload(request, response) {
  // Refusing before the body is read: discard what is still arriving and close the
  // connection, so leftover bytes cannot be mistaken for the client's next request.
  const refuse = (status, body) => { request.resume(); return send(response, status, body, 'application/json', {Connection: 'close'}); };
  if (request.headers['x-keepsake-pair-code'] !== undefined || request.headers['content-type'] === 'model/gltf-binary') {
    return refuse(426, {error: 'Update Keepsake Scanner. This receiver only accepts encrypted transfers.'});
  }
  if (request.headers['content-type'] !== CONTENT_TYPE) return refuse(415, {error: 'Send an encrypted Keepsake scan.'});
  if (request.headers['x-keepsake-session'] !== session.id) return refuse(410, {error: 'This pairing has ended. Enter the new code shown on the computer.'});
  if (!session.keys) return refuse(503, {error: 'The computer is preparing a new pairing code. Try again in a moment.'});
  const declared = Number(request.headers['content-length']);
  if (!Number.isInteger(declared) || declared <= 0 || declared > maxEnvelopeBytes) return refuse(413, {error: 'Scans must be 5 MB or smaller.'});
  // One upload at a time bounds the memory a flood of uploads can use (about three copies of 5 MB).
  if (uploading) return refuse(503, {error: 'The computer is receiving another scan. Try again in a moment.'});
  uploading = true;
  try { return await receiveUpload(request, response); } finally { uploading = false; }
}

async function receiveUpload(request, response) {
  const activeSession = session;
  let body;
  try { body = await readBody(request, maxEnvelopeBytes); }
  catch (error) { return send(response, error.status ?? 400, {error: error.status ? 'Scans must be 5 MB or smaller.' : 'The upload did not finish.'}, 'application/json', {Connection: 'close'}); }
  if (session !== activeSession) return send(response, 410, {error: 'This pairing has ended. Enter the new code shown on the computer.'});

  let opened;
  try { opened = open(activeSession.keys, activeSession.id, body); }
  catch (error) {
    if (error instanceof EnvelopeError && error.kind === 'key') {
      activeSession.failures++;
      if (activeSession.failures >= maxFailures) void startSession('Too many attempts with the wrong code, so the code has been replaced.');
      return send(response, 401, {error: 'The pairing code does not match.'});
    }
    return send(response, 400, {error: error instanceof Error ? error.message : 'This is not a Keepsake scan transfer.'});
  }
  const {header, glb} = opened;
  if (activeSession.seen.has(header.id)) return send(response, 409, {error: 'This scan was already received.'});
  // Same rules Keepsake applies on import, so a scan that would be refused later never reaches the room.
  try { inspectGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength)); }
  catch (error) { return send(response, 422, {error: error instanceof Error ? error.message : 'This scan is over Keepsake\'s model budget.'}); }

  activeSession.seen.add(header.id);
  activeSession.lastUsed = Date.now();
  await mkdir(outputDirectory, {recursive: true, mode: 0o700});
  // mkdir leaves an existing folder as it was; make it private too.
  await chmod(outputDirectory, 0o700).catch(() => {});
  const name = filename(header.name);
  const path = join(outputDirectory, name);
  // Readable only by you: these are personal memories.
  await writeFile(path, glb, {flag: 'wx', mode: 0o600});
  latest = {path, name, roomTheme: roomTheme(header.roomTheme), bytes: glb.length, receivedAt: Date.now()};
  console.log(`Received ${glb.length.toLocaleString()} bytes → ${path}`);
  return send(response, 201, {ok: true, bytes: glb.length, receipt: receipt(activeSession.keys, header.id)});
}

const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url || '/', 'http://receiver.invalid').pathname;
    const reading = path === '/latest' || path === '/inbox';
    if (reading) {
      const access = readAccess(request);
      if (!access.allowed) return send(response, 403, {error: 'Scans can only be opened in Keepsake on this computer.'}, 'application/json', access.headers);
      if (request.method === 'OPTIONS') {
        const privateNetwork = request.headers['access-control-request-private-network'] === 'true' ? {'Access-Control-Allow-Private-Network': 'true'} : {};
        return send(response, 204, '', 'text/plain', {...access.headers, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '600', ...privateNetwork});
      }
      if (request.method !== 'GET') return send(response, 405, {error: 'Method not allowed'}, 'application/json', access.headers);
      if (path === '/inbox') return send(response, 200, {ready: true, latest: latest && {name: latest.name, roomTheme: latest.roomTheme, bytes: latest.bytes, receivedAt: latest.receivedAt}}, 'application/json', access.headers);
      if (!latest) return send(response, 404, {error: 'No scan has arrived yet.'}, 'application/json', access.headers);
      try { return send(response, 200, await readFile(latest.path), 'model/gltf-binary', {...access.headers, 'Content-Disposition': `attachment; filename="${latest.name}"`, 'X-Keepsake-Room-Theme': latest.roomTheme}); }
      catch { latest = null; return send(response, 404, {error: 'The latest scan is no longer available.'}, 'application/json', access.headers); }
    }
    if (request.method === 'GET' && path === '/health') return send(response, 200, {ready: true, protocol: PROTOCOL, maxBytes: GLB_BUDGET.maxBytes});
    // Public on purpose: none of this is secret. The phone checks the parameters before using them.
    if (request.method === 'GET' && path === '/pairing') return send(response, 200, {v: PROTOCOL, session: session.id, kdf: {alg: KDF.algorithm, iterations: KDF.iterations, salt: session.salt.toString('base64')}});
    if (request.method === 'POST' && path === '/upload') return await handleUpload(request, response);
    return send(response, 404, {error: 'Not found'});
  } catch (error) {
    console.error('Receiver error:', error instanceof Error ? error.message : error);
    if (!response.headersSent) send(response, 500, {error: 'The receiver could not save this scan.'});
  }
});

// A phone that stalls mid-upload should not hold a connection open.
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;

const idleCheck = setInterval(() => {
  if (session.keys && Date.now() - session.lastUsed >= sessionIdleMs) void startSession('The pairing code expired after a period without scans.');
}, Math.max(250, Math.min(30_000, sessionIdleMs / 4)));
idleCheck.unref();

await startSession();
server.listen(port, '0.0.0.0', () => {
  const addresses = localAddresses();
  console.log('\nKeepsake Scanner Receiver is ready.');
  console.log(`Output folder: ${outputDirectory}`);
  console.log('In Keepsake Scanner, choose Send to desktop and enter one of these addresses with the pairing code above:');
  (addresses.length ? addresses : ['<your computer’s local IP address>']).forEach((address) => console.log(`  http://${address}:${port}`));
  console.log('\nThen in Keepsake on this computer choose “Receive a scan from your phone”. Keep this window open; close it when you are done.\n');
});

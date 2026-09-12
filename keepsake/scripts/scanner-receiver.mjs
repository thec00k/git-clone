#!/usr/bin/env node
/**
 * Keepsake Scanner Receiver
 *
 * A deliberately small, dependency-free local receiver for scans sent from
 * Keepsake Scanner on the same trusted Wi-Fi network.  It is not an internet
 * service: a fresh one-time pairing code is required for every upload and the
 * process writes only GLB files to the selected local folder.
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const port = Number(process.env.KEEPSAKE_SCANNER_PORT || 4318);
const outputDirectory = resolve(process.env.KEEPSAKE_SCANNER_OUTPUT || 'scanner-imports');
const pairCode = randomBytes(4).toString('hex').toUpperCase();
const maxBytes = 5 * 1024 * 1024;

function localAddresses() {
  return Object.values(networkInterfaces()).flat().filter((entry) => entry && entry.family === 'IPv4' && !entry.internal).map((entry) => entry.address);
}

let latest = null;
function send(response, status, body, contentType = 'application/json', headers = {}) {
  response.writeHead(status, {'Content-Type': contentType, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', ...headers});
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function safeEquals(a, b) {
  const left = Buffer.from(a || ''); const right = Buffer.from(b || '');
  return left.length === right.length && timingSafeEqual(left, right);
}

function isGlb(buffer) {
  return buffer.length >= 20 && buffer.readUInt32LE(0) === 0x46546c67 && buffer.readUInt32LE(4) === 2 && buffer.readUInt32LE(8) === buffer.length;
}

function filename(value) {
  const cleaned = String(value || 'keepsake-scan').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return `${cleaned || 'keepsake-scan'}-${Date.now()}.glb`;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'OPTIONS') return send(response, 204, '', 'text/plain', {'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Keepsake-Pair-Code, X-Keepsake-Scan-Name, X-Keepsake-Room-Theme'});
  if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, {ready: true, maxBytes, pairCodeHint: pairCode.slice(0, 2) + '••••••'});
  if (request.method === 'GET' && url.pathname === '/inbox') return send(response, 200, {ready: true, latest: latest && {name: latest.name, roomTheme: latest.roomTheme, bytes: latest.bytes, receivedAt: latest.receivedAt}});
  if (request.method === 'GET' && url.pathname === '/latest') {
    if (!latest) return send(response, 404, {error: 'No scan has arrived yet.'});
    try { return send(response, 200, await readFile(latest.path), 'model/gltf-binary', {'Content-Disposition': `attachment; filename="${latest.name}"`, 'X-Keepsake-Room-Theme': latest.roomTheme}); }
    catch { latest = null; return send(response, 404, {error: 'The latest scan is no longer available.'}); }
  }
  if (request.method !== 'POST' || url.pathname !== '/upload') return send(response, 404, {error: 'Not found'});
  if (!safeEquals(request.headers['x-keepsake-pair-code'], pairCode)) return send(response, 401, {error: 'The pairing code does not match.'});
  if (request.headers['content-type'] !== 'model/gltf-binary') return send(response, 415, {error: 'Send a self-contained GLB file.'});
  const declared = Number(request.headers['content-length'] || 0);
  if (!Number.isFinite(declared) || declared < 20 || declared > maxBytes) return send(response, 413, {error: 'Scans must be between 20 bytes and 5 MB.'});
  const parts = []; let size = 0;
  request.on('data', (part) => { size += part.length; if (size > maxBytes) request.destroy(); else parts.push(part); });
  request.on('error', () => {});
  request.on('end', async () => {
    const scan = Buffer.concat(parts);
    if (!isGlb(scan)) return send(response, 422, {error: 'That file is not a valid GLB 2.0 container.'});
    await mkdir(outputDirectory, {recursive: true});
    const path = join(outputDirectory, filename(request.headers['x-keepsake-scan-name']));
    await writeFile(path, scan, {flag: 'wx'});
    latest = {path, name: path.split(/[\\/]/).pop(), roomTheme: String(request.headers['x-keepsake-room-theme'] || 'woodland').replace(/[^a-z-]/gi, '').slice(0, 32), bytes: scan.length, receivedAt: Date.now()};
    send(response, 201, {ok: true, file: path, bytes: scan.length});
    console.log(`Received ${scan.length.toLocaleString()} bytes → ${path}`);
  });
});

server.listen(port, '0.0.0.0', () => {
  const addresses = localAddresses();
  console.log('\nKeepsake Scanner Receiver is ready.');
  console.log(`Pairing code: ${pairCode}`);
  console.log(`Output folder: ${outputDirectory}`);
  console.log('On your phone, enter one of these receiver addresses and the pairing code:');
  (addresses.length ? addresses : ['<your computer’s local IP address>']).forEach((address) => console.log(`  http://${address}:${port}`));
  console.log('\nAfter transfer, Keepsake can import it directly from “Receive a scan from your phone”. Keep this window open. Use only on a trusted home/local network.\n');
});

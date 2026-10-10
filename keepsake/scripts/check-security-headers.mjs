// Guards the privacy rules around third-party requests (docs/security-headers.md).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const headers = read('../public/_headers');
const page = read('../index.html');
const fonts = read('../src/fonts.css');

// Hosts the app may contact, only when an optional feature is used.
const ALLOWED = new Set([
  'open.spotify.com', 'api.spotify.com', 'accounts.spotify.com', 'sdk.scdn.co',
  'w.soundcloud.com', 'i.scdn.co', '*.sndcdn.com', '127.0.0.1', 'localhost',
]);
const hostsIn = text => [...text.matchAll(/https?:\/\/([a-z0-9*.-]+)/gi)].map(m => m[1].toLowerCase());

const policy = /Content-Security-Policy(?:-Report-Only)?:\s*(.+)/.exec(headers)?.[1];
assert.ok(policy, 'a Content-Security-Policy header is present');
for (const host of hostsIn(policy)) assert.ok(ALLOWED.has(host), `CSP names an unexpected host: ${host}`);
for (const directive of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "font-src 'self'"]) {
  assert.ok(policy.includes(directive), `CSP keeps ${directive}`);
}
assert.ok(!/script-src[^;]*'unsafe-(inline|eval)'/.test(policy), 'scripts never need unsafe-inline or unsafe-eval');
assert.match(headers, /Permissions-Policy:[^\n]*geolocation=\(\)/, 'location permission is switched off');
assert.match(headers, /X-Content-Type-Options:\s*nosniff/);

// Nothing at page load may reach another site.
assert.deepEqual(hostsIn(page), [], 'index.html references no external host');
assert.deepEqual(hostsIn(fonts), [], 'fonts.css references no external host');
assert.doesNotMatch(page + fonts, /googleapis|gstatic/, 'no Google Fonts');

console.log('PASS security headers: strict CSP allowlist, location switched off, no third-party requests at page load.');

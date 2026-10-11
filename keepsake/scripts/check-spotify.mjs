import assert from 'node:assert/strict';
import {getPlaybackDevice, isConnected, setPlaybackVolume} from '../src/lib/spotify.ts';
// Synthetic storage and HTTP responses only: no account or playback is touched.
const memory = () => {
  const items = new Map();
  return {
    getItem: k => items.get(k) ?? null,
    setItem: (k, v) => items.set(k, String(v)),
    removeItem: k => items.delete(k),
  };
};
globalThis.localStorage = memory();
globalThis.sessionStorage = memory();
let token = JSON.stringify({access_token: 'test-only', expires_at: Date.now() + 60000});
// A token saved by an older build in localStorage moves to sessionStorage and leaves localStorage.
localStorage.setItem('ks-spotify-token', token);
assert.equal(isConnected(), true);
assert.equal(localStorage.getItem('ks-spotify-token'), null, 'no Spotify token is left in localStorage');
assert.equal(
  sessionStorage.getItem('ks-spotify-token'),
  token,
  'the token lasts only for this browser session',
);
const session = globalThis.sessionStorage;
globalThis.sessionStorage = {
  ...session,
  getItem: k => (k === 'ks-spotify-token' ? token : session.getItem(k)),
};
let calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({url, init});
  return new Response(null, {status: 204});
};
assert.equal(await getPlaybackDevice(), null);
assert.equal(await setPlaybackVolume(0.375, 'test device'), true);
assert.equal(
  calls.at(-1).url,
  'https://api.spotify.com/v1/me/player/volume?volume_percent=38&device_id=test%20device',
);
assert.equal(calls.at(-1).init.method, 'PUT');
await setPlaybackVolume(2, 'test');
assert.match(calls.at(-1).url, /volume_percent=100&/);
await setPlaybackVolume(-1, 'test');
assert.match(calls.at(-1).url, /volume_percent=0&/);
globalThis.fetch = async () => new Response(null, {status: 403});
assert.equal(await setPlaybackVolume(0.5, 'test'), false);
globalThis.fetch = async () => {
  throw new Error('offline');
};
assert.equal(await getPlaybackDevice(), null);
token = null;
calls = [];
globalThis.fetch = async () => {
  calls.push('unexpected');
};
assert.equal(await setPlaybackVolume(0.5, 'test'), false);
assert.equal(calls.length, 0);
console.log(
  'Spotify device targeting, volume bounds, 204/403, offline and disconnected cases passed (mock HTTP).',
);

import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeRoomAssetIndex} from './room-asset-index.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const bytes = fs.readFileSync(new URL('../public/room/sky-castle/sky-castle.glb', import.meta.url));
const sha256 = createHash('sha256').update(bytes).digest('hex');
const asset = {file: 'sky-castle.glb', bytes: bytes.length, sha256};
fs.writeFileSync(
  new URL('../public/room/sky-castle/asset-manifest.json', import.meta.url),
  JSON.stringify({room: 'sky-castle', qualities: {balanced: asset, high: asset}}, null, 2) + '\n',
);
// The shared writer: the old in-place regex stopped matching once roomAssets.ts was formatted.
writeRoomAssetIndex(root);
console.log(`Sky Castle asset: ${(bytes.length / 1024 / 1024).toFixed(2)} MiB, ${sha256.slice(0, 12)}`);

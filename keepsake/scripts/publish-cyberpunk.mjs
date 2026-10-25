import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeRoomAssetIndex} from './room-asset-index.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const bytes = fs.readFileSync(new URL('../public/room/cyberpunk/cyberpunk.glb', import.meta.url));
const sha256 = createHash('sha256').update(bytes).digest('hex');
const asset = {file: 'cyberpunk.glb', bytes: bytes.length, sha256};
fs.writeFileSync(
  new URL('../public/room/cyberpunk/asset-manifest.json', import.meta.url),
  JSON.stringify({room: 'cyberpunk', qualities: {balanced: asset, high: asset}}, null, 2) + '\n',
);
writeRoomAssetIndex(root);
console.log(`Neon City asset: ${(bytes.length / 1024 / 1024).toFixed(2)} MiB, ${sha256.slice(0, 12)}`);

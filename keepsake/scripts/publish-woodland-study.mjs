// Records the Woodland cabin model built by art/woodland-study/build.py and points the app at this revision.
// Run after every re-export of public/room/woodland-study/woodland-study.glb.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {writeRoomAssetIndex} from './room-asset-index.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const folder = path.join(root, 'public/room/woodland-study');
const bytes = fs.readFileSync(path.join(folder, 'woodland-study.glb'));
// One model serves both graphics levels; the runtime lowers shadows and resolution for balanced.
const asset = {
  file: 'woodland-study.glb',
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
};
fs.writeFileSync(
  path.join(folder, 'asset-manifest.json'),
  JSON.stringify(
    {room: 'woodland', source: 'art/woodland-study/build.py', qualities: {balanced: asset, high: asset}},
    null,
    2,
  ) + '\n',
);
writeRoomAssetIndex(root);
console.log(
  `Woodland cabin model recorded: ${(asset.bytes / 1048576).toFixed(2)} MiB, ${asset.sha256.slice(0, 12)}.`,
);

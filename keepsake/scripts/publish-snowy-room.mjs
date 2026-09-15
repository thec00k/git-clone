import fs from 'node:fs';
import {createHash} from 'node:crypto';
const bytes=fs.readFileSync('public/room/snowy-mountain/snowy-mountain.glb'),sha256=createHash('sha256').update(bytes).digest('hex');
const asset={file:'snowy-mountain.glb',bytes:bytes.length,sha256};
fs.writeFileSync('public/room/snowy-mountain/asset-manifest.json',JSON.stringify({room:'snowy-mountain',qualities:{balanced:asset,high:asset}},null,2)+'\n');
const file='src/generated/roomAssets.ts',s=fs.readFileSync(file,'utf8');
const entry=`  "snowy-mountain": {"balanced":"/room/snowy-mountain/snowy-mountain.glb?v=${sha256.slice(0,12)}","high":"/room/snowy-mountain/snowy-mountain.glb?v=${sha256.slice(0,12)}"},`;
fs.writeFileSync(file,s.includes('"snowy-mountain":')?s.replace(/  "snowy-mountain":.*?,\n/,entry+'\n'):s.replace('export const roomAssets = {','export const roomAssets = {\n'+entry));
console.log(`Snowy Mountain: ${(bytes.length/1048576).toFixed(2)} MiB, ${sha256.slice(0,12)}`);

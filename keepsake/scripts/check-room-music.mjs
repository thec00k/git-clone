import assert from 'node:assert/strict';
import {musicOnEntry,CRT_COLORS} from '../src/lib/roomMusic.ts';
const room={books:[{id:'a',playlistUri:'spotify:playlist:abc'}],activeBookId:'a',environment:{musicProvider:'ambient',musicOn:true}};
assert.equal(musicOnEntry(room).environment.musicOn,false,'legacy room is not unexpectedly made audible');
assert.equal(musicOnEntry({...room,environment:{...room.environment,entryMusic:'off'}}).environment.musicOn,false);
const mellow=musicOnEntry({...room,environment:{...room.environment,entryMusic:'mellow'}});assert.equal(mellow.environment.soundCloudUrl,undefined);assert.equal(mellow.environment.musicProvider,'lofi');assert.equal(mellow.environment.musicOn,true);
for(const source of ['spotify','soundcloud']){const s={...room,environment:{...room.environment,entryMusic:source,soundCloudUrl:'https://soundcloud.com/example'}};assert.equal(musicOnEntry(s).environment.musicProvider,source);assert.equal(musicOnEntry(s).environment.musicOn,true);}
assert.equal(musicOnEntry({...room,books:[],environment:{...room.environment,entryMusic:'spotify'}}).environment.musicOn,false);
assert.equal(musicOnEntry({...room,environment:{...room.environment,entryMusic:'soundcloud'}}).environment.musicOn,false);
assert.deepEqual(Object.keys(CRT_COLORS),['blue','green','purple','pink','orange','red','coastal']);
console.log('Music entry policies, missing playlist fallback, legacy silence and six standard CRT colors and exclusive Coastal Blue passed.');


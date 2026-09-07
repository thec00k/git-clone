import assert from 'node:assert/strict';
import {soundCloudUrl} from '../src/lib/soundcloud.ts';
assert.equal(soundCloudUrl('https://soundcloud.com/purrplecat/sets/mellow-skies?utm_source=test'),'https://soundcloud.com/purrplecat/sets/mellow-skies');
for(const url of ['javascript:alert(1)','https://soundcloud.com.evil.test/name','https://secret@soundcloud.com/name','https://soundcloud.com/you/library','https://soundcloud.com/user/track/s-secret','http://soundcloud.com/name'])assert.equal(soundCloudUrl(url),null);
assert.equal(soundCloudUrl('https://soundcloud.com/purrplecat'),'https://soundcloud.com/purrplecat');
console.log('SoundCloud public URL validation passed.');

import assert from 'node:assert/strict';
import {stripJpeg,stripPng,stripWebp,stripMetadataBytes} from '../src/lib/stripMetadata.ts';
const enc=s=>[...s].map(c=>c.charCodeAt(0));
// JPEG: SOI, APP0, APP1 EXIF (orientation 6 + a fake GPS string), APP13, SOS + data, EOI
const tiff=[0x4d,0x4d,0,0x2a,0,0,0,8,0,1,0x01,0x12,0,3,0,0,0,1,0,6,0,0,0,0,0,0,...enc('GPS 51.5N 0.12W')];
const exif=[...enc('Exif'),0,0,...tiff];
const seg=(m,body)=>[0xff,m,(body.length+2)>>8,(body.length+2)&255,...body];
const jpeg=Uint8Array.from([0xff,0xd8,...seg(0xe0,enc('JFIF\0')),...seg(0xe1,exif),...seg(0xed,enc('Photoshop 3.0 IPTC city')),0xff,0xda,0,2,1,2,3,0xff,0xd9]);
const clean=stripJpeg(jpeg),text=String.fromCharCode(...clean);
assert.ok(!text.includes('GPS')&&!text.includes('IPTC'),'location and IPTC removed');
assert.ok(text.includes('JFIF'),'other segments kept');
const i=clean.indexOf(0xe1);assert.ok(i>0&&clean[i-1]===0xff,'an orientation-only EXIF remains');
assert.ok(text.endsWith(String.fromCharCode(1,2,3,0xff,0xd9)),'image data untouched');
const noOrient=Uint8Array.from([0xff,0xd8,...seg(0xe1,[...enc('Exif'),0,0,0x4d,0x4d,0,0x2a,0,0,0,8,0,0,...enc('GPS')]),0xff,0xda,0,2,9]);
assert.ok(!String.fromCharCode(...stripJpeg(noOrient)).includes('Exif'),'no EXIF kept when orientation is normal');
const bad=Uint8Array.from([0xff,0xd8,0x12,0x34]);assert.equal(stripJpeg(bad),bad,'malformed files are left alone');
// PNG
const chunk=(type,data)=>{const l=data.length;return [l>>>24,(l>>16)&255,(l>>8)&255,l&255,...enc(type),...data,0,0,0,0];};
const png=Uint8Array.from([137,80,78,71,13,10,26,10,...chunk('IHDR',[0,0,0,1,0,0,0,1,8,2,0,0,0]),...chunk('eXIf',enc('GPS')),...chunk('tEXt',enc('Location\0Paris')),...chunk('IDAT',[1,2]),...chunk('IEND',[])]);
const p=String.fromCharCode(...stripPng(png));assert.ok(!p.includes('GPS')&&!p.includes('Paris')&&p.includes('IDAT')&&p.includes('IEND'));
// WebP
const rc=(type,data)=>{const l=data.length;return [...enc(type),l&255,(l>>8)&255,(l>>16)&255,l>>>24,...data,...(l&1?[0]:[])];};
const body=[...enc('WEBP'),...rc('VP8X',[0x0c,0,0,0,0,0,0,0,0,0]),...rc('VP8 ',[1,2,3,4]),...rc('EXIF',enc('GPS!')),...rc('XMP ',enc('loc'))];
const webp=Uint8Array.from([...enc('RIFF'),body.length&255,(body.length>>8)&255,0,0,...body]);
const w=stripWebp(webp),ws=String.fromCharCode(...w);assert.ok(!ws.includes('GPS')&&!ws.includes('loc')&&ws.includes('VP8 '));
assert.equal(w[20]&0x0c,0,'VP8X metadata flags cleared');assert.equal(w[4]|(w[5]<<8),w.length-8,'RIFF size fixed');
assert.equal(stripMetadataBytes(Uint8Array.from([1,2,3])).length,3);
console.log('Original photos: location/EXIF/IPTC/XMP stripped from JPEG, PNG and WebP; orientation kept; malformed files untouched.');

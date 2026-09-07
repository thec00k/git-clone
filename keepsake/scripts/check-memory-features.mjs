import assert from 'node:assert/strict';
import {parseRoomBackup,serializeRoom} from '../src/lib/roomBackup.ts';
import {movePageSpread} from '../src/lib/spreads.ts';
const state={version:1,profile:{displayName:'Test'},books:[{id:'book',title:'A memory',subtitle:'',coverStyle:'forest',visibility:'private',createdAt:1,updatedAt:1,pages:[{id:'p1',elements:[]}]}],activeBookId:'book',archive:[],archiveTabs:[],pins:[],guestbook:[],notes:[],pinNotes:[],achievements:[],achievementsSeen:[],ownedStickerPacks:['everyday'],stamps:12,achievementsAt:{},receipts:{},progress:{visitedAtNight:false,previewedAsVisitor:false,completedTour:false},environment:{timeMode:'day',season:'autumn',weather:'clear',musicProvider:'ambient',lampOn:true,ceilingOn:true,shelfLit:true,musicOn:false,pinsLocked:false,volume:.5,ambienceVolume:.4,roomQuality:'high'}};
assert.deepEqual(parseRoomBackup(serializeRoom(state)),state);
for(const corrupt of [s=>{s.books[0].pages[0].elements=[{type:'photo',id:'x',src:'javascript:alert(1)',x:50,y:50,w:30,z:1,rotation:0,frame:'polaroid'}];},s=>{s.environment.volume=5;},s=>{s.books.push(structuredClone(s.books[0]));},s=>{delete s.archive;},s=>{s.activeBookId='missing';}]){const copy=structuredClone(state);corrupt(copy);assert.throws(()=>parseRoomBackup(serializeRoom(copy)));}
assert.throws(()=>parseRoomBackup('{'));
assert.throws(()=>parseRoomBackup(JSON.stringify({format:'keepsake-room',backupVersion:999,state})));
const pages=Array.from({length:5},(_,i)=>({id:`p${i}`,elements:[]}));
const moved=movePageSpread(pages,2,0,'pad');assert.deepEqual(moved.map(p=>p.id),['p4','pad','p0','p1','p2','p3']);assert.equal(pages.length,5);
assert.equal(movePageSpread(pages,-1,2,'pad'),pages);assert.equal(movePageSpread(pages,1,1,'pad'),pages);
assert.deepEqual(movePageSpread(moved,0,2,'pad2').map(p=>p.id),['p0','p1','p2','p3','p4','pad']);
console.log('Room backup round-trip, invalid data rejection and whole-spread reordering passed.');

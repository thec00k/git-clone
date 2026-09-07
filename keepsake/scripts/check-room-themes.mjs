import assert from 'node:assert/strict';
import {switchRoomTheme,ownsRoomTheme} from '../src/lib/roomThemes.ts';
import {parseRoomBackup,serializeRoom} from '../src/lib/roomBackup.ts';
const state={version:1,profile:{displayName:'Test'},books:[{id:'book',title:'A memory',subtitle:'',coverStyle:'forest',visibility:'private',createdAt:1,updatedAt:1,pages:[{id:'p1',elements:[]}]}],activeBookId:'book',archive:[],archiveTabs:[],pins:[],guestbook:[],notes:[],pinNotes:[],achievements:[],achievementsSeen:[],ownedStickerPacks:['everyday'],stamps:12,achievementsAt:{},receipts:{},progress:{visitedAtNight:false,previewedAsVisitor:false,completedTour:false},environment:{timeMode:'day',season:'autumn',weather:'clear',musicProvider:'ambient',lampOn:true,ceilingOn:true,shelfLit:true,musicOn:false,pinsLocked:false,volume:.5,ambienceVolume:.4,roomQuality:'high'},roomDecor:{owned:['fox','bird','poster-night'],sillItem:'fox',posterItem:'poster-night'}};
const coast=switchRoomTheme(state,'beachfront');
assert.equal(coast.environment.roomTheme,'beachfront');
for(const key of ['books','archive','pins','guestbook','notes','achievements','activeBookId','stamps'])assert.deepEqual(coast[key],state[key],key+' survives switching');
assert.equal(coast.roomDecor.sillItem,'fox','first visit brings current items');
const changed={...coast,roomDecor:{...coast.roomDecor,sillItem:'bird',posterItem:undefined}};
const forest=switchRoomTheme(changed,'woodland');assert.equal(forest.roomDecor.sillItem,'fox');assert.equal(forest.roomDecor.posterItem,'poster-night');
const restored=parseRoomBackup(serializeRoom(forest));
const returned=switchRoomTheme(restored,'beachfront');assert.equal(returned.roomDecor.sillItem,'bird');assert.equal(returned.roomDecor.posterItem,undefined,'an empty saved wall stays empty after JSON round trip');
assert.equal(switchRoomTheme(returned,'beachfront'),returned,'reselecting never mutates or charges');
assert.equal(switchRoomTheme(state,'invalid'),state);
for(const change of [s=>s.environment.roomTheme='invalid',s=>s.roomDecor.layouts={beachfront:{sillItem:'unowned'}},s=>s.roomDecor.layouts={woodland:{posterItem:'fox'}}]){const s=structuredClone(state);change(s);assert.throws(()=>parseRoomBackup(serializeRoom(s)));}
console.log('Room switching preserves memories and currency, restores per-room decor, round-trips backups, and rejects invalid themes/items.');

assert.equal(ownsRoomTheme(state,'beachfront'),false);
assert.equal(ownsRoomTheme(coast,'beachfront'),true);
assert.equal(coast.environment.crtColor,'coastal');
assert.equal(forest.environment.crtColor,'green','Woodland restores its screen preset');
assert.equal(ownsRoomTheme(forest,'beachfront'),true,'the acquired color remains unlocked after leaving Beachfront');
assert.throws(()=>parseRoomBackup(serializeRoom({...state,environment:{...state.environment,crtColor:'coastal'}})),'unowned exclusive color cannot be imported');
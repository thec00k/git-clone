import assert from 'node:assert/strict';
import {validateCardGlb} from '../src/lib/cardBinders.ts';
import {parseRoomBackup,serializeRoom} from '../src/lib/roomBackup.ts';
export function cardFixture(edit=j=>j){
 const json=edit({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.315,-.44,0],max:[.315,.44,0]}]});
 const text=JSON.stringify(json),padded=text+' '.repeat((4-text.length%4)%4);const data=Buffer.alloc(12+8+padded.length+8+36);data.writeUInt32LE(0x46546c67,0);data.writeUInt32LE(2,4);data.writeUInt32LE(data.length,8);data.writeUInt32LE(padded.length,12);data.writeUInt32LE(0x4e4f534a,16);data.write(padded,20);const bin=20+padded.length;data.writeUInt32LE(36,bin);data.writeUInt32LE(0x004e4942,bin+4);[-.315,-.44,0,.315,-.44,0,0,.44,0].forEach((v,i)=>data.writeFloatLE(v,bin+8+i*4));return data;
}
const array=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
validateCardGlb(array(cardFixture()));
for(const edit of [j=>({...j,images:[{uri:'https://example.com/track'}]}),j=>({...j,nodes:[{children:[0]}]}),j=>({...j,accessors:[{count:150003}]}),j=>({...j,extensionsRequired:['KHR_draco_mesh_compression']})])assert.throws(()=>validateCardGlb(array(cardFixture(edit))));
assert.throws(()=>validateCardGlb(new ArrayBuffer(20)));
const state={version:1,profile:{displayName:'Test'},books:[],activeBookId:null,archive:[],archiveTabs:[],pins:[],guestbook:[],notes:[],pinNotes:[],achievements:[],achievementsSeen:[],ownedStickerPacks:[],stamps:0,achievementsAt:{},receipts:{},progress:{visitedAtNight:false,previewedAsVisitor:false,completedTour:false},environment:{timeMode:'day',season:'autumn',weather:'clear',musicProvider:'ambient',lampOn:true,ceilingOn:true,shelfLit:true,musicOn:false,pinsLocked:false,volume:.5,ambienceVolume:.4,displayCaseLit:false},cardBinders:[{id:'b',title:'Cards',color:'#405c49',cards:[{id:'c',title:'Scan',source:'imported-scan',finish:'paper',modelSrc:'data:model/gltf-binary;base64,'+cardFixture().toString('base64')}]}]};
assert.deepEqual(parseRoomBackup(serializeRoom(state)),state);
const bad=structuredClone(state);bad.cardBinders[0].cards[0].modelSrc='https://example.com/card.glb';assert.throws(()=>parseRoomBackup(serializeRoom(bad)));
console.log('PASS card scans: valid embedded GLB and backup round-trip; reject remote assets, cycles, excessive geometry and unsupported compression.');

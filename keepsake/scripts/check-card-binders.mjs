import assert from 'node:assert/strict';
import {binderCardAt,binderSpreadCount,cardsWithPositions,placeBinderCards,validateCardGlb} from '../src/lib/cardBinders.ts';
import {cardMetadataReference} from '../src/lib/cardMetadata.ts';
import {nftAssetsFromDas} from '../src/lib/solanaWalletNfts.ts';
import {parseRoomBackup,serializeRoom} from '../src/lib/roomBackup.ts';
export function cardFixture(edit=j=>j){
 const json=edit({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.315,-.44,0],max:[.315,.44,0]}]});
 const text=JSON.stringify(json),padded=text+' '.repeat((4-text.length%4)%4);const data=Buffer.alloc(12+8+padded.length+8+36);data.writeUInt32LE(0x46546c67,0);data.writeUInt32LE(2,4);data.writeUInt32LE(data.length,8);data.writeUInt32LE(padded.length,12);data.writeUInt32LE(0x4e4f534a,16);data.write(padded,20);const bin=20+padded.length;data.writeUInt32LE(36,bin);data.writeUInt32LE(0x004e4942,bin+4);[-.315,-.44,0,.315,-.44,0,0,.44,0].forEach((v,i)=>data.writeFloatLE(v,bin+8+i*4));return data;
}
const array=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
validateCardGlb(array(cardFixture()));
for(const edit of [j=>({...j,images:[{uri:'https://example.com/track'}]}),j=>({...j,nodes:[{children:[0]}]}),j=>({...j,accessors:[{count:150003}]}),j=>({...j,extensionsRequired:['KHR_draco_mesh_compression']})])assert.throws(()=>validateCardGlb(array(cardFixture(edit))));
assert.throws(()=>validateCardGlb(new ArrayBuffer(20)));
const oldCards=[{id:'one',title:'One',source:'image',finish:'paper'},{id:'two',title:'Two',source:'image',finish:'paper'}];
assert.deepEqual(cardsWithPositions(oldCards).map(card=>card.position),[0,1]);
const placed=placeBinderCards(oldCards,[{id:'three',title:'Three',source:'image',finish:'paper'}],7);
assert.equal(binderCardAt(placed,7)?.id,'three');
const withoutTwo=placed.filter(card=>card.id!=='two');assert.equal(binderCardAt(withoutTwo,0)?.id,'one');assert.equal(binderCardAt(withoutTwo,1),undefined);
const restored=placeBinderCards(withoutTwo,[{...oldCards[1],position:1}],1);assert.equal(binderCardAt(restored,1)?.id,'two');assert.equal(binderSpreadCount(placeBinderCards(restored,[{id:'late',title:'Late',source:'image',finish:'paper'}],36)),3);
const state={version:1,profile:{displayName:'Test'},books:[],activeBookId:null,deskBinderId:'b',archive:[],archiveTabs:[],pins:[],guestbook:[],notes:[],pinNotes:[],achievements:[],achievementsSeen:[],ownedStickerPacks:[],stamps:0,achievementsAt:{},receipts:{},progress:{visitedAtNight:false,previewedAsVisitor:false,completedTour:false},environment:{timeMode:'day',season:'autumn',weather:'clear',musicProvider:'ambient',lampOn:true,ceilingOn:true,shelfLit:true,musicOn:false,pinsLocked:false,volume:.5,ambienceVolume:.4,displayCaseLit:false},cardBinders:[{id:'b',title:'Cards',color:'#405c49',cards:[{id:'c',title:'Scan',source:'imported-scan',finish:'paper',modelSrc:'data:model/gltf-binary;base64,'+cardFixture().toString('base64')}]}]};
assert.deepEqual(parseRoomBackup(serializeRoom(state)),state);
const bad=structuredClone(state);bad.cardBinders[0].cards[0].modelSrc='https://example.com/card.glb';assert.throws(()=>parseRoomBackup(serializeRoom(bad)));
const missingDeskBinder=structuredClone(state);missingDeskBinder.deskBinderId='missing';assert.throws(()=>parseRoomBackup(serializeRoom(missingDeskBinder)));
assert.deepEqual(cardMetadataReference({name:'Card One',image:'ipfs://bafy/card.png'}),{title:'Card One',image:'https://ipfs.io/ipfs/bafy/card.png'});
assert.equal(cardMetadataReference({symbol:'TWO',properties:{files:[{uri:'https://cdn.example/card.webp'}]}}).image,'https://cdn.example/card.webp');
assert.throws(()=>cardMetadataReference({image:'http://127.0.0.1/private.png'}));
assert.deepEqual(nftAssetsFromDas([{id:'mint-one',content:{metadata:{name:'Wallet Card'},links:{image:'ipfs://bafy/wallet.png'}}}]),[{id:'mint-one',title:'Wallet Card',image:'https://ipfs.io/ipfs/bafy/wallet.png',collection:undefined}]);
assert.deepEqual(nftAssetsFromDas([{id:'no-art',content:{metadata:{name:'Token'}}},{id:'private-art',content:{links:{image:'http://localhost/secret.png'}}}]),[]);
console.log('PASS card scans: valid embedded GLB and backup round-trip; reject remote assets, cycles, excessive geometry and unsupported compression.');

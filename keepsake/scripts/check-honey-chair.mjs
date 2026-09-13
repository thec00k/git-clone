import assert from 'node:assert/strict';
import fs from 'node:fs';
const file=fs.readFileSync(new URL('../public/room/furniture/chair-3.glb',import.meta.url));
const jsonLength=file.readUInt32LE(12),g=JSON.parse(file.subarray(20,20+jsonLength)),bin=file.subarray(28+jsonLength);
const node=g.nodes.find(n=>n.name==='Honey chair back');assert.ok(node);
function read(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],width=a.type==='VEC3'?3:1,bytes={5123:2,5125:4,5126:4}[a.componentType],method={5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>bin[method]((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??width*bytes)+k*bytes)));}
const p=g.meshes[node.mesh].primitives[0],positions=read(p.attributes.POSITION),indices=read(p.indices).flat();
const keys=positions.map(v=>v.map(x=>Math.round(x*100000)).join(',')),edges=new Map();let volume=0;
for(let i=0;i<indices.length;i+=3){
 const ids=indices.slice(i,i+3),[a,b,c]=ids.map(j=>positions[j]);
 volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
 const triangle=ids.map(j=>keys[j]);if(new Set(triangle).size<3)continue;
 for(let j=0;j<3;j++){const key=[triangle[j],triangle[(j+1)%3]].sort().join('|');edges.set(key,(edges.get(key)??0)+1);}
}
assert.equal([...edges.values()].filter(n=>n===1).length,0,'Exported back has no open boundary edges');
assert.ok(Math.abs(volume)>.008,'Export includes padded volume, not just the curved surface');
assert.ok(g.nodes.some(n=>n.name==='Seat_Anchor')&&g.nodes.some(n=>n.name==='Floor_Anchor'));
console.log(`PASS Honey chair: closed exported back, ${(Math.abs(volume)*1000).toFixed(2)} litres of padding, seat/floor anchors retained.`);

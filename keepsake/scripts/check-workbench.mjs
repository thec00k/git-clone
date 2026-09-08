import assert from 'node:assert/strict';
import fs from 'node:fs';
import {transitionWorkbench,pageTurnWeights} from '../src/lib/workbench.ts';
import {pointInQuad} from '../src/lib/pageCoordinates.ts';
import {motionFactor,MOTION} from '../src/lib/motion.ts';
assert.equal(motionFactor(10,MOTION.drawer),motionFactor(.05,MOTION.drawer),'Returning to the tab caps furniture motion');
assert.equal(motionFactor(.016,MOTION.drawer,true),1,'Reduced motion settles immediately');
assert.equal(motionFactor(-1,MOTION.drawer),0);

let state='room';
for(const [event,expected] of [['inspect','arriving'],['inspect','arriving'],['open','arriving'],['settled','cover'],['open','opening'],['open','opening'],['settled','editing'],['close','closing'],['open','closing'],['settled','cover'],['leave','leaving'],['settled','room']]){
  state=transitionWorkbench(state,event);assert.equal(state,expected);
}
assert.equal(transitionWorkbench('opening','leave'),'closing','Cancel opening closes safely');
assert.deepEqual(pageTurnWeights(0),[0,0,0,0]);assert.deepEqual(pageTurnWeights(1),[0,0,0,1]);
for(let i=0;i<=100;i++)assert.ok(pageTurnWeights(i/100).reduce((a,b)=>a+b,0)<=1.00001);

const corners=[{x:100,y:80},{x:700,y:80},{x:850,y:680},{x:0,y:680}];
for(let v=0;v<=1;v+=.1)for(let u=0;u<=1;u+=.1){
  // Independent projective construction: top/bottom widths differ.
  const h=600/850-1;
  const screen={x:(600*u-100*v+100)/(h*v+1),y:((680*(h+1)-80)*v+80)/(h*v+1)};
  const result=pointInQuad(screen,corners);
  assert.ok(Math.abs(result.x-u*100)<1e-6&&Math.abs(result.y-v*100)<1e-6,'Perspective mapping preserves cursor positions throughout the page');
}
corners.forEach((point,i)=>{
  const result=pointInQuad(point,corners);const expected=[[0,0],[100,0],[100,100],[0,100]][i];
  assert.ok(Math.abs(result.x-expected[0])<1e-6&&Math.abs(result.y-expected[1])<1e-6);
});
const center=pointInQuad({x:400,y:80},corners);assert.ok(Math.abs(center.x-50)<1e-6&&Math.abs(center.y)<1e-6);
assert.equal(pointInQuad({x:0,y:0},Array(4).fill({x:0,y:0})),null);

const file=fs.readFileSync(new URL('../public/room/shared/scrapbook.glb',import.meta.url));
const length=file.readUInt32LE(12);const gltf=JSON.parse(file.subarray(20,20+length).toString());
assert.ok(gltf.nodes.some(n=>n.name==='Book_Cover_Hinge'));
assert.ok(gltf.animations.some(a=>a.name==='OpenBook'));
const leaf=gltf.meshes.find(m=>m.name==='Flexible_leaf_mesh');assert.ok(leaf);
assert.equal(leaf.primitives.length,2,'Independent front/back page content');
for(const primitive of leaf.primitives)assert.equal(primitive.targets.length,4);
assert.ok(file.length<1024*1024,'Shared animated book stays below 1 MiB');
console.log('PASS workbench cancellation, repeat-click guards, page coordinate mapping and authored GLB curl targets.');

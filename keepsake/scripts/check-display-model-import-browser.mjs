import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{}),args:['--enable-unsafe-swiftshader']});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5179';
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/model-import-test.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Display model import test</title>'}));
 await page.goto(base+'/model-import-test.html');
 const result=await page.evaluate(async()=>{
  const {importDisplayModel}=await import('/src/lib/displayModelImport.ts');
  const {validateCardGlb}=await import('/src/lib/cardBinders.ts');
  const {usdZTriangleFile}=await import('/src/tests/displayModelFixture.ts');
  const files=[
   new File(['v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'],'triangle.obj',{type:'text/plain'}),
   new File(['ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n'],'triangle.ply',{type:'application/octet-stream'}),
   new File(['solid triangle\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid triangle\n'],'triangle.stl',{type:'model/stl'}),
   await usdZTriangleFile(),
  ];
  const sizes=[];
  for(const file of files){const glb=await importDisplayModel(file);validateCardGlb(glb);sizes.push(glb.byteLength);}
  return sizes;
 });
 assert.equal(result.length,4);assert.ok(result.every(n=>n>28&&n<5*1024*1024));assert.deepEqual(errors,[]);
 console.log(`PASS display case: OBJ, PLY, STL and USDZ convert locally to validated GLB (${result.join(', ')} bytes).`);
} finally {await browser.close();}

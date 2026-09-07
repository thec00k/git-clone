import assert from "node:assert/strict";
import { fitPhotoRows, photoRows } from "../src/lib/photoRows.ts";
import { playlistEmbedId } from "../src/lib/spotify.ts";
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2 && Math.abs(a.y-b.y)<(a.h+b.h)/2;
for(const ratios of [[1,1,1,1],[1,1,1,1,1,1],[1.7,.6,1.2,.7,1.8,.8]]) {
 const placed=fitPhotoRows(ratios);assert.ok(placed);assert.equal(placed.length,ratios.length);
 placed.forEach((p,i)=>{assert.ok(p.x-p.w/2>=5 && p.x+p.w/2<=95 && p.y-p.h/2>=5 && p.y+p.h/2<=95);placed.slice(i+1).forEach(q=>assert.equal(overlap(p,q),false));});
 assert.equal(placed[0].y,placed[1].y);
}
const caption={x:50,y:85,w:80,h:14};
const keptClear=fitPhotoRows([1,1,1,1,1,1],[caption]);
assert.ok(keptClear);keptClear.forEach(p=>assert.equal(overlap(p,caption),false));
assert.equal(fitPhotoRows([1,1],[{x:50,y:50,w:100,h:100}]),null);
const note={id:"note",type:"caption",x:50,y:85,w:80,text:"A memory",fontSize:5,rotation:0,z:8,color:"#000"};
const page={id:"p",elements:[note,...Array.from({length:6},(_,i)=>({id:String(i),type:"photo",x:50,y:50,w:40,src:"/photo.png",frame:"polaroid",rotation:8,z:i}))]};
const result=photoRows(page,[{id:"a",src:"/photo.png",aspect:1}]);
assert.ok(result);assert.equal(result.elements[0],note);assert.equal(result.elements.length,7);assert.equal(page.elements[1].rotation,8);
for(const input of ["spotify:playlist:37i9dQZF1DX7zqr9q1MPG7","https://open.spotify.com/playlist/37i9dQZF1DX7zqr9q1MPG7?si=test","https://open.spotify.com/intl-en/playlist/37i9dQZF1DX7zqr9q1MPG7"]) assert.equal(playlistEmbedId(input),"37i9dQZF1DX7zqr9q1MPG7");
for(const input of ["garbage playlist/abc","https://example.com/playlist/37i9dQZF1DX7zqr9q1MPG7","spotify:track:37i9dQZF1DX7zqr9q1MPG7"])assert.equal(playlistEmbedId(input),null);
console.log("Photo rows: 4/6 photos, mixed aspects, no overlap, preserved notes; Spotify links: valid and invalid inputs passed.");

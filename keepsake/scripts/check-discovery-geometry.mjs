import assert from 'node:assert/strict';
import {bounds,json} from './check-woodland.mjs';
import {PLACES} from '../src/lib/discoveries.ts';
const surfaces={guestbook:'Cozy_Guest_Tabletop',shelf:'ks_shelf_board_0',frame:'Archive_Top',chair:'Cozy_Chair_Cushion',desk:'Desk_Top'};
for(const p of PLACES){
 const b=bounds(surfaces[p.id]);const [x,y,z]=p.position;
 const w=.145/2,h=(p.id==='shelf'?.067:.095)/2,a=p.rotation[2];const dx=Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*h,dz=Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*h;
 assert.ok(x-dx>=b.min.x&&x+dx<=b.max.x&&z-dz>=b.min.z&&z+dz<=b.max.z,`${p.id} stays on its support`);
 assert.ok(y-.0015>=b.max.y-.002&&y-b.max.y<.009,`${p.id} rests at surface height`);
 if(p.id==='shelf')for(const n of json.nodes.filter(n=>/^ks_shelf_book_/.test(n.name))){const book=bounds(n.name);if(book.min.y<y&&book.max.y>y)assert.ok(z-dz>book.max.z||z+dz<book.min.z||x-dx>book.max.x||x+dx<book.min.x,`Letter clears ${n.name}`);}
}
console.log('All five note locations fit their supports; shelf slip clears decorative books.');
const shelfLetter=PLACES.find(p=>p.id==='shelf');
for(let i=0;i<12;i++){const z=-.69+i*.1015;assert.ok(z+.082/2<shelfLetter.position[2]-.067/2,'Shelf letter also clears a full row of user books');}

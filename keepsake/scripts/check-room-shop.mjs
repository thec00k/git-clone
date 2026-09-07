import assert from 'node:assert/strict';
import {buyRoomGood,placeRoomGood} from '../src/lib/roomShop.ts';
const s={stamps:12};const bought=buyRoomGood(s,'fox');assert.equal(bought.stamps,8);assert.equal(bought.roomDecor.sillItem,'fox');assert.deepEqual(bought.roomDecor.owned,['fox']);assert.equal(buyRoomGood(bought,'fox'),bought,'double purchase never charges twice');assert.equal(buyRoomGood({stamps:0},'fox').stamps,0);assert.equal(buyRoomGood(s,'invalid'),s);assert.equal(placeRoomGood(bought,'bird'),bought,'unowned item cannot be placed');const stored=placeRoomGood(bought);assert.equal(stored.roomDecor.sillItem,undefined);assert.deepEqual(stored.roomDecor.owned,['fox']);assert.equal(placeRoomGood(stored,'fox').stamps,8);
console.log('Shop purchases, insufficient funds, duplicate protection, ownership and free re-placement passed.');
import {buyExtra,placePoster} from '../src/lib/roomShop.ts';
const tools=buyExtra({stamps:12},'sparkle-markers');assert.equal(tools.stamps,8);assert.equal(tools.roomDecor.sillItem,undefined);assert.equal(buyExtra(tools,'sparkle-markers'),tools);
const poster=buyExtra(tools,'poster-night');assert.equal(poster.roomDecor.posterItem,'poster-night');assert.equal(poster.stamps,5);assert.equal(placePoster(poster,'fern-stamp'),poster);assert.equal(placeRoomGood(poster,'poster-night'),poster);assert.equal(placePoster(poster).roomDecor.posterItem,undefined);
console.log('Creative extras: permanent unlocks, poster slot and duplicate purchase protection passed.');

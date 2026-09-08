import assert from 'node:assert/strict';
import {canSee,canLeaveBookNote} from '../src/lib/permissions.ts';
import {STICKY_NOTE_MAX} from '../src/types/app.ts';
assert.equal(STICKY_NOTE_MAX,20);
for(const role of ['friend','close'])for(const visibility of ['friends','public']){
 assert.equal(canSee(visibility,role,false),false);
 assert.equal(canSee(visibility,role,true),true);
 assert.equal(canLeaveBookNote(visibility,role,false),false);
 assert.equal(canLeaveBookNote(visibility,role,true),true);
}
for(const role of ['friend','close','public'])assert.equal(canSee('private',role,true),false);
assert.equal(canLeaveBookNote('public','public',true),false);
assert.equal(canLeaveBookNote('public','owner',true),false);
assert.equal(canSee('private','owner',false),true);
assert.equal(canSee('public','public',false),true);
console.log('Friend scrapbook access: opt-in, sharing levels, friend/close-friend roles, public rejection, 20-character limit passed.');

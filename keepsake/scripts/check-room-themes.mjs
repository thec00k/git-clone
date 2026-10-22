import assert from 'node:assert/strict';
import {switchRoomTheme, ownsRoomTheme, normalizeLegacyRooms} from '../src/lib/roomThemes.ts';
import {parseRoomBackup, serializeRoom} from '../src/lib/roomBackup.ts';
import {freshState} from './fixtures/room-state.mjs';
const state = freshState();
const coast = switchRoomTheme(state, 'beachfront');
assert.equal(coast.environment.roomTheme, 'beachfront');
for (const key of [
  'books',
  'archive',
  'pins',
  'guestbook',
  'notes',
  'achievements',
  'activeBookId',
  'stamps',
])
  assert.deepEqual(coast[key], state[key], key + ' survives switching');
assert.equal(coast.roomDecor.sillItem, 'fox', 'first visit brings current items');
const changed = {...coast, roomDecor: {...coast.roomDecor, sillItem: 'bird', posterItem: undefined}};
const forest = switchRoomTheme(changed, 'woodland');
assert.equal(forest.roomDecor.sillItem, 'fox');
assert.equal(forest.roomDecor.posterItem, 'poster-night');
const restored = parseRoomBackup(serializeRoom(forest));
const returned = switchRoomTheme(restored, 'beachfront');
assert.equal(returned.roomDecor.sillItem, 'bird');
assert.equal(
  returned.roomDecor.posterItem,
  undefined,
  'an empty saved wall stays empty after JSON round trip',
);
assert.equal(switchRoomTheme(returned, 'beachfront'), returned, 'reselecting never mutates or charges');
assert.equal(switchRoomTheme(state, 'invalid'), state);
for (const change of [
  s => (s.environment.roomTheme = 'invalid'),
  s => (s.roomDecor.layouts = {beachfront: {sillItem: 'unowned'}}),
  s => (s.roomDecor.layouts = {woodland: {posterItem: 'fox'}}),
]) {
  const s = structuredClone(state);
  change(s);
  assert.throws(() => parseRoomBackup(serializeRoom(s)));
}
console.log(
  'Room switching preserves memories and currency, restores per-room decor, round-trips backups, and rejects invalid themes/items.',
);
const closedWindow = {...coast, environment: {...coast.environment, coastalWindowOpen: false}};
assert.equal(
  parseRoomBackup(serializeRoom(closedWindow)).environment.coastalWindowOpen,
  false,
  'Closed window survives a room backup',
);
assert.equal(
  switchRoomTheme(switchRoomTheme(closedWindow, 'woodland'), 'beachfront').environment.coastalWindowOpen,
  false,
  'Window preference survives switching rooms',
);
assert.throws(
  () =>
    parseRoomBackup(
      serializeRoom({
        ...closedWindow,
        environment: {...closedWindow.environment, coastalWindowOpen: 'closed'},
      }),
    ),
  'Window preference must be boolean',
);

assert.equal(ownsRoomTheme(state, 'beachfront'), true, 'rooms are freely swappable');
assert.equal(coast.ownedRoomThemes, undefined, 'switching no longer records ownership');
assert.equal(coast.environment.crtColor, 'coastal');
assert.equal(forest.environment.crtColor, 'green', 'Woodland restores its screen preset');
assert.equal(
  parseRoomBackup(serializeRoom({...state, environment: {...state.environment, crtColor: 'coastal'}}))
    .environment.crtColor,
  'coastal',
);
for (const legacy of ['classic', 'snowy-mountain'])
  assert.equal(
    parseRoomBackup(serializeRoom({...state, environment: {...state.environment, roomTheme: legacy}}))
      .environment.roomTheme,
    'woodland',
    'retired room ids fall back to Woodland',
  );

const neon = switchRoomTheme(forest, 'cyberpunk');
assert.equal(neon.environment.roomTheme, 'cyberpunk');
const snowyNeon = {...neon, environment: {...neon.environment, weather: 'snow'}};
assert.equal(
  switchRoomTheme(switchRoomTheme(snowyNeon, 'woodland'), 'cyberpunk').environment.weather,
  'snow',
  'Window weather follows the user across every room',
);
const neonDecor = {
  ...neon,
  roomDecor: {...neon.roomDecor, owned: [...neon.roomDecor.owned, 'holo-cat'], sillItem: 'holo-cat'},
  environment: {...neon.environment, crtColor: 'pink'},
};
const neonRestored = switchRoomTheme(
  parseRoomBackup(serializeRoom(switchRoomTheme(neonDecor, 'woodland'))),
  'cyberpunk',
);
assert.equal(neonRestored.roomDecor.sillItem, 'holo-cat');
assert.equal(neonRestored.environment.crtColor, 'pink');
assert.deepEqual(neonRestored.books, state.books);
console.log('Neon City hologram and CRT preferences survive room switching and backup.');
const sky = switchRoomTheme(neonDecor, 'sky-castle');
assert.equal(sky.environment.roomTheme, 'sky-castle');
const memoryKeys = Object.keys(neonDecor).filter(
  k => !['environment', 'roomDecor', 'ownedRoomThemes'].includes(k),
);
for (const key of memoryKeys) assert.deepEqual(sky[key], neonDecor[key], key + ' survives Sky Castle');
for (const room of ['woodland', 'beachfront', 'cyberpunk']) {
  const returned = switchRoomTheme(parseRoomBackup(serializeRoom(switchRoomTheme(sky, room))), 'sky-castle');
  for (const key of memoryKeys)
    assert.deepEqual(returned[key], sky[key], key + ' survives ' + room + ' round trip');
  assert.equal(returned.environment.roomTheme, 'sky-castle');
}
assert.equal(switchRoomTheme(sky, 'sky-castle'), sky, 'Sky Castle reselection is a no-op');
const skySave = structuredClone(sky);
normalizeLegacyRooms(skySave);
assert.equal(
  skySave.environment.roomTheme,
  'sky-castle',
  'a saved Sky Castle room is no longer sent to Woodland',
);
console.log('Sky Castle preserves all memory fields through every existing room and backup.');
const cloudRoom = {
  ...neonRestored,
  environment: {...neonRestored.environment, cloudPalette: 'multicolor', capsuleFinish: 'metal'},
};
const cloudBackup = parseRoomBackup(serializeRoom(cloudRoom));
assert.equal(cloudBackup.environment.cloudPalette, 'multicolor');
assert.equal(cloudBackup.environment.capsuleFinish, 'metal');
assert.throws(() =>
  parseRoomBackup(
    serializeRoom({...cloudRoom, environment: {...cloudRoom.environment, cloudPalette: 'invalid'}}),
  ),
);
assert.throws(() =>
  parseRoomBackup(
    serializeRoom({...cloudRoom, environment: {...cloudRoom.environment, capsuleFinish: 'invalid'}}),
  ),
);
{
  // Backups of saves from retired rooms (classic, Snowy Mountain) must still restore.
  const legacy = structuredClone(state);
  legacy.ownedRoomThemes = ['woodland', 'snowy-mountain'];
  legacy.roomDecor = {
    ...(legacy.roomDecor ?? {owned: []}),
    layouts: {'snowy-mountain': {sillItem: undefined}, woodland: {}},
  };
  legacy.environment.roomTheme = 'snowy-mountain';
  const fixed = parseRoomBackup(serializeRoom(legacy));
  assert.equal(fixed.environment.roomTheme, 'woodland');
  assert.deepEqual(fixed.ownedRoomThemes, ['woodland']);
  assert.equal(fixed.roomDecor.layouts['snowy-mountain'], undefined);
  console.log('Legacy room ids, ownership lists and layouts are normalised so old backups restore.');
}

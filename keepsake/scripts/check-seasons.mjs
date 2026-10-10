import assert from 'node:assert/strict';
import {HOLIDAY_IDS, easterSunday, hemisphereFromTimeZone, holidayOn, holidayWindows, msUntilNextDay, resolveSeasonal, seasonForMonth, withSeason} from '../src/lib/seasons.ts';
import {TIDY_ROOM} from '../src/types/app.ts';
import {parseRoomBackup, serializeRoom} from '../src/lib/roomBackup.ts';

const on = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0); // local noon, month 1-12

// Easter, against published dates.
for (const [year, month, day] of [[2024, 3, 31], [2025, 4, 20], [2026, 4, 5], [2027, 3, 28], [2028, 4, 16], [2029, 4, 1], [2030, 4, 21], [2038, 4, 25]]) {
  const e = easterSunday(year);
  assert.deepEqual([e.month + 1, e.day], [month, day], `Easter ${year}`);
}

// Meteorological seasons, both hemispheres, at the month boundaries.
const north = [['winter', 12], ['winter', 1], ['winter', 2], ['spring', 3], ['spring', 5], ['summer', 6], ['summer', 8], ['autumn', 9], ['autumn', 11]];
for (const [season, month] of north) {
  assert.equal(seasonForMonth(month - 1, 'north'), season, `north month ${month}`);
  const opposite = {winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring'}[season];
  assert.equal(seasonForMonth(month - 1, 'south'), opposite, `south month ${month}`);
}

// Holiday windows: edges are inclusive, outside is empty.
const holiday = (y, m, d, off) => holidayOn(on(y, m, d), off);
assert.equal(holiday(2026, 2, 6), null); assert.equal(holiday(2026, 2, 7), 'valentines');
assert.equal(holiday(2026, 2, 15), 'valentines'); assert.equal(holiday(2026, 2, 16), null);
assert.equal(holiday(2026, 3, 28), null); assert.equal(holiday(2026, 3, 29), 'easter'); // Palm Sunday
assert.equal(holiday(2026, 4, 5), 'easter'); assert.equal(holiday(2026, 4, 6), 'easter'); assert.equal(holiday(2026, 4, 7), null);
assert.equal(holiday(2027, 3, 21), 'easter', 'early Easter still has a window'); // 2027-03-28 minus 7
assert.equal(holiday(2026, 6, 30), null); assert.equal(holiday(2026, 7, 1), 'independence-day');
assert.equal(holiday(2026, 7, 4), 'independence-day'); assert.equal(holiday(2026, 7, 5), 'independence-day'); assert.equal(holiday(2026, 7, 6), null);
assert.equal(holiday(2026, 10, 17), null); assert.equal(holiday(2026, 10, 18), 'halloween');
assert.equal(holiday(2026, 10, 31), 'halloween'); assert.equal(holiday(2026, 11, 1), 'halloween'); assert.equal(holiday(2026, 11, 2), null);
assert.equal(holiday(2026, 11, 30), null); assert.equal(holiday(2026, 12, 1), 'christmas');
assert.equal(holiday(2026, 12, 25), 'christmas'); assert.equal(holiday(2026, 12, 26), 'christmas'); assert.equal(holiday(2026, 12, 27), null);
assert.equal(holiday(2026, 5, 15), null); assert.equal(holiday(2026, 9, 15), null);

// Windows never overlap, in any year a room could plausibly live through.
for (let year = 2000; year <= 2100; year++) {
  const w = holidayWindows(year);
  const sorted = HOLIDAY_IDS.map(id => w[id]).sort((a, b) => a[0] - b[0]);
  sorted.forEach(([start, end], i) => { assert.ok(start <= end, `${year} window is ordered`); if (i) assert.ok(start > sorted[i - 1][1], `${year} windows overlap`); });
}

// Switching a holiday off.
assert.equal(holiday(2026, 12, 25, ['christmas']), null);
assert.equal(holiday(2026, 12, 25, ['halloween']), 'christmas');

// Auto mode follows the date and the hemisphere; holidays ignore hemisphere.
const auto = {season: 'autumn'};
assert.deepEqual(resolveSeasonal({...auto, hemisphere: 'north'}, on(2026, 12, 25)), {season: 'winter', holiday: 'christmas', hemisphere: 'north', automatic: true});
assert.deepEqual(resolveSeasonal({...auto, hemisphere: 'south'}, on(2026, 12, 25)), {season: 'summer', holiday: 'christmas', hemisphere: 'south', automatic: true});
assert.equal(resolveSeasonal({...auto, hemisphere: 'south'}, on(2026, 7, 10)).season, 'winter');
assert.equal(resolveSeasonal({...auto, seasonMode: 'auto', hemisphere: 'north'}, on(2026, 10, 10)).season, 'autumn');

// "auto" hemisphere is a guess from the time zone, never a location lookup.
assert.equal(hemisphereFromTimeZone('Australia/Sydney'), 'south'); assert.equal(hemisphereFromTimeZone('Pacific/Auckland'), 'south');
assert.equal(hemisphereFromTimeZone('America/Sao_Paulo'), 'south'); assert.equal(hemisphereFromTimeZone('Africa/Johannesburg'), 'south');
assert.equal(hemisphereFromTimeZone('America/Argentina/Buenos_Aires'), 'south');
assert.equal(hemisphereFromTimeZone('Europe/London'), 'north'); assert.equal(hemisphereFromTimeZone('America/New_York'), 'north');
assert.equal(hemisphereFromTimeZone('Asia/Tokyo'), 'north'); assert.equal(hemisphereFromTimeZone('Indian/Maldives'), 'north');
assert.equal(hemisphereFromTimeZone(undefined), 'north'); assert.equal(hemisphereFromTimeZone('Not/AZone'), 'north');
assert.equal(resolveSeasonal(auto, on(2026, 12, 10), 'Australia/Perth').season, 'summer');
assert.equal(resolveSeasonal({...auto, hemisphere: 'north'}, on(2026, 12, 10), 'Australia/Perth').season, 'winter', 'an explicit choice beats the guess');

// A frozen room stays put: its season, no holiday, whatever the date.
for (const date of [on(2026, 12, 25), on(2026, 10, 31), on(2026, 2, 14)]) {
  assert.deepEqual(resolveSeasonal({season: 'spring', seasonMode: 'fixed', hemisphere: 'south'}, date), {season: 'spring', holiday: null, hemisphere: 'south', automatic: false});
}

// withSeason keeps every other setting and old saves (no new fields) default to auto.
const env = {season: 'autumn', weather: 'snow', lampOn: true};
const seen = withSeason({...env, hemisphere: 'north'}, on(2027, 1, 15));
assert.equal(seen.season, 'winter'); assert.equal(seen.weather, 'snow'); assert.equal(seen.lampOn, true); assert.equal(seen.holiday, null);

// Tidying up must not undo a deliberate choice of season.
assert.ok(!('seasonMode' in TIDY_ROOM) && !('hemisphere' in TIDY_ROOM) && !('holidaysOff' in TIDY_ROOM));

// The room can refresh itself overnight.
const wait = msUntilNextDay(new Date(2026, 9, 10, 23, 59, 0));
assert.ok(wait > 0 && wait <= 90_000, `wait ${wait}`);
assert.ok(msUntilNextDay(new Date(2026, 9, 10, 0, 0, 1)) <= 24 * 3600 * 1000 + 5000);

// Backups: old saves (no season fields) still restore; new settings round-trip; junk is refused.
const seed={version:1,profile:{displayName:'Test'},books:[{id:'book',title:'A memory',subtitle:'',coverStyle:'forest',visibility:'private',createdAt:1,updatedAt:1,pages:[{id:'p1',elements:[]}]}],activeBookId:'book',archive:[],archiveTabs:[],pins:[],guestbook:[],notes:[],pinNotes:[],achievements:[],achievementsSeen:[],ownedStickerPacks:['everyday'],stamps:12,achievementsAt:{},receipts:{},progress:{visitedAtNight:false,previewedAsVisitor:false,completedTour:false},environment:{timeMode:'day',season:'autumn',weather:'clear',musicProvider:'ambient',lampOn:true,ceilingOn:true,shelfLit:true,musicOn:false,pinsLocked:false,volume:.5,ambienceVolume:.4,roomQuality:'high'},roomDecor:{owned:['fox','bird','poster-night'],sillItem:'fox',posterItem:'poster-night'}};
assert.equal(parseRoomBackup(serializeRoom(seed)).environment.seasonMode, undefined, 'a plain save stays automatic');
const frozen = {...seed, environment: {...seed.environment, seasonMode: 'fixed', season: 'winter', hemisphere: 'south', holidaysOff: ['easter', 'halloween']}};
assert.deepEqual(parseRoomBackup(serializeRoom(frozen)).environment, frozen.environment);
for (const [name, patch] of [['mode', {seasonMode: 'sometimes'}], ['hemisphere', {hemisphere: 'east'}], ['holiday id', {holidaysOff: ['diwali']}], ['holiday list', {holidaysOff: 'christmas'}], ['too many holidays', {holidaysOff: ['easter', 'easter', 'easter', 'easter', 'easter', 'easter']}]]) {
  assert.throws(() => parseRoomBackup(serializeRoom({...seed, environment: {...seed.environment, ...patch}})), undefined, `rejects bad ${name}`);
}

console.log('PASS seasons: calendar seasons for both hemispheres, five holiday windows (Easter computed), overrides, time-zone guess, frozen rooms.');

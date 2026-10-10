/*
 * The room's calendar: which season it is, and whether a holiday is under way.
 *
 * Pure functions of a date and the user's settings, so the same inputs always
 * give the same room (and the rules can be tested without a browser).
 *
 * - Seasons follow the calendar by default ("auto") and the user's hemisphere.
 *   They can be frozen ("fixed") at any one season.
 * - Hemisphere "auto" is a guess from the device time zone. No location is ever
 *   requested; the user can always set it themselves.
 * - Holidays are cultural, not seasonal, so they do not depend on hemisphere.
 *   A frozen room shows no holiday. Each holiday can be switched off.
 */
import type { Environment, Hemisphere, HolidayId, Season } from "../types/app";

export const SEASONS: readonly Season[] = ["spring", "summer", "autumn", "winter"];
export const HOLIDAY_IDS: readonly HolidayId[] = ["valentines", "easter", "independence-day", "halloween", "christmas"];

export const HOLIDAY_TITLE: Record<HolidayId, string> = {
  valentines: "Valentine's Day",
  easter: "Easter",
  "independence-day": "Fourth of July",
  halloween: "Halloween",
  christmas: "Christmas",
};

export interface SeasonalState {
  season: Season;
  /** The holiday being celebrated today, if any. */
  holiday: HolidayId | null;
  hemisphere: Hemisphere;
  /** True when the season comes from the calendar rather than the user's choice. */
  automatic: boolean;
}

type SeasonSettings = Pick<Environment, "season"> & Partial<Pick<Environment, "seasonMode" | "hemisphere" | "holidaysOff">>;

/** Meteorological seasons, northern hemisphere. Month index 0 = January. */
const NORTH_BY_MONTH: readonly Season[] = [
  "winter", "winter", "spring", "spring", "spring", "summer",
  "summer", "summer", "autumn", "autumn", "autumn", "winter",
];
const OPPOSITE: Record<Season, Season> = { winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" };

export function seasonForMonth(month: number, hemisphere: Hemisphere): Season {
  const north = NORTH_BY_MONTH[((month % 12) + 12) % 12];
  return hemisphere === "north" ? north : OPPOSITE[north];
}

/** Southern-hemisphere IANA zones. Anything not listed is treated as northern. */
const SOUTHERN_ZONE =
  /^(Australia\/|Antarctica\/|Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Norfolk|Noumea|Tahiti|Guadalcanal|Efate|Port_Moresby|Pago_Pago|Rarotonga|Niue|Easter|Galapagos|Marquesas|Gambier)|America\/(Sao_Paulo|Argentina\/|Buenos_Aires|Cordoba|Mendoza|Santiago|Montevideo|Asuncion|La_Paz|Lima|Cuiaba|Campo_Grande|Manaus|Porto_Velho|Rio_Branco|Belem|Fortaleza|Recife|Bahia|Maceio|Araguaina|Santarem|Noronha|Punta_Arenas|Guayaquil|Boa_Vista)|Africa\/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Maseru|Mbabane|Lubumbashi|Blantyre|Luanda|Kinshasa|Dar_es_Salaam|Nairobi|Kigali|Bujumbura|Lilongwe)|Indian\/(Antananarivo|Mauritius|Reunion|Comoro|Mayotte|Chagos|Christmas|Cocos)|Atlantic\/(St_Helena|South_Georgia|Stanley)|Asia\/(Jakarta|Makassar|Dili|Pontianak))/;

export function hemisphereFromTimeZone(timeZone: string | undefined): Hemisphere {
  return timeZone && SOUTHERN_ZONE.test(timeZone) ? "south" : "north";
}

export function deviceTimeZone(): string | undefined {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
}

/** Easter Sunday (Gregorian calendar) as { month: 0-11, day }. Meeus/Jones/Butcher. */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return { month: Math.floor(n / 31) - 1, day: (n % 31) + 1 };
}

/** Whole days since 1970 for a calendar date, immune to daylight-saving shifts. */
const dayNumber = (year: number, month: number, day: number) => Math.floor(Date.UTC(year, month, day) / 86_400_000);

/**
 * The holiday window for each holiday in a given year, as inclusive day numbers.
 * Windows are generous lead-ins so the room is dressed before the day itself.
 */
export function holidayWindows(year: number): Record<HolidayId, [number, number]> {
  const easter = easterSunday(year);
  const easterDay = dayNumber(year, easter.month, easter.day);
  return {
    valentines: [dayNumber(year, 1, 7), dayNumber(year, 1, 15)],
    easter: [easterDay - 7, easterDay + 1],
    "independence-day": [dayNumber(year, 6, 1), dayNumber(year, 6, 5)],
    halloween: [dayNumber(year, 9, 18), dayNumber(year, 10, 1)],
    christmas: [dayNumber(year, 11, 1), dayNumber(year, 11, 26)],
  };
}

export function holidayOn(date: Date, off: readonly HolidayId[] = []): HolidayId | null {
  const today = dayNumber(date.getFullYear(), date.getMonth(), date.getDate());
  const windows = holidayWindows(date.getFullYear());
  return HOLIDAY_IDS.find(id => !off.includes(id) && today >= windows[id][0] && today <= windows[id][1]) ?? null;
}

export function resolveHemisphere(setting: SeasonSettings["hemisphere"], timeZone = deviceTimeZone()): Hemisphere {
  return setting === "north" || setting === "south" ? setting : hemisphereFromTimeZone(timeZone);
}

/** What the room should look like on `now` for these settings. */
export function resolveSeasonal(settings: SeasonSettings, now: Date = new Date(), timeZone?: string): SeasonalState {
  const hemisphere = resolveHemisphere(settings.hemisphere, timeZone);
  if (settings.seasonMode === "fixed") {
    return { season: settings.season, holiday: null, hemisphere, automatic: false };
  }
  return {
    season: seasonForMonth(now.getMonth(), hemisphere),
    holiday: holidayOn(now, settings.holidaysOff),
    hemisphere,
    automatic: true,
  };
}

/** The settings with the season replaced by the one the room should show today. */
export function withSeason<T extends SeasonSettings>(environment: T, now: Date = new Date()): T & { holiday: HolidayId | null } {
  const { season, holiday } = resolveSeasonal(environment, now);
  return { ...environment, season, holiday };
}

/** A key that changes when the room's look can change (the date, ignoring the time). */
export const dayKey = (date: Date = new Date()) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

/** Milliseconds until the next local midnight, so the room can update itself overnight. */
export function msUntilNextDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return Math.max(1_000, next.getTime() - now.getTime());
}

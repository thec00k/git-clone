import type { TimeMode } from "../types/app";

/** Still hours when the window is locked. Lived-in, not on the hour. */
export const CLOCK_STILL: Record<"day" | "dusk" | "night", { h: number; m: number }> = {
  day: { h: 10, m: 7 },
  dusk: { h: 18, m: 41 },
  night: { h: 22, m: 8 },
};

export function clockFromMode(timeMode: TimeMode, now: Date = new Date()): { h: number; m: number; live: boolean } {
  if (timeMode === "day") return { ...CLOCK_STILL.day, live: false };
  if (timeMode === "dusk") return { ...CLOCK_STILL.dusk, live: false };
  if (timeMode === "night") return { ...CLOCK_STILL.night, live: false };
  return { h: now.getHours(), m: now.getMinutes(), live: true };
}

export function clockLabel(h: number, m: number): string {
  const hh = ((h % 24) + 24) % 24;
  const mm = ((m % 60) + 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Cosmetic room ageing (owner decision, October 2026): a room you haven't tidied gathers a little dust.
 * It is purely visual, never touches memories, stamps or books, and "Tidy up" at the door resets it.
 * Levels are coarse on purpose so the room changes in noticeable steps rather than creeping.
 */
export const DAY_MS = 86_400_000;
export type RoomAgeLevel = 0 | 1 | 2 | 3;
export function roomAgeLevel(tidiedAt: number | undefined, now: number): RoomAgeLevel {
  if (tidiedAt === undefined || !Number.isFinite(tidiedAt) || tidiedAt > now) return 0;
  const days = (now - tidiedAt) / DAY_MS;
  return days < 3 ? 0 : days < 10 ? 1 : days < 25 ? 2 : 3;
}

import type {AppState} from '../types/app';
/**
 * Daily stamps. Deliberately gentle (owner decision, October 2026):
 * a small fixed amount per calendar day you open the room, a cap on the balance, no streak counter or
 * multiplier, nothing taken away for missing days, and nothing shown to other people.
 * Local-only for now; once accounts exist the server must own this grant (a device clock is editable).
 */
export const STARTING_STAMPS = 30;
export const DAILY_STAMPS = 3;
export const STAMP_CAP = 100;
export function localDayKey(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
/** Grants today's stamps once. Never reduces a balance, even one above the cap. Returns the same object when nothing changes. */
export function claimDailyStamps(state: AppState, now: Date): AppState {
  const today = localDayKey(now);
  if (state.stampsClaimedOn === today) return state;
  const room = Math.max(0, STAMP_CAP - state.stamps);
  return {...state, stamps: state.stamps + Math.min(DAILY_STAMPS, room), stampsClaimedOn: today};
}

import type {AppState} from '../types/app';
export type RoomThemeId = 'woodland' | 'beachfront' | 'cyberpunk';
/** Rooms are freely swappable (owner decision, October 2026): nothing is bought or unlocked. Kept so callers need no change. */
export function ownsRoomTheme(_state: AppState, _room: RoomThemeId): boolean {
  return true;
}
/** Room ids that no longer exist fall back to Woodland; users' memories are unaffected. */
export const LEGACY_ROOM_IDS = ['classic','snowy-mountain','snowy','sky-castle'];
export function switchRoomTheme(state: AppState, next: RoomThemeId): AppState {
  if (!['woodland','beachfront','cyberpunk'].includes(next)) return state;
  const current = state.environment.roomTheme ?? 'woodland';
  if (current === next) return state;
  const decor = state.roomDecor ?? {owned: []};
  const layouts = {...decor.layouts, [current]: {sillItem: decor.sillItem, posterItem: decor.posterItem, crtColor: state.environment.crtColor ?? 'green'}};
  const target = layouts[next] ?? {sillItem: decor.sillItem, posterItem: decor.posterItem==='poster-snake'&&next!=='cyberpunk'?undefined:decor.posterItem, crtColor: next === 'beachfront' ? 'coastal' as const : next === 'cyberpunk' ? 'blue' as const : 'green' as const};
  return {...state, environment: {...state.environment, roomTheme: next, crtColor: target.crtColor ?? (next === 'beachfront' ? 'coastal' : next === 'cyberpunk' ? 'blue' : 'green')}, roomDecor: {...decor, sillItem: target.sillItem, posterItem: target.posterItem, layouts}};
}

const LIVE_ROOMS = ['woodland','beachfront','cyberpunk'];
/** Rewrites retired room ids (in the saved theme, ownership list and per-room layouts) so old saves load and their backups restore. Mutates a plain parsed state. */
export function normalizeLegacyRooms(state: any): void {
  const env = state?.environment;
  if (env && LEGACY_ROOM_IDS.includes(env.roomTheme)) env.roomTheme = 'woodland';
  if (Array.isArray(state?.ownedRoomThemes)) state.ownedRoomThemes = [...new Set(state.ownedRoomThemes.filter((id: unknown) => LIVE_ROOMS.includes(id as string)))];
  const layouts = state?.roomDecor?.layouts;
  if (layouts && typeof layouts === 'object') for (const key of Object.keys(layouts)) if (!LIVE_ROOMS.includes(key)) delete layouts[key];
}

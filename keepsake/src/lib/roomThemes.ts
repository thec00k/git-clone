import type {AppState} from '../types/app';
export type RoomThemeId = 'woodland' | 'beachfront';
export function ownsRoomTheme(state: AppState, room: RoomThemeId): boolean {
  return room === 'woodland' || (state.ownedRoomThemes?.includes(room) ?? state.environment.roomTheme === room);
}
export function switchRoomTheme(state: AppState, next: RoomThemeId): AppState {
  if (!['woodland','beachfront'].includes(next)) return state;
  const current = state.environment.roomTheme ?? 'woodland';
  if (current === next) return state;
  const decor = state.roomDecor ?? {owned: []};
  const layouts = {...decor.layouts, [current]: {sillItem: decor.sillItem, posterItem: decor.posterItem, crtColor: state.environment.crtColor ?? 'green'}};
  const target = layouts[next] ?? {sillItem: decor.sillItem, posterItem: decor.posterItem, crtColor: next === 'beachfront' ? 'coastal' as const : 'green' as const};
  const ownedRoomThemes = [...new Set<RoomThemeId>(['woodland',...(state.ownedRoomThemes??[]),current,next])];
  return {...state, ownedRoomThemes, environment: {...state.environment, roomTheme: next, crtColor: target.crtColor ?? (next === 'beachfront' ? 'coastal' : 'green')}, roomDecor: {...decor, sillItem: target.sillItem, posterItem: target.posterItem, layouts}};
}

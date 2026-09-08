import {useSyncExternalStore} from 'react';
import {roomDeviceTier, roomRenderProfile, type RoomQuality} from './themes';
function subscribe(changed: () => void) {
  window.addEventListener('resize',changed);
  return () => window.removeEventListener('resize',changed);
}
const readDevice = () => roomDeviceTier(window.innerWidth);
export function useRoomRenderProfile(quality: RoomQuality) {
  const device = useSyncExternalStore(subscribe,readDevice,()=> 'desktop' as const);
  return roomRenderProfile(quality,device);
}

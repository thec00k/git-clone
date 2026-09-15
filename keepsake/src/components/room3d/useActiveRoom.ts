import {useApp} from '../../store/appStore';
import {beachfrontRoom, classicRoom, woodlandRoom,cyberpunkRoom,snowyMountainRoom} from './themes';
import {useMemo} from 'react';
import {roomAssets} from '../../generated/roomAssets';
export function useActiveRoom() {
  const {environment} = useApp();
  const classic = new URLSearchParams(window.location.search).get('theme') === 'classic';
  const room = environment.roomTheme === 'snowy-mountain' ? 'snowy-mountain' : environment.roomTheme === 'cyberpunk' ? 'cyberpunk' : environment.roomTheme === 'beachfront' ? 'beachfront' : 'woodland';
  const quality = environment.roomQuality ?? 'balanced';
  return useMemo(() => classic ? classicRoom : {
    ...(room === 'snowy-mountain' ? snowyMountainRoom : room === 'cyberpunk' ? cyberpunkRoom : room === 'beachfront' ? beachfrontRoom : woodlandRoom),
    asset: roomAssets[room][quality],
  }, [classic,room,quality]);
}

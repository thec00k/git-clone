import {useApp} from '../../store/appStore';
import {beachfrontRoom, classicRoom, woodlandRoom} from './themes';
import {useMemo} from 'react';
import {roomAssets} from '../../generated/roomAssets';
export function useActiveRoom() {
  const {environment} = useApp();
  const classic = new URLSearchParams(window.location.search).get('theme') === 'classic';
  const room = environment.roomTheme === 'beachfront' ? 'beachfront' : 'woodland';
  const quality = environment.roomQuality ?? 'balanced';
  return useMemo(() => classic ? classicRoom : {
    ...(room === 'beachfront' ? beachfrontRoom : woodlandRoom),
    asset: roomAssets[room][quality],
  }, [classic,room,quality]);
}

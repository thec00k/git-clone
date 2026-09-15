import {useApp} from '../../store/appStore';
import {classicRoom,roomThemes} from './themes';
import {useMemo} from 'react';
import {roomAssets} from '../../generated/roomAssets';
export function useActiveRoom() {
  const {environment} = useApp();
  const classic = new URLSearchParams(window.location.search).get('theme') === 'classic';
  const room = environment.roomTheme && environment.roomTheme in roomAssets ? environment.roomTheme : 'woodland';
  const quality = environment.roomQuality ?? 'balanced';
  return useMemo(() => classic ? classicRoom : {
    ...roomThemes[room],
    asset: roomAssets[room][quality],
  }, [classic,room,quality]);
}

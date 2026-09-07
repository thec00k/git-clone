import {useApp} from '../../store/appStore';
import {beachfrontRoom, classicRoom, woodlandRoom} from './themes';
export function useActiveRoom() {
  const {environment} = useApp();
  if (new URLSearchParams(window.location.search).get('theme') === 'classic') return classicRoom;
  return environment.roomTheme === 'beachfront' ? beachfrontRoom : woodlandRoom;
}

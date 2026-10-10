import {wantsWoodlandStudy,WOODLAND_STUDY_ASSET} from './woodlandStudy';
import {useApp} from '../../store/appStore';
import {beachfrontRoom, woodlandRoom,cyberpunkRoom} from './themes';
import {useMemo} from 'react';
import {roomAssets} from '../../generated/roomAssets';
export function useActiveRoom() {
  const {environment} = useApp();
  const room = environment.roomTheme === 'cyberpunk' ? 'cyberpunk' : environment.roomTheme === 'beachfront' ? 'beachfront' : 'woodland';
  const study = room === 'woodland';
  const review = study && wantsWoodlandStudy(window.location.search);
  const quality = environment.roomQuality ?? 'balanced';
  return useMemo(() => {
    ...(room === 'cyberpunk' ? cyberpunkRoom : room === 'beachfront' ? beachfrontRoom : woodlandRoom),
    asset: study ? WOODLAND_STUDY_ASSET : roomAssets[room][quality],
    study,
    review,
    ...(review ? {title:'Woodland composition study'} : {}),
  }, [room,quality,study,review]);
}

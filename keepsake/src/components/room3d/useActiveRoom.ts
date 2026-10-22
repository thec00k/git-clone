import {wantsWoodlandStudy} from './woodlandStudy';
import {useApp} from '../../store/appStore';
import {roomThemes} from './themes';
import {useMemo} from 'react';
import {roomAssets} from '../../generated/roomAssets';
export function useActiveRoom() {
  const {environment} = useApp();
  const room =
    environment.roomTheme && environment.roomTheme in roomThemes ? environment.roomTheme : 'woodland';
  const study = room === 'woodland';
  const review = study && wantsWoodlandStudy(window.location.search);
  const quality = environment.roomQuality ?? 'balanced';
  return useMemo(
    () => ({
      ...roomThemes[room],
      asset: roomAssets[room][quality],
      study,
      review,
      ...(review ? {title: 'Woodland composition study'} : {}),
    }),
    [room, quality, study, review],
  );
}

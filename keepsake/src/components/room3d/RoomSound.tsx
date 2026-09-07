import { useEffect } from 'react';
import type { Environment } from '../../types/app';
import { playRoomSound, startWeather } from '../../lib/audio';
export function RoomSound({environment}:{environment:Environment}){
 useEffect(()=>{
  let stop:(()=>void)|undefined;let lastStep=0;
  const start=()=>{if(!stop)stop=startWeather(environment.weather,environment.ambienceVolume);};
  const walk=(e:KeyboardEvent)=>{if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(document.querySelector('[aria-modal=true]'))return;start();if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown'].includes(e.code)&&performance.now()-lastStep>750){playRoomSound('wood',environment.ambienceVolume);lastStep=performance.now();}};
  window.addEventListener('pointerdown',start);window.addEventListener('keydown',walk);
  return()=>{stop?.();window.removeEventListener('pointerdown',start);window.removeEventListener('keydown',walk);};
 },[environment.weather,environment.ambienceVolume]);
 return null;
}

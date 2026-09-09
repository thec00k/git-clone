import { useEffect,useRef } from 'react';
import type { Environment } from '../../types/app';
import { playRoomSound, startWeather } from '../../lib/audio';
import type {WeatherSound} from '../../lib/audio';
import {soundZoneGain} from '../../lib/memoryAtmosphere';
export function RoomSound({environment,face,reading}:{environment:Environment;face:string;reading:boolean}){
 const activated=useRef(false);
 const controller=useRef<WeatherSound|null>(null);
 const volume=environment.ambienceVolume*(environment.roomTheme==='beachfront'&&environment.coastalWindowOpen===false?.28:1)*soundZoneGain(face,reading,environment.soundGeography===true);
 const volumeRef=useRef(volume);volumeRef.current=volume;
 useEffect(()=>{controller.current?.setVolume(volume);},[volume]);
 useEffect(()=>{
  let stop:(()=>void)|undefined;let lastStep=0;
  const start=()=>{activated.current=true;if(!stop){controller.current=startWeather(environment.roomTheme === "beachfront" && environment.weather === "clear" ? "surf" : environment.weather,volumeRef.current);stop=controller.current;}};
  const walk=(e:KeyboardEvent)=>{if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(document.querySelector('[aria-modal=true]'))return;start();if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown'].includes(e.code)&&performance.now()-lastStep>750){playRoomSound('wood',environment.ambienceVolume);lastStep=performance.now();}};
  window.addEventListener('pointerdown',start);window.addEventListener('keydown',walk);
  if(activated.current)start();
  return()=>{stop?.();controller.current=null;window.removeEventListener('pointerdown',start);window.removeEventListener('keydown',walk);};
 },[environment.weather,environment.ambienceVolume,environment.roomTheme]);
 return null;
}

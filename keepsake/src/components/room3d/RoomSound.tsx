import {useEffect, useRef} from 'react';
import type {Environment} from '../../types/app';
import {playRoomSound, startWeather} from '../../lib/audio';
import type {WeatherSound} from '../../lib/audio';
import {soundZoneGain} from '../../lib/memoryAtmosphere';
import {ignorePageKey} from '../../lib/keyTargets';
export function RoomSound({
  environment,
  face,
  reading,
}: {
  environment: Environment;
  face: string;
  reading: boolean;
}) {
  const activated = useRef(false);
  const controller = useRef<WeatherSound | null>(null);
  const volume =
    environment.ambienceVolume *
    (environment.roomTheme === 'beachfront' && environment.coastalWindowOpen === false ? 0.28 : 1) *
    soundZoneGain(face, reading, environment.soundGeography === true);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const ambienceRef = useRef(environment.ambienceVolume);
  ambienceRef.current = environment.ambienceVolume;
  useEffect(() => {
    controller.current?.setVolume(volume);
  }, [volume]);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let lastStep = 0;
    const start = () => {
      activated.current = true;
      if (!stop) {
        controller.current = startWeather(
          environment.roomTheme === 'beachfront' && environment.weather === 'clear'
            ? 'surf'
            : environment.weather,
          volumeRef.current,
        );
        stop = controller.current;
      }
    };
    const walk = (e: KeyboardEvent) => {
      if (ignorePageKey(e)) return;
      start();
      if (
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown'].includes(e.code) &&
        performance.now() - lastStep > 750
      ) {
        playRoomSound('wood', ambienceRef.current);
        lastStep = performance.now();
      }
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', walk);
    if (activated.current) start();
    return () => {
      stop?.();
      controller.current = null;
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', walk);
    };
    // Volume changes go through setVolume above; restarting the loop here caused dropouts while dragging the slider.
  }, [environment.weather, environment.roomTheme]);
  return null;
}

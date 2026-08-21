import { useEffect } from "react";
import { useApp } from "../store/appStore";
import { setMusic, setVolume } from "../lib/audio";

/** Mounts once; drives the generative ambient pad from room settings. */
export function AmbientAudio() {
  const { environment } = useApp();

  useEffect(() => {
    setMusic(environment.musicOn, environment.volume);
  }, [environment.musicOn, environment.volume]);

  useEffect(() => {
    setVolume(environment.volume);
  }, [environment.volume]);

  useEffect(() => () => setMusic(false, 0), []);

  return null;
}

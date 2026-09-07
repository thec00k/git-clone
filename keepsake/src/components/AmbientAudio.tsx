import { useEffect } from "react";
import { useApp } from "../store/appStore";
import { setMusic, setVolume,preloadPageSound } from "../lib/audio";

/** Mounts once; drives the generative ambient pad from room settings. */
export function AmbientAudio() {
  useEffect(()=>{void preloadPageSound().catch(()=>{});},[]);
  const { environment,setEnvironment } = useApp();
  useEffect(()=>{if(environment.musicProvider==='lofi')setEnvironment({musicProvider:'ambient',musicOn:false});},[environment.musicProvider,setEnvironment]);

  const ambientActive = environment.musicOn && environment.musicProvider === "ambient";

  useEffect(() => {
    setMusic(ambientActive, environment.volume);
  }, [ambientActive, environment.volume]);

  useEffect(() => {
    setVolume(environment.volume);
  }, [environment.volume]);

  useEffect(() => () => setMusic(false, 0), []);

  return null;
}

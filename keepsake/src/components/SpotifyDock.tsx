import { useEffect, useLayoutEffect, useState } from "react";
import { useApp } from "../store/appStore";
import { useCrtPlayerSlot } from "../store/spotifyUi";
import { playlistEmbedId, setPlaybackVolume } from "../lib/spotify";
import { applyPlaybackVolume, ensurePlaybackDevice } from "../lib/spotifyPlayback";

/**
 * One Spotify iframe for the whole app. Compact in the corner; when the CRT
 * is open it sits in the panel so you can scroll the playlist tracks.
 */
export function SpotifyDock() {
  const { environment, activeBook } = useApp();
  const { slot } = useCrtPlayerSlot();
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const embedId = activeBook?.playlistUri ? playlistEmbedId(activeBook.playlistUri) : null;
  const onCrt = !!slot && !!embedId;

  useLayoutEffect(() => {
    if (!slot) {
      setBox(null);
      return;
    }
    const measure = () => {
      const r = slot.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [slot]);

  useEffect(() => {
    if (environment.musicProvider !== "spotify") return;
    void (async () => {
      const device = environment.musicOn ? await ensurePlaybackDevice(environment.volume) : null;
      await applyPlaybackVolume(environment.volume);
      await setPlaybackVolume(environment.volume, device ?? undefined);
    })();
  }, [environment.volume, environment.musicProvider, environment.musicOn]);

  if (environment.musicProvider !== "spotify" || !embedId) return null;

  return (
    <div
      className={`ks-spotify-dock${onCrt ? " is-on-crt" : ""}`}
      role="region"
      aria-label="Now playing"
      style={
        onCrt && box
          ? { top: box.top, left: box.left, width: box.width, bottom: "auto" }
          : undefined
      }
      data-player-home={onCrt ? "crt" : "dock"}
    >
      <iframe
        title="Spotify player"
        src={`https://open.spotify.com/embed/playlist/${embedId}?utm_source=generator&theme=0`}
        width="100%"
        height={352}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    </div>
  );
}

import { useApp } from "../store/appStore";
import { playlistEmbedId } from "../lib/spotify";

/**
 * Stays mounted for the life of the app so a Spotify playlist keeps playing
 * after the CRT panel closes. One iframe only — the panel does not render
 * its own player.
 */
export function SpotifyDock() {
  const { environment, activeBook } = useApp();
  const embedId = activeBook?.playlistUri ? playlistEmbedId(activeBook.playlistUri) : null;
  if (environment.musicProvider !== "spotify" || !embedId) return null;

  return (
    <div className="ks-spotify-dock" role="region" aria-label="Now playing">
      <iframe
        title="Spotify player"
        src={`https://open.spotify.com/embed/playlist/${embedId}?utm_source=generator&theme=0`}
        width="100%"
        height="80"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    </div>
  );
}

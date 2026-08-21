import { useCallback, useEffect, useState } from "react";
import * as spotify from "../lib/spotify";
import type { SpotifyPlaylist, SpotifyProfile } from "../lib/spotify";

/** Manages the Spotify connection lifecycle for the music panel. */
export function useSpotify() {
  const configured = spotify.isConfigured();
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(configured);

  const refresh = useCallback(async () => {
    if (!spotify.isConnected()) {
      setProfile(null);
      setPlaylists([]);
      return;
    }
    const p = await spotify.getProfile();
    setProfile(p);
    if (p) setPlaylists(await spotify.getPlaylists());
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      await spotify.completeLoginIfRedirected();
      if (!active) return;
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [configured, refresh]);

  const connect = useCallback(() => spotify.login(), []);
  const disconnect = useCallback(() => {
    spotify.logout();
    setProfile(null);
    setPlaylists([]);
  }, []);

  return {
    configured,
    connected: !!profile,
    profile,
    playlists,
    loading,
    connect,
    disconnect,
    refresh,
  };
}

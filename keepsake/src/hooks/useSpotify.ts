import { useCallback, useEffect, useState } from "react";
import * as spotify from "../lib/spotify";
import type { SpotifyPlaylist, SpotifyProfile } from "../lib/spotify";

/** Manages the Spotify connection lifecycle for the music panel. */
export function useSpotify() {
  const [clientId, setClientId] = useState(() => spotify.getClientId() ?? "");
  const configured = !!clientId;
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
    if (!configured) {
      setLoading(false);
      return;
    }
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
  const saveClientId = useCallback((id: string) => {
    spotify.setStoredClientId(id);
    setClientId(id.trim());
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
    saveClientId,
  };
}

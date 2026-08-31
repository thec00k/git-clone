/*
 * Spotify Web Playback SDK — lets the room volume slider drive the music
 * Keepsake is actually playing (the embed iframe cannot be controlled).
 */
import { getAccessToken, transferPlayback } from "./spotify";

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (state: { device_id?: string }) => void): void;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: { Player: new (opts: {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume: number;
    }) => SpotifyPlayer };
  }
}

let sdkPromise: Promise<void> | null = null;
let player: SpotifyPlayer | null = null;
let deviceId: string | null = null;

function loadSdk(): Promise<void> {
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Spotify SDK failed to load"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export function getPlaybackDeviceId(): string | null {
  return deviceId;
}

export async function ensurePlaybackDevice(volume: number): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  if (player && deviceId) {
    await player.setVolume(volume).catch(() => undefined);
    return deviceId;
  }
  try {
    await loadSdk();
  } catch {
    return null;
  }
  if (!window.Spotify?.Player) return null;
  player = new window.Spotify.Player({
    name: "Keepsake CRT",
    getOAuthToken: (cb) => {
      void getAccessToken().then((t) => {
        if (t) cb(t);
      });
    },
    volume,
  });
  player.addListener("ready", (state) => {
    if (state.device_id) deviceId = state.device_id;
  });
  player.addListener("not_ready", () => {
    deviceId = null;
  });
  const ok = await player.connect();
  if (!ok) {
    player = null;
    return null;
  }
  const started = Date.now();
  while (!deviceId && Date.now() - started < 4000) {
    await new Promise((r) => setTimeout(r, 80));
  }
  if (deviceId) await transferPlayback(deviceId, false).catch(() => undefined);
  return deviceId;
}

export async function applyPlaybackVolume(volume: number): Promise<void> {
  if (player) await player.setVolume(Math.min(1, Math.max(0, volume))).catch(() => undefined);
}

export async function pauseLocalPlayback(): Promise<void> {
  if (player) await player.pause().catch(() => undefined);
}

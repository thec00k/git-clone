/*
 * Spotify account connection via the browser-safe Authorization Code + PKCE
 * flow (no client secret). This is the "provider adapter" the Bible §13 calls
 * for; the generative ambient pad remains the offline/default provider.
 *
 * The Client ID is public-by-design (it is sent to accounts.spotify.com).
 * The Client Secret must never ship in this frontend — PKCE does not need it.
 *
 * Client ID resolution, first match wins:
 *   1. VITE_SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_ID at build/dev time
 *   2. a Client ID saved locally in this browser (CRT panel)
 *
 * Also register this page's origin as a Redirect URI on the Spotify app.
 * Spotify forbids the hostname `localhost` — use the loopback literal
 * `http://127.0.0.1:5174/` (HTTP is allowed only for 127.0.0.1 / [::1]).
 * Full in-app playback additionally needs a Spotify Premium account.
 */

const CLIENT_ID_KEY = "ks-spotify-client-id";

/** Spotify rejects `localhost`; map it to the loopback IP they still allow. */
function loopbackHost(hostname: string): string {
  if (hostname === "localhost" || hostname === "[::1]") return "127.0.0.1";
  return hostname;
}

function computeRedirectUri(): string {
  const fromEnv = (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  const { protocol, hostname, port } = window.location;
  const host = loopbackHost(hostname);
  const portPart = port ? `:${port}` : "";
  return `${protocol}//${host}${portPart}/`;
}

export function getClientId(): string | undefined {
  const fromEnv = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  try {
    return localStorage.getItem(CLIENT_ID_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function setStoredClientId(id: string): void {
  const trimmed = id.trim();
  if (trimmed) localStorage.setItem(CLIENT_ID_KEY, trimmed);
  else localStorage.removeItem(CLIENT_ID_KEY);
}

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "streaming",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

const TOKEN_KEY = "ks-spotify-token";
const VERIFIER_KEY = "ks-spotify-verifier";
const STATE_KEY = "ks-spotify-state";

interface StoredToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface SpotifyProfile {
  id: string;
  name: string;
  product?: string; // "premium" | "free"
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  image?: string;
  tracks: number;
}

export function isConfigured(): boolean {
  return !!getClientId();
}

export function redirectUri(): string {
  return computeRedirectUri();
}

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(len = 64): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer).slice(0, len);
}

async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

export async function login(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error("Spotify is not configured");
  const verifier = randomString();
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: computeRedirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: await challenge(verifier),
    state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

/** If we've just returned from Spotify, exchange the code for tokens. */
export async function completeLoginIfRedirected(): Promise<boolean> {
  const clientId = getClientId();
  if (!clientId) return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return false;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  // Always clean the URL so the code isn't reused/leaked.
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());

  if (!verifier || (expectedState && state !== expectedState)) return false;

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: computeRedirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const data = await res.json();
  store(data);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return true;
}

function store(data: { access_token: string; refresh_token?: string; expires_in: number }) {
  const token: StoredToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

function read(): StoredToken | null {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
  } catch {
    return null;
  }
}

export function isConnected(): boolean {
  return !!read();
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const tok = read();
  if (!tok) return null;
  if (Date.now() < tok.expires_at) return tok.access_token;
  const clientId = getClientId();
  if (!tok.refresh_token || !clientId) {
    logout();
    return null;
  }
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: tok.refresh_token,
    }),
  });
  if (!res.ok) {
    logout();
    return null;
  }
  const data = await res.json();
  store({ ...data, refresh_token: data.refresh_token ?? tok.refresh_token });
  return data.access_token as string;
}

async function api<T>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function apiSend(path: string, init: RequestInit = {}): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  return res.ok || res.status === 204;
}

/** 0..1 room volume → a Spotify Connect / Web Playback device. */
export async function setPlaybackVolume(volume: number, deviceId?: string): Promise<boolean> {
  const pct = Math.round(Math.min(1, Math.max(0, volume)) * 100);
  const q = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : "";
  return apiSend(`/me/player/volume?volume_percent=${pct}${q}`, { method: "PUT" });
}

export async function transferPlayback(deviceId: string, play = false): Promise<boolean> {
  return apiSend("/me/player", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
}

export interface SpotifyTrack {
  uri: string;
  name: string;
  artists: string;
}

export async function getPlaylistTracks(id: string): Promise<SpotifyTrack[]> {
  const data = await api<{
    items: { track: { uri: string; name: string; artists: { name: string }[] } | null }[];
  }>(`/playlists/${encodeURIComponent(id)}/tracks?limit=50`);
  if (!data) return [];
  return data.items
    .map((row) => row.track)
    .filter((t): t is NonNullable<typeof t> => !!t?.uri)
    .map((t) => ({
      uri: t.uri,
      name: t.name,
      artists: (t.artists ?? []).map((a) => a.name).join(", "),
    }));
}

export async function playContext(opts: {
  contextUri: string;
  deviceId?: string;
  offsetUri?: string;
}): Promise<boolean> {
  const q = opts.deviceId ? `?device_id=${encodeURIComponent(opts.deviceId)}` : "";
  const body = opts.offsetUri
    ? { context_uri: opts.contextUri, offset: { uri: opts.offsetUri } }
    : { context_uri: opts.contextUri };
  return apiSend(`/me/player/play${q}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function pausePlayback(): Promise<boolean> {
  return apiSend("/me/player/pause", { method: "PUT" });
}

export async function skipPlayback(dir: "next" | "previous"): Promise<boolean> {
  return apiSend(`/me/player/${dir}`, { method: "POST" });
}

export async function getProfile(): Promise<SpotifyProfile | null> {
  const me = await api<{ id: string; display_name: string; product?: string }>("/me");
  return me ? { id: me.id, name: me.display_name || me.id, product: me.product } : null;
}

export async function getPlaylists(): Promise<SpotifyPlaylist[]> {
  const data = await api<{
    items: { id: string; name: string; uri: string; images: { url: string }[]; tracks: { total: number } }[];
  }>("/me/playlists?limit=30");
  if (!data) return [];
  return data.items.map((p) => ({
    id: p.id,
    name: p.name,
    uri: p.uri,
    image: p.images?.[0]?.url,
    tracks: p.tracks?.total ?? 0,
  }));
}

/** Turn a playlist URL or URI into an embeddable id, for the iframe player. */
export function playlistEmbedId(uriOrUrl: string): string | null {
  const uri = uriOrUrl.match(/playlist[:/]([a-zA-Z0-9]+)/);
  return uri ? uri[1] : null;
}

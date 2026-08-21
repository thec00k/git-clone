import { useState } from "react";
import { ExternalLink, LogOut, Music, Radio, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useSpotify } from "../../hooks/useSpotify";
import { playlistEmbedId, redirectUri } from "../../lib/spotify";
import type { MusicProvider } from "../../types/app";

export function MusicPanel({ onClose }: { onClose: () => void }) {
  const { environment, setEnvironment, activeBook, setBookPlaylist } = useApp();
  const sp = useSpotify();
  const [linkDraft, setLinkDraft] = useState(activeBook?.playlistUri ?? "");

  const provider = environment.musicProvider;
  const setProvider = (p: MusicProvider) => setEnvironment({ musicProvider: p, musicOn: true });

  const playlistUri = activeBook?.playlistUri;
  const embedId = playlistUri ? playlistEmbedId(playlistUri) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="ks-panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">The CRT</h2>
          <button className="text-paper/50" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Provider tabs */}
        <div className="mb-4 flex gap-1.5">
          <button className={`ks-tool ${provider === "ambient" ? "ks-tool--accent" : ""}`} onClick={() => setProvider("ambient")}>
            <Radio size={16} /> Ambient
          </button>
          <button className={`ks-tool ${provider === "spotify" ? "ks-tool--accent" : ""}`} onClick={() => setProvider("spotify")}>
            <Music size={16} /> Spotify
          </button>
        </div>

        {provider === "ambient" ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-paper/60">Ambient pad</span>
              <button
                className={`ks-tool ${environment.musicOn ? "ks-tool--accent" : ""}`}
                onClick={() => setEnvironment({ musicOn: !environment.musicOn })}
              >
                {environment.musicOn ? "On" : "Off"}
              </button>
            </div>
            <label className="mt-3 block text-sm text-paper/60" htmlFor="ks-music-vol2">Volume</label>
            <input
              id="ks-music-vol2"
              name="musicVolume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={environment.volume}
              onChange={(e) => setEnvironment({ volume: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--color-accent)]"
            />
            <p className="mt-2 text-xs text-paper/40">A soft, generative pad — works offline, no account needed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Connection */}
            {!sp.configured ? (
              <div className="rounded-lg bg-black/20 p-3 text-sm text-paper/70">
                <p className="mb-1 text-paper">Spotify isn&rsquo;t set up yet.</p>
                <p className="text-paper/60">
                  To enable account login, a Spotify Developer app is needed: set
                  <code>VITE_SPOTIFY_CLIENT_ID</code> and register the redirect URI
                  <code>{redirectUri()}</code>. You can still paste a public playlist link below to play
                  it now.
                </p>
              </div>
            ) : sp.loading ? (
              <p className="text-sm text-paper/60">Checking Spotify…</p>
            ) : sp.connected ? (
              <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                <span className="text-sm text-paper">
                  Connected as <strong>{sp.profile?.name}</strong>
                  {sp.profile?.product && sp.profile.product !== "premium" && (
                    <span className="ml-2 text-paper/50">(Premium needed for in-app playback)</span>
                  )}
                </span>
                <button className="ks-chip h-8 w-8" title="Disconnect" onClick={sp.disconnect}>
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button className="ks-tool ks-tool--accent w-full justify-center" onClick={sp.connect}>
                <Music size={16} /> Connect Spotify
              </button>
            )}

            {/* Your playlists (when connected) */}
            {sp.connected && sp.playlists.length > 0 && activeBook && (
              <div>
                <p className="mb-1 text-sm text-paper/60">Pick a playlist for &ldquo;{activeBook.title}&rdquo;</p>
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                  {sp.playlists.map((pl) => (
                    <button
                      key={pl.id}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5 ${
                        playlistUri === pl.uri ? "bg-white/10" : "bg-black/15"
                      }`}
                      onClick={() => {
                        setBookPlaylist(activeBook.id, pl.uri);
                        setLinkDraft(pl.uri);
                      }}
                    >
                      {pl.image && <img src={pl.image} alt="" className="h-8 w-8 rounded object-cover" />}
                      <span className="flex-1 truncate text-paper">{pl.name}</span>
                      <span className="text-paper/40">{pl.tracks}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual playlist link (works without login) */}
            {activeBook && (
              <div className="flex gap-2">
                <input
                  name="playlistLink"
                  aria-label="Spotify playlist link"
                  className="flex-1 rounded bg-black/25 px-3 py-2 text-sm text-paper outline-none"
                  placeholder="paste a Spotify playlist link…"
                  value={linkDraft}
                  onChange={(e) => setLinkDraft(e.target.value)}
                />
                <button className="ks-tool" onClick={() => setBookPlaylist(activeBook.id, linkDraft.trim() || undefined)}>
                  Set
                </button>
              </div>
            )}

            {/* Player */}
            {embedId ? (
              <div className="overflow-hidden rounded-xl">
                <iframe
                  title="Spotify player"
                  src={`https://open.spotify.com/embed/playlist/${embedId}`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            ) : (
              <p className="text-xs text-paper/40">Choose or paste a playlist to play it here.</p>
            )}

            {playlistUri && (
              <a
                href={`https://open.spotify.com/playlist/${embedId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-paper/60 hover:text-paper"
              >
                <ExternalLink size={13} /> Open in Spotify
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { ExternalLink, LogOut, Music, Radio, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useSpotify } from "../../hooks/useSpotify";
import { playlistEmbedId, redirectUri } from "../../lib/spotify";
import type { MusicProvider } from "../../types/app";
import { VolumeSlider } from "../VolumeSlider";

export function MusicPanel({ onClose }: { onClose: () => void }) {
  const { environment, setEnvironment, activeBook, setBookPlaylist } = useApp();
  const sp = useSpotify();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);
  const [linkDraft, setLinkDraft] = useState(activeBook?.playlistUri ?? "");

  const provider = environment.musicProvider;
  const setProvider = (p: MusicProvider) => setEnvironment({ musicProvider: p, musicOn: true });

  const playlistUri = activeBook?.playlistUri;
  const embedId = playlistUri ? playlistEmbedId(playlistUri) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div ref={panelRef} className="ks-panel w-full max-w-md p-5" role="dialog" aria-modal="true" aria-label="Music" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">The CRT</h2>
          <button className="text-paper/50" onClick={onClose} aria-label="Close music"><X size={18} /></button>
        </div>

        {/* Provider tabs */}
        <div className="mb-4 flex gap-1.5">
          <button className={`ks-tool ${provider === "ambient" ? "ks-tool--accent" : ""}`} aria-pressed={provider === "ambient"} onClick={() => setProvider("ambient")}>
            <Radio size={16} /> Ambient
          </button>
          <button className={`ks-tool ${provider === "spotify" ? "ks-tool--accent" : ""}`} aria-pressed={provider === "spotify"} onClick={() => setProvider("spotify")}>
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
            <VolumeSlider
              id="ks-crt-ambient-vol"
              label="Volume"
              value={environment.volume}
              onChange={(v) => setEnvironment({ volume: v })}
            />
            <p className="mt-2 text-xs text-paper/40">A soft, generative pad — works offline, no account needed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Connection */}
            {!sp.configured ? (
              <ClientIdSetup onSave={sp.saveClientId} />
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
                        setEnvironment({ musicProvider: "spotify", musicOn: true });
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
                <button
                  className="ks-tool"
                  onClick={() => {
                    setBookPlaylist(activeBook.id, linkDraft.trim() || undefined);
                    if (linkDraft.trim()) setEnvironment({ musicProvider: "spotify", musicOn: true });
                  }}
                >
                  Set
                </button>
              </div>
            )}

            <VolumeSlider
              id="ks-crt-spotify-vol"
              label="Room volume"
              value={environment.volume}
              onChange={(v) => setEnvironment({ volume: v })}
            />
            <p className="text-xs text-paper/40">
              {embedId
                ? "Playback stays in the dock when you close the CRT. The embed has its own volume too."
                : "Choose or paste a playlist to play it. It will keep playing after you close this."}
            </p>

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

function ClientIdSetup({ onSave }: { onSave: (id: string) => void }) {
  const [draft, setDraft] = useState("");
  const uri = redirectUri();

  return (
    <div className="rounded-lg bg-black/20 p-3 text-sm text-paper/70">
      <p className="mb-1 text-paper">Connect needs your Spotify Client ID.</p>
      <p className="text-paper/60">
        In the Spotify Developer Dashboard, add this exact Redirect URI. Spotify will not accept
        {" "}
        <code>localhost</code>
        {" "}
        &mdash; use <code>127.0.0.1</code> (this one):
      </p>
      <code className="mt-1 block break-all rounded bg-black/30 px-2 py-1 text-paper/80">{uri}</code>
      <p className="mt-2 text-paper/50">
        Paste only the Client ID — never the Client Secret. This login uses PKCE, so the secret stays
        in your dashboard. Open Keepsake at this same address (not localhost). Development-mode apps
        also need your Spotify account on the app&rsquo;s User Management list, and the app owner
        needs Premium.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id="ks-spotify-client-id"
          name="spotifyClientId"
          aria-label="Spotify Client ID"
          className="flex-1 rounded bg-black/25 px-3 py-2 text-sm text-paper outline-none"
          placeholder="Spotify Client ID"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
        />
        <button
          className="ks-tool ks-tool--accent disabled:opacity-40"
          disabled={!draft.trim()}
          onClick={() => onSave(draft)}
        >
          Save
        </button>
      </div>
    </div>
  );
}

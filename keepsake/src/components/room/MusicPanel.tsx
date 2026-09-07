import {RoomMusicPreferences} from '../RoomMusicPreferences';
import {SoundCloudSetup} from '../SoundCloudSetup';

import { useCallback, useRef, useState } from "react";
import { Music, Radio, X, LogOut } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useCrtPlayerSlot } from "../../store/spotifyUi";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useSpotify } from "../../hooks/useSpotify";
import { playlistEmbedId, redirectUri } from "../../lib/spotify";
import { VolumeSlider } from "../VolumeSlider";
export function MusicPanel({onClose}:{onClose:()=>void}) {
 const {environment,setEnvironment,activeBook,setBookPlaylist}=useApp();const sp=useSpotify();const {setSlot}=useCrtPlayerSlot();const ref=useRef<HTMLDivElement>(null);useFocusTrap(ref,onClose);
 const [draft,setDraft]=useState(activeBook?.playlistUri??"");const [error,setError]=useState("");const attach=useCallback((el:HTMLDivElement|null)=>setSlot(el),[setSlot]);const id=activeBook?.playlistUri?playlistEmbedId(activeBook.playlistUri):null;
 function choose(value:string){if(!activeBook)return;const id=playlistEmbedId(value);if(value.trim()&&!id){setError("Paste a full Spotify playlist link or playlist URI.");return;}setBookPlaylist(activeBook.id,id?`spotify:playlist:${id}`:undefined);setEnvironment({musicProvider:"spotify",musicOn:!!id});setError("");}
 return <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}><div ref={ref} className="ks-panel w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5" role="dialog" aria-modal="true" aria-label="Music" onClick={e=>e.stopPropagation()}>
 <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl">Room music</h2><button onClick={onClose} aria-label="Close music"><X size={18}/></button></div>
 <RoomMusicPreferences/>
 <div className="mb-4 flex flex-wrap gap-2"><button className="ks-tool" aria-pressed={environment.musicProvider==="ambient"} onClick={()=>setEnvironment({musicProvider:"ambient",musicOn:true})}><Radio size={16}/> Ambient</button><button className="ks-tool" aria-pressed={environment.musicProvider==="spotify"} onClick={()=>setEnvironment({musicProvider:"spotify"})}><Music size={16}/> Spotify</button><button className="ks-tool" aria-pressed={environment.musicProvider==='soundcloud'} onClick={()=>setEnvironment({musicProvider:'soundcloud',musicOn:!!environment.soundCloudUrl})}>SoundCloud</button></div>
 {environment.musicProvider==='lofi'?<p className="my-3 text-sm">Mellow Skies by Purrple Cat · the full album plays in order. Use the player below to pause or skip a song.</p>:environment.musicProvider==="soundcloud"?<SoundCloudSetup/>:environment.musicProvider!=="spotify"?<><button className="ks-tool" onClick={()=>setEnvironment({musicOn:!environment.musicOn})}>{environment.musicOn?"Pause ambient music":"Play ambient music"}</button><VolumeSlider id="ks-crt-ambient-vol" label="Ambient volume" value={environment.volume} onChange={v=>setEnvironment({volume:v})}/><p className="mt-3 text-sm text-paper/60">A soft pad for quiet afternoons. Works offline.</p></>:<>
 <p className="mb-3 text-sm text-paper/70">Paste a playlist, then press play in the Spotify player.</p><div className="flex gap-2"><input className="min-w-0 flex-1 rounded bg-black/25 px-3 py-2 text-paper" aria-label="Spotify playlist link" placeholder="Spotify playlist link" value={draft} onChange={e=>setDraft(e.target.value)}/><button className="ks-tool" onClick={()=>choose(draft)}>Set playlist</button></div>{error&&<p role="alert">{error}</p>}{id&&<div ref={attach} className="ks-crt-player-slot mt-3" data-crt-player/>}
 <p className="mt-3 text-xs text-paper/60">Playback and availability are handled by Spotify. Use the player’s own controls; if it cannot load, open the playlist in Spotify or reload it.</p>
 <details className="mt-4"><summary className="cursor-pointer text-sm text-paper/70">Choose from your Spotify account</summary>{!sp.configured?<ClientIdSetup onSave={sp.saveClientId}/>:sp.loading?<p>Checking connection…</p>:sp.connected?<><button className="ks-tool" onClick={sp.disconnect}><LogOut size={15}/> Disconnect {sp.profile?.name}</button><div className="max-h-40 overflow-y-auto">{sp.playlists.map(p=><button className="ks-tool w-full" key={p.id} onClick={()=>{setDraft(p.uri);choose(p.uri);}}>{p.name}</button>)}</div></>:<button className="ks-tool" onClick={sp.connect}>Connect Spotify</button>}</details></>}
 </div></div>;
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

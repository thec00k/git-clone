import { SpotifyVolume } from './SpotifyVolume';
import { SpotifyEmbed } from './SpotifyEmbed';
import { useLayoutEffect, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Music, Square, Play, Pause } from "lucide-react";
import { useApp } from "../store/appStore";
import { useCrtPlayerSlot } from "../store/spotifyUi";
import { playlistEmbedId } from "../lib/spotify";
export function SpotifyDock() {
 const {environment,activeBook,setEnvironment}=useApp();const {slot,controls,nowPlaying}=useCrtPlayerSlot();
 const [box,setBox]=useState<{top:number;left:number;width:number}|null>(null);
 const [expanded,setExpanded]=useState(false);const [reload,setReload]=useState(0);
 const embedId=activeBook?.playlistUri?playlistEmbedId(activeBook.playlistUri):null;const onCrt=!!slot && !!embedId;
 useLayoutEffect(()=>{if(!slot)return;const measure=()=>{const r=slot.getBoundingClientRect();setBox({top:r.top,left:r.left,width:r.width});};measure();const observer=new ResizeObserver(measure);observer.observe(slot);window.addEventListener("resize",measure);window.addEventListener("scroll",measure,true);return ()=>{observer.disconnect();window.removeEventListener("resize",measure);window.removeEventListener("scroll",measure,true);};},[slot]);
 if(environment.musicProvider!=="spotify" || !embedId)return null;
 const visible=onCrt||expanded;
 return <section className={`ks-spotify-dock${onCrt?" is-on-crt":""}${visible?" is-expanded":""}`} aria-label="Spotify music player" style={onCrt&&box?{top:box.top,left:box.left,width:box.width,bottom:"auto"}:undefined} data-player-home={onCrt?"crt":"dock"}>
 <div className="ks-music-dock-bar"><button aria-label={expanded?"Collapse Spotify player":"Expand Spotify player"} aria-expanded={visible} onClick={()=>setExpanded(v=>!v)}><Music size={15}/> Spotify {visible?<ChevronDown size={14}/>:<ChevronUp size={14}/>}</button>{controls&&environment.musicOn&&<button aria-label="Toggle Spotify playback" title="Play or pause" onClick={controls.toggle}>{nowPlaying&&!nowPlaying.paused?<Pause size={14}/>:<Play size={14}/>}</button>}<SpotifyVolume/>{environment.musicOn&&<button aria-label="Stop Spotify playback" title="Stop playback and close the player" onClick={()=>setEnvironment({musicOn:false})}><Square size={14}/></button>}<a href={`https://open.spotify.com/playlist/${embedId}`} target="_blank" rel="noreferrer" aria-label="Open playlist in Spotify"><ExternalLink size={15}/></a></div>
 <div className="ks-music-player-body" hidden={!visible}>{environment.musicOn?<SpotifyEmbed key={`${embedId}-${reload}`} id={embedId} height={onCrt?352:152}/>:<button className="ks-music-start" onClick={()=>setEnvironment({musicOn:true})}>Open player</button>}<div className="ks-music-player-help"><span role="status">{nowPlaying?`${nowPlaying.paused?'Paused':'Now playing'}: ${nowPlaying.title}`:'Use Spotify’s playback controls.'}</span><button onClick={()=>{setReload(v=>v+1);setEnvironment({musicOn:true});}}>Reload player</button></div></div>
 </section>;
}

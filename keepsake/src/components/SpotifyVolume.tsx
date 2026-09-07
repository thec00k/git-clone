import {useEffect,useRef,useState} from 'react';
import {Volume2} from 'lucide-react';
import {getPlaybackDevice,isConnected,setPlaybackVolume} from '../lib/spotify';
import type {PlaybackDevice} from '../lib/spotify';
export function SpotifyVolume(){
 const [open,setOpen]=useState(false);const [device,setDevice]=useState<PlaybackDevice|null>(null);const [volume,setVolume]=useState(50);const [status,setStatus]=useState('');const timer=useRef<number|undefined>(undefined);const request=useRef(0);
 useEffect(()=>{if(!open)return;setDevice(null);setStatus('');let live=true;void getPlaybackDevice().then(d=>{if(live){setDevice(d);if(d?.volume_percent!=null)setVolume(d.volume_percent);}});return()=>{live=false;};},[open]);
 useEffect(()=>()=>{window.clearTimeout(timer.current);request.current++;},[]);
 const enabled=!!device?.id&&device.supports_volume&&!device.is_restricted&&device.volume_percent!==null;
 function change(value:number){setVolume(value);setStatus('');window.clearTimeout(timer.current);const seq=++request.current;
  timer.current=window.setTimeout(()=>{if(!device)return;void setPlaybackVolume(value/100,device.id).then(ok=>{if(request.current===seq)setStatus(ok?'Volume updated.':'Spotify could not change this device’s volume.');}).catch(()=>{if(request.current===seq)setStatus('Could not reach Spotify. Try again.');});},220);
 }
 return <div className="ks-spotify-volume"><button aria-label="Spotify volume" aria-expanded={open} title="Volume" onClick={()=>setOpen(v=>!v)}><Volume2 size={15}/></button>{open&&<div className="ks-volume-popover"><label htmlFor="ks-spotify-volume">{enabled?`Volume · ${device!.name}`:'Spotify volume'}</label><input id="ks-spotify-volume" aria-label="Spotify playback volume" type="range" min="0" max="100" value={volume} disabled={!enabled} onChange={e=>change(Number(e.target.value))}/>{enabled?<small>{volume}% · controls {device!.name}</small>:<small>{!isConnected()?'Connect Spotify Premium in Music to control device volume.':'Start playback on a Spotify device that supports volume control.'} Embedded previews use your system volume.</small>}{status&&<small role="status">{status}</small>}</div>}</div>;
}

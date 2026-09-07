import {useEffect,useRef,useState} from 'react';
import {useCrtPlayerSlot} from '../store/spotifyUi';
import {getAccessToken} from '../lib/spotify';
type PlaybackEvent={data:{playingURI?:string;isPaused?:boolean}};
type Controller={togglePlay:()=>void;destroy:()=>void;addListener:(name:string,fn:(e:PlaybackEvent)=>void)=>void};
type IframeApi={createController:(el:HTMLElement,options:{uri:string;width:number;height:number},callback:(c:Controller)=>void)=>void};
let apiPromise:Promise<IframeApi>|null=null;
function iframeApi(){
 const global=window as unknown as {keepsakeSpotifyApi?:IframeApi;onSpotifyIframeApiReady:(api:IframeApi)=>void};
 if(global.keepsakeSpotifyApi)return Promise.resolve(global.keepsakeSpotifyApi);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise<IframeApi>((resolve,reject)=>{
  const script=document.createElement('script');
  const fail=()=>{script.remove();apiPromise=null;reject(new Error('Spotify controller unavailable'));};
  const timer=window.setTimeout(fail,12000);
  global.onSpotifyIframeApiReady=api=>{clearTimeout(timer);global.keepsakeSpotifyApi=api;resolve(api);};
  script.src='https://open.spotify.com/embed/iframe-api/v1';script.async=true;script.onerror=()=>{clearTimeout(timer);fail();};document.head.append(script);
 });return apiPromise;
}
export async function trackLabel(uri:string){
 const match=/^spotify:(track|episode):([a-zA-Z0-9]{22})$/.exec(uri);if(!match)return null;
 try{const token=await getAccessToken();
 if(token){const res=await fetch(`https://api.spotify.com/v1/${match[1]}s/${match[2]}`,{headers:{Authorization:`Bearer ${token}`}});if(res.ok){const data=await res.json();return {title:String(data.name),artist:(data.artists??[]).map((a:{name:string})=>a.name).join(', ')||data.show?.publisher||'Spotify'};}}
 }catch{/* Public metadata remains available if an account connection expires. */}
 const response=await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${match[1]}/${match[2]}`)}`);
 if(!response.ok)return null;const data=await response.json();return typeof data.title==='string'?{title:data.title,artist:'Spotify'}:null;
}
export function SpotifyEmbed({id,height}:{id:string;height:number}){
 const root=useRef<HTMLDivElement>(null);const {setNowPlaying,setControls}=useCrtPlayerSlot();const [fallback,setFallback]=useState(false);
 useEffect(()=>{let live=true;let controller:Controller|undefined;let currentUri='';let paused=true;const host=root.current!;
  setNowPlaying(null);setFallback(false);
  const update=(e:PlaybackEvent)=>{if(!live)return;paused=e.data.isPaused??false;const uri=e.data.playingURI;if(!uri)return;
   if(uri===currentUri){setNowPlaying(p=>p?{...p,paused}:p);return;}currentUri=uri;setNowPlaying(null);
   void trackLabel(uri).then(label=>{if(live&&currentUri===uri&&label)setNowPlaying({...label,paused});}).catch(()=>{if(live&&currentUri===uri)setNowPlaying(null);});
  };
  void iframeApi().then(api=>{if(!live)return;const mount=document.createElement('div');host.append(mount);api.createController(mount,{uri:`spotify:playlist:${id}`,width:Math.round(host.getBoundingClientRect().width)||350,height:Number(host.dataset.height)||152},c=>{if(!live){c.destroy();return;}controller=c;setControls({toggle:()=>c.togglePlay()});c.addListener('playback_update',update);c.addListener('playback_started',update);const frame=host.querySelector('iframe');if(frame){frame.title='Spotify player';frame.style.width='100%';frame.height=host.dataset.height??'152';}});}).catch(error=>{if(live){console.warn("Spotify live controller unavailable",error);host.replaceChildren();setFallback(true);}});
  return()=>{live=false;controller?.destroy();host.replaceChildren();setNowPlaying(null);setControls(null);};
 },[id,setNowPlaying,setControls]);
 useEffect(()=>{const frame=root.current?.querySelector('iframe');if(frame)frame.height=String(height);},[height,fallback]);
 return <><div ref={root} data-height={height}/>{fallback&&<iframe title="Spotify player" src={`https://open.spotify.com/embed/playlist/${id}?theme=0`} width="100%" height={height} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"/>}</>;
}

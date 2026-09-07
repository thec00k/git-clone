/*
 * A tiny generative ambient pad using the Web Audio API — no external tracks,
 * so there are no licensing concerns for the prototype (Bible §13 flags music
 * licensing as a risk; synthesised audio side-steps it for now). The CRT toggles
 * it; volume follows the room settings.
 *
 * Page turns use the licensed paper-slide recording; a soft noise fallback covers failed loads.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices: OscillatorNode[] = [];
let modulation: OscillatorNode[] = [];
let running = false;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

export function setMusic(on: boolean, volume: number) {
  if (on) start(volume);
  else stop();
}

export function setVolume(volume: number) {
  if (master && ctx) master.gain.setTargetAtTime(volume * 0.16, ctx.currentTime, 0.3);
}

function start(volume: number) {
  const c = getCtx();
  void c.resume();
  if (running) {
    setVolume(volume);
    return;
  }
  master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);

  const freqs = [130.81, 164.81, 196.0, 246.94];
  voices = freqs.map((f, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.22 / freqs.length;

    const lfo = c.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.013;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 1.6;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start();modulation.push(lfo);

    osc.connect(g).connect(master!);
    osc.start();
    return osc;
  });

  master.gain.setTargetAtTime(volume * 0.16, c.currentTime, 0.8);
  running = true;
}

function stop() {
  if (!running || !ctx || !master) return;
  const m = master;
  const dying = [...voices,...modulation];
  modulation=[];
  m.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  window.setTimeout(() => {
    dying.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    try {
      m.disconnect();
    } catch {
      /* noop */
    }
  }, 700);
  voices = [];
  master = null;
  running = false;
}

/** Recorded paper sliding, with a soft noise-only fallback for offline first use. */
let paperBytes:Promise<ArrayBuffer>|null=null;
let paperDecoded:Promise<AudioBuffer>|null=null;
export function preloadPageSound(){
 if(!paperBytes)paperBytes=fetch('/audio/paper-slide.mp3').then(r=>{if(!r.ok)throw Error('Paper audio unavailable');return r.arrayBuffer();}).catch(error=>{paperBytes=null;throw error;});
 return paperBytes;
}
export function playPageTurn(volume=0.5){
 if(volume<=0||typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const c=getCtx();void c.resume();const requested=performance.now();
 if(!paperDecoded)paperDecoded=preloadPageSound().then(bytes=>c.decodeAudioData(bytes.slice(0))).catch(error=>{paperDecoded=null;throw error;});
 void paperDecoded.then(buffer=>{
  if(performance.now()-requested>500)return;
  const now=c.currentTime;const src=c.createBufferSource();src.buffer=buffer;src.playbackRate.value=.96;
  const duration=buffer.duration/.96;const gain=c.createGain();const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=4800;filter.Q.value=.5;
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(Math.min(1,volume)*.32,now+.1);gain.gain.setValueAtTime(Math.min(1,volume)*.32,now+Math.max(.1,duration-.25));gain.gain.linearRampToValueAtTime(0,now+duration);
  src.connect(filter).connect(gain).connect(c.destination);src.start(now);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
 }).catch(()=>{
  if(performance.now()-requested>500)return;
  const duration=.62,buffer=c.createBuffer(1,Math.floor(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);let colored=0;
  for(let i=0;i<data.length;i++){const t=i/(data.length-1);colored=.78*colored+.22*(Math.random()*2-1);data[i]=colored*Math.pow(Math.sin(Math.PI*t),1.8);}
  const source=c.createBufferSource();source.buffer=buffer;const gain=c.createGain();gain.gain.value=Math.min(1,volume)*.22;source.connect(gain).connect(c.destination);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};
 });
}
/** Short, restrained room foley. Every sound obeys the ambience volume. */
export function playRoomSound(kind:'wood'|'drawer', volume:number){
 if(volume<=0)return;
 const c=getCtx();void c.resume();const now=c.currentTime;const osc=c.createOscillator();const gain=c.createGain();
 osc.type='triangle';osc.frequency.setValueAtTime(kind==='wood'?110:180,now);osc.frequency.exponentialRampToValueAtTime(kind==='wood'?72:65,now+.28);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.035),now+.06);gain.gain.exponentialRampToValueAtTime(.0001,now+.38);
 osc.connect(gain).connect(c.destination);osc.start();osc.stop(now+.4);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 if(kind==='drawer')playPageTurn(volume*.25);
}
export function startWeather(weather:string,volume:number):()=>void{
 if(volume<=0)return()=>{};
 const c=getCtx();void c.resume();const buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate);const data=buffer.getChannelData(0);let brown=0;
 for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;data[i]=weather==='rain'?(Math.random()*2-1)*.45+brown:brown;}
 const source=c.createBufferSource();source.buffer=buffer;source.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=weather==='rain'?2400:500;
 const gain=c.createGain();gain.gain.value=0;gain.gain.setTargetAtTime(volume*(weather==='rain'?.085:.045),c.currentTime,.8);source.connect(filter).connect(gain).connect(c.destination);source.start();
 return()=>{source.stop();source.disconnect();filter.disconnect();gain.disconnect();};
}

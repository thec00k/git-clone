/*
 * A tiny generative ambient pad using the Web Audio API — no external tracks,
 * so there are no licensing concerns for the prototype (Bible §13 flags music
 * licensing as a risk; synthesised audio side-steps it for now). The CRT toggles
 * it; volume follows the room settings.
 *
 * Page-turn rustle is the same idea: a short filtered-noise flap, not a file.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices: OscillatorNode[] = [];
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
    lfo.start();

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
  const dying = voices;
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

/** A short paper-flap for the page-turn. Honour reduced-motion as "no sfx". */
export function playPageTurn(volume = 0.5) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = getCtx();
  void c.resume();
  const now = c.currentTime;
  const dur = 0.32;
  const frames = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const t = i / frames;
    const env = Math.pow(1 - t, 1.35) * Math.min(1, t * 18);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
  filter.Q.value = 0.85;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.42), now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(now);
  src.stop(now + dur + 0.02);

  // A second, drier "leaf slap" as the page settles.
  const slap = c.createOscillator();
  slap.type = "triangle";
  slap.frequency.setValueAtTime(180, now + 0.08);
  slap.frequency.exponentialRampToValueAtTime(70, now + 0.22);
  const slapGain = c.createGain();
  slapGain.gain.setValueAtTime(0.0001, now + 0.08);
  slapGain.gain.exponentialRampToValueAtTime(volume * 0.08, now + 0.1);
  slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  slap.connect(slapGain).connect(c.destination);
  slap.start(now + 0.08);
  slap.stop(now + 0.28);
}

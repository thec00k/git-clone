/*
 * A tiny generative ambient pad using the Web Audio API — no external tracks,
 * so there are no licensing concerns for the prototype (Bible §13 flags music
 * licensing as a risk; synthesised audio side-steps it for now). The CRT toggles
 * it; volume follows the room settings.
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

  // A soft, slightly-detuned major-ish chord.
  const freqs = [130.81, 164.81, 196.0, 246.94];
  voices = freqs.map((f, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.22 / freqs.length;

    // slow vibrato so the pad breathes
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

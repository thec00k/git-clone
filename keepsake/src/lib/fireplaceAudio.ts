/** Original synthesized embers and crackles, spatialized from the cabin hearth. */
type Vec = {x: number; y: number; z: number};
export interface FireplaceAudio {
  resume(): void;
  suspend(): void;
  volume(value: number): void;
  listener(position: Vec, forward: Vec, up: Vec): void;
  dispose(): void;
}
export function createFireplaceAudio(): FireplaceAudio {
  const context = new AudioContext();
  const buffer = context.createBuffer(1, context.sampleRate * 18, context.sampleRate),
    data = buffer.getChannelData(0);
  let seed = 931,
    low = 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < data.length; i++) {
    low = 0.987 * low + 0.013 * (random() * 2 - 1);
    data[i] = low * 0.8;
  }
  for (let k = 0; k < 190; k++) {
    const start = Math.floor(random() * (data.length - context.sampleRate * 0.14)),
      duration = Math.floor(context.sampleRate * (0.008 + random() * 0.11)),
      amp = 0.07 + random() * 0.22;
    for (let j = 0; j < duration; j++)
      data[start + j] += (random() * 2 - 1) * amp * Math.exp((-j / duration) * 7);
  }
  // Zero endpoints avoid a periodic click at the loop seam.
  for (let i = 0; i < context.sampleRate * 0.04; i++) {
    const gain = i / (context.sampleRate * 0.04);
    data[i] *= gain;
    data[data.length - 1 - i] *= gain;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 4400;
  const panner = context.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1.15;
  panner.maxDistance = 9;
  panner.rolloffFactor = 1;
  if (panner.positionX) {
    panner.positionX.value = -0.91;
    panner.positionY.value = 0.5;
    panner.positionZ.value = 1.9;
  } else panner.setPosition(-0.91, 0.5, 1.9);
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(filter).connect(panner).connect(gain).connect(context.destination);
  source.start();
  let closed = false;
  return {
    resume() {
      if (!closed) void context.resume().catch(() => {});
    },
    suspend() {
      if (!closed) void context.suspend().catch(() => {});
    },
    volume(v) {
      if (!closed) gain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.65, context.currentTime, 0.12);
    },
    listener(p, f, u) {
      if (closed) return;
      const l = context.listener;
      // Firefox lacks the AudioParam listener fields; fall back to the older setters there.
      if (!l.positionX) {
        l.setPosition(p.x, p.y, p.z);
        l.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
        return;
      }
      for (const [a, v] of [
        [l.positionX, p.x],
        [l.positionY, p.y],
        [l.positionZ, p.z],
        [l.forwardX, f.x],
        [l.forwardY, f.y],
        [l.forwardZ, f.z],
        [l.upX, u.x],
        [l.upY, u.y],
        [l.upZ, u.z],
      ] as const)
        a.setTargetAtTime(v, context.currentTime, 0.035);
    },
    dispose() {
      if (closed) return;
      closed = true;
      source.stop();
      source.disconnect();
      filter.disconnect();
      panner.disconnect();
      gain.disconnect();
      void context.close().catch(() => {});
    },
  };
}

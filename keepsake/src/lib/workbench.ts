/** Transient interaction state. Never stored with the user's scrapbook data. */
export type WorkbenchPhase = 'room' | 'arriving' | 'cover' | 'opening' | 'editing' | 'closing' | 'leaving';
export type WorkbenchEvent = 'inspect' | 'settled' | 'open' | 'close' | 'leave';
export const WORKBENCH_DURATION = { arriving: 1200, opening: 1050, closing: 850, leaving: 950 } as const;

/** Repeated clicks cannot skip an animation or open a second editing session. */
export function transitionWorkbench(phase: WorkbenchPhase, event: WorkbenchEvent): WorkbenchPhase {
  if (event === 'inspect') return phase === 'room' ? 'arriving' : phase;
  if (event === 'open') return phase === 'cover' ? 'opening' : phase;
  if (event === 'close') return phase === 'editing' || phase === 'opening' ? 'closing' : phase;
  if (event === 'leave') {
    if (phase === 'editing' || phase === 'opening') return 'closing';
    return phase === 'cover' || phase === 'arriving' ? 'leaving' : phase;
  }
  if (event === 'settled') {
    const next: Partial<Record<WorkbenchPhase, WorkbenchPhase>> = {
      arriving: 'cover', opening: 'editing', closing: 'cover', leaving: 'room',
    };
    return next[phase] ?? phase;
  }
  return phase;
}

/** Smooth endpoints keep the book and chair from snapping into their rests. */
export function smootherstep(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Four authored Blender targets describe a complete physical page turn. */
export function pageTurnWeights(progress: number): [number, number, number, number] {
  const p = Math.max(0, Math.min(1, progress)) * 4;
  return [1, 2, 3, 4].map(target => Math.max(0, 1 - Math.abs(p - target))) as [number, number, number, number];
}

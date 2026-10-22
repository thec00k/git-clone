import {useSyncExternalStore} from 'react';

/** Fraction (0..1) of the room's shader warm-up draws that are done. Read by the loading screen only. */
let fraction = 0;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const read = () => fraction;
export function setWarmupProgress(next: number): void {
  const clamped = Math.max(0, Math.min(1, next));
  if (clamped === fraction) return;
  fraction = clamped;
  listeners.forEach(listener => listener());
}
export function useWarmupProgress(): number {
  return useSyncExternalStore(subscribe, read, read);
}

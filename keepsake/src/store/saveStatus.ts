import {useSyncExternalStore} from 'react';
import type {SaveStatus} from '../types/scrapbook';

/**
 * Autosave status as a tiny external store, not React state or context.
 *
 * Every state change flips this to 'saving' and then 'saved'. When it lived in the main app context, each flip
 * re-rendered every useApp() consumer, and because the 3D Canvas bridges every context above it, the whole room
 * re-rendered too: about 75 React commits per settings click. Only the save indicators read this value, so they
 * subscribe to it directly and nothing else re-renders.
 */
let status: SaveStatus = 'idle';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSaveStatus(): SaveStatus {
  return status;
}

export function setSaveStatus(next: SaveStatus): void {
  if (next === status) return;
  status = next;
  listeners.forEach(listener => listener());
}

export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribe, getSaveStatus, getSaveStatus);
}

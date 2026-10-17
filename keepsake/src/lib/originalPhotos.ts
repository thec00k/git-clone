import type {AppState} from '../types/app';
import {checkStorageCapacity} from './importLimits.ts';
import {stripMetadata} from './stripMetadata.ts';
export interface OriginalPhoto {
  key: string;
  name: string;
  type: string;
  size: number;
}
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('keepsake-originals', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function digest(blob: Blob) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), b =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
async function put(key: string, blob: Blob) {
  const d = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    d.close();
  }
}
export async function preserveOriginal(input: File): Promise<OriginalPhoto> {
  const file = await stripMetadata(input);
  await checkStorageCapacity(file.size);
  const key = await digest(file);
  await put(key, file);
  return {key, name: file.name, type: file.type || 'application/octet-stream', size: file.size};
}
export async function readOriginal(original: OriginalPhoto): Promise<Blob> {
  const d = await db();
  try {
    return await new Promise((resolve, reject) => {
      const r = d.transaction('files').objectStore('files').get(original.key);
      r.onsuccess = () =>
        r.result instanceof Blob && r.result.size === original.size
          ? resolve(r.result)
          : reject(
              new Error(
                'A preserved original is missing. Re-import its source file before exporting a complete backup.',
              ),
            );
      r.onerror = () => reject(r.error);
    });
  } finally {
    d.close();
  }
}
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
export async function withOriginalFiles(state: AppState): Promise<AppState> {
  const originals = new Map(
    state.archive.flatMap(p => (p.original ? [[p.original.key, p.original] as const] : [])),
  );
  const bytes =
    new Blob([JSON.stringify(state)]).size +
    [...originals.values()].reduce((n, o) => n + Math.ceil(o.size / 3) * 4 + 256, 0);
  if (bytes > 250 * 1024 * 1024)
    throw new Error(
      'This room exceeds the current 250 MB JSON backup limit. Original files remain available individually in the cabinet. Large-library backups need the upcoming streaming export.',
    );
  const files: Record<string, string> = {};
  for (const o of originals.values()) files[o.key] = await dataUrl(await readOriginal(o));
  return {...state, originalFiles: files};
}
export async function restoreOriginalFiles(state: AppState): Promise<AppState> {
  for (const photo of state.archive) {
    const o = photo.original;
    if (!o) continue;
    const value = state.originalFiles?.[o.key];
    if (!value) throw new Error('Backup is missing an original photograph.');
    const encoded = value.slice(value.indexOf(',') + 1),
      bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const blob = new Blob([bytes], {type: o.type});
    if (blob.size !== o.size || (await digest(blob)) !== o.key)
      throw new Error('An original photograph failed its backup integrity check.');
    await put(o.key, blob);
  }
  const {originalFiles: _files, ...room} = state;
  return room;
}
/** Keys of every preserved original the room still points at, wherever the photo sits. */
export function referencedOriginals(state: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(state)) state.forEach(v => referencedOriginals(v, keys));
  else if (state && typeof state === 'object')
    for (const [k, v] of Object.entries(state)) {
      const key = (v as {key?: unknown} | null)?.key;
      if (k === 'original' && typeof key === 'string') keys.add(key);
      else referencedOriginals(v, keys);
    }
  return keys;
}
// Every open Keepsake tab answers this channel, so one tab never prunes an original another tab is importing.
// (A channel never receives its own messages, so this tab does not answer itself.)
const tabs = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('keepsake-originals');
// Node (the check scripts) would otherwise stay alive waiting on the channel.
(tabs as {unref?: () => void} | null)?.unref?.();
let answered: (() => void) | null = null;
if (tabs)
  tabs.onmessage = e => {
    if (e.data === 'anyone-open?') tabs.postMessage('open');
    else if (e.data === 'open') answered?.();
  };
function otherTabOpen(): Promise<boolean> {
  if (!tabs) return Promise.resolve(false);
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      answered = null;
      resolve(false);
    }, 400);
    answered = () => {
      clearTimeout(timer);
      answered = null;
      resolve(true);
    };
    tabs.postMessage('anyone-open?');
  });
}
/** Deletes preserved originals the saved room no longer uses (deleted photos, a room replaced by a restore), so
 * removing a photo really frees its full-size file. Run only on a room that just loaded from storage: nothing
 * is mid-import then, and a missing room record never prunes. Returns how many files were removed. */
export async function pruneOriginals(state: AppState): Promise<number> {
  if (await otherTabOpen()) return 0;
  const keep = referencedOriginals(state);
  const d = await db();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = d.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      let removed = 0;
      const keys = store.getAllKeys();
      keys.onsuccess = () => {
        for (const key of keys.result)
          if (!keep.has(String(key))) {
            store.delete(key);
            removed++;
          }
      };
      tx.oncomplete = () => resolve(removed);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    d.close();
  }
}
export async function downloadOriginal(original: OriginalPhoto) {
  const blob = await readOriginal(original),
    url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = original.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

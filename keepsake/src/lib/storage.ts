import type { AppState } from '../types/app';

const PREFIX = 'keepsake-asset:';
let revision = 0;
let queue: Promise<unknown> = Promise.resolve();
const hashes = new Map<string, string>();
let knownAssets = new Set<string>();
export class SaveConflict extends Error {
  constructor() { super('Another tab saved this room. Reload its latest changes before editing.'); }
}
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const req = indexedDB.open('keepsake', 3);
    req.onupgradeneeded = () => {
      for (const name of ['app', 'images']) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
    };
    req.onsuccess = () => { if (blocked) { req.result.close(); return; } req.result.onversionchange = () => req.result.close(); resolve(req.result); };
    req.onerror = () => reject(req.error);
    req.onblocked = () => { blocked = true; reject(new Error('Close other Keepsake tabs, then retry opening your room.')); };
  });
}
function mapStrings(value: unknown, map: (s: string) => string, key = ''): unknown {
  if (typeof value === 'string') return key === 'src' || key === 'photoSrc' ? map(value) : value;
  if (Array.isArray(value)) return value.map(v => mapStrings(v, map));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,mapStrings(v,map,k)]));
  return value;
}
/** Read errors propagate: only an absent record means a new room. Legacy inline images hydrate unchanged. */
export async function loadState(): Promise<AppState | null> {
  await queue.catch(() => {});
  const db = await openDb();
  try {
    const tx = db.transaction(['app','images'], 'readonly');
    const [state, rev, keys, values] = await Promise.all([
      request(tx.objectStore('app').get('state')), request(tx.objectStore('app').get('revision')),
      request(tx.objectStore('images').getAllKeys()), request(tx.objectStore('images').getAll()),
    ]);
    const images = new Map(keys.map((key,i) => [String(key), values[i] as string]));
    if (state != null && (typeof state !== 'object' || Array.isArray(state))) throw new Error('The saved room could not be read. Your save has not been changed.');
    const result = state == null ? null : mapStrings(state, s => {
      if (!s.startsWith(PREFIX)) return s;
      const image = images.get(s);
      if (!image) throw new Error('A saved photograph could not be read. Your save has not been changed.');
      hashes.set(image,s); return image;
    }) as AppState;
    revision = rev ?? 0; knownAssets = new Set(images.keys());
    return result;
  } finally { db.close(); }
}
async function persist(state: AppState): Promise<void> {
  const images = new Set<string>();
  mapStrings(state, s => { if (s.startsWith('data:image/')) images.add(s); return s; });
  for (const src of images) if (!hashes.has(src)) {
    const digest = crypto.subtle ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src)) : crypto.getRandomValues(new Uint8Array(32)).buffer;
    hashes.set(src, PREFIX + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join(''));
  }
  const packed = mapStrings(state, s => hashes.get(s) ?? s);
  const db = await openDb();
  try {
    await new Promise<void>((resolve,reject) => {
      const tx = db.transaction(['app','images'], 'readwrite');
      let conflict = false;
      const check = tx.objectStore('app').get('revision');
      check.onsuccess = () => {
        if ((check.result ?? 0) !== revision) { conflict = true; tx.abort(); return; }
        for (const src of images) { const key = hashes.get(src)!; if (!knownAssets.has(key)) tx.objectStore('images').put(src,key); }
        tx.objectStore('app').put(packed,'state');
        tx.objectStore('app').put(revision + 1,'revision');
      };
      tx.oncomplete = () => { revision++; for (const src of images) knownAssets.add(hashes.get(src)!); resolve(); };
      tx.onabort = () => reject(conflict ? new SaveConflict() : tx.error ?? new Error('Saving was interrupted.'));
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
/** Serialize writes within a tab; compare revisions atomically across tabs. */
export function saveState(state: AppState): Promise<void> {
  const next = queue.catch(() => {}).then(() => persist(state));
  queue = next; return next;
}

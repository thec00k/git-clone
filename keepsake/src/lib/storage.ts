import type {AppState} from '../types/app';

const PREFIX = 'keepsake-asset:';
let revision = 0;
let queue: Promise<unknown> = Promise.resolve();
/** File content added this session (data: URLs) to its storage key. */
const hashes = new Map<string, string>();
/** Saved files reach the app as blob: URLs. The browser reads each one from disk only when it is shown, so a
 * large archive opens quickly and its photos are not all held in memory. One URL per key, kept for the session
 * so equal photos stay equal and undo can bring back a deleted one. */
const files = new Map<string, {key: string; blob: Blob}>();
const urls = new Map<string, string>();
let knownAssets = new Set<string>();
export class SaveConflict extends Error {
  constructor() {
    super('Another tab saved this room. Reload its latest changes before editing.');
  }
}
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const req = indexedDB.open('keepsake', 3);
    req.onupgradeneeded = () => {
      for (const name of ['app', 'images'])
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
    };
    req.onsuccess = () => {
      if (blocked) {
        req.result.close();
        return;
      }
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      blocked = true;
      reject(new Error('Close other Keepsake tabs, then retry opening your room.'));
    };
  });
}
/** Fields that hold file content (photos, card art, 3D scans). Their data: values are stored once, by hash,
 * in the 'images' store, so the room record stays small and an edit never rewrites every photo or model. */
const FILE_KEYS = new Set(['src', 'photoSrc', 'coverSrc', 'backSrc', 'modelSrc']);
const isFileData = (s: string) => s.startsWith('data:image/') || s.startsWith('data:model/');
function mapStrings(value: unknown, map: (s: string) => string, key = ''): unknown {
  if (typeof value === 'string') return FILE_KEYS.has(key) ? map(value) : value;
  if (Array.isArray(value)) return value.map(v => mapStrings(v, map));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, map, k)]));
  return value;
}
function dataBlob(src: string): Blob {
  const comma = src.indexOf(',');
  const header = src.slice(5, comma);
  const base64 = header.endsWith(';base64');
  const body = src.slice(comma + 1);
  let bytes: Uint8Array<ArrayBuffer>;
  if (base64) {
    const text = atob(body);
    bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  } else bytes = new TextEncoder().encode(decodeURIComponent(body));
  return new Blob([bytes], {type: base64 ? header.slice(0, -7) : header});
}
async function blobData(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as unknown as number[]);
  return `data:${blob.type};base64,${btoa(text)}`;
}
function fileUrl(key: string, blob: Blob): string {
  let url = urls.get(key);
  if (!url) {
    url = URL.createObjectURL(blob);
    urls.set(key, url);
    files.set(url, {key, blob});
  }
  return url;
}
/** Older saves kept each file as a data: string; rewrite those as files once, without changing their keys. */
async function upgradeFiles(legacy: Map<string, Blob>): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      for (const [key, blob] of legacy) {
        const r = store.get(key);
        r.onsuccess = () => {
          if (typeof r.result === 'string') store.put(blob, key);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
/** Read errors propagate: only an absent record means a new room. Files come back as blob: URLs. */
export async function loadState(): Promise<AppState | null> {
  await queue.catch(() => {});
  const db = await openDb();
  const legacy = new Map<string, Blob>();
  let result: AppState | null;
  try {
    const tx = db.transaction(['app', 'images'], 'readonly');
    // Stored files are Blobs, so reading them all only collects handles; no photo is read into memory here.
    const [state, rev, keys, values] = await Promise.all([
      request(tx.objectStore('app').get('state')),
      request(tx.objectStore('app').get('revision')),
      request(tx.objectStore('images').getAllKeys()),
      request(tx.objectStore('images').getAll()),
    ]);
    const images = new Map(keys.map((key, i) => [String(key), values[i] as unknown]));
    if (state != null && (typeof state !== 'object' || Array.isArray(state)))
      throw new Error('The saved room could not be read. Your save has not been changed.');
    result =
      state == null
        ? null
        : (mapStrings(state, s => {
            if (!s.startsWith(PREFIX)) return s;
            const image = images.get(s);
            if (image instanceof Blob) return fileUrl(s, image);
            if (typeof image === 'string' && isFileData(image)) {
              const blob = urls.has(s) ? files.get(urls.get(s)!)!.blob : dataBlob(image);
              legacy.set(s, blob);
              return fileUrl(s, blob);
            }
            throw new Error('A saved photograph could not be read. Your save has not been changed.');
          }) as AppState);
    revision = rev ?? 0;
    knownAssets = new Set(images.keys());
  } finally {
    db.close();
  }
  // Best effort and in the save queue: a failed upgrade leaves the old strings, which still load.
  if (legacy.size)
    queue = queue
      .catch(() => {})
      .then(() => upgradeFiles(legacy))
      .catch(() => {});
  return result;
}
/** A copy of the room with every saved file written out as a data: URL, for backups. */
export async function inlineFiles(state: AppState): Promise<AppState> {
  const data = new Map<string, string>();
  mapStrings(state, s => {
    if (files.has(s)) data.set(s, '');
    return s;
  });
  for (const url of data.keys()) data.set(url, await blobData(files.get(url)!.blob));
  return mapStrings(state, s => data.get(s) ?? s) as AppState;
}
async function persist(state: AppState): Promise<void> {
  const found = new Set<string>();
  mapStrings(state, s => {
    if (isFileData(s) || files.has(s)) found.add(s);
    return s;
  });
  for (const src of found)
    if (isFileData(src) && !hashes.has(src)) {
      const digest = crypto.subtle
        ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src))
        : crypto.getRandomValues(new Uint8Array(32)).buffer;
      hashes.set(
        src,
        PREFIX + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''),
      );
    }
  const keyOf = (s: string) => files.get(s)?.key ?? hashes.get(s) ?? s;
  const packed = mapStrings(state, keyOf);
  const referenced = new Set([...found].map(keyOf));
  const writes = new Map<string, string>();
  for (const src of found) if (!knownAssets.has(keyOf(src))) writes.set(keyOf(src), src);
  // A file about to be deleted may still be on screen or in undo; keep a private copy so it can be saved again.
  for (const key of knownAssets) {
    const entry = !referenced.has(key) && urls.has(key) ? files.get(urls.get(key)!) : undefined;
    if (entry)
      try {
        entry.blob = new Blob([await entry.blob.arrayBuffer()], {type: entry.blob.type});
      } catch {
        // Already gone (another tab deleted it); nothing to keep.
      }
  }
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['app', 'images'], 'readwrite');
      let conflict = false;
      const check = tx.objectStore('app').get('revision');
      check.onsuccess = () => {
        if ((check.result ?? 0) !== revision) {
          conflict = true;
          tx.abort();
          return;
        }
        for (const [key, src] of writes)
          tx.objectStore('images').put(isFileData(src) ? dataBlob(src) : files.get(src)!.blob, key);
        // Photos no longer in the room are removed so deleting something really frees it (and its privacy).
        for (const key of knownAssets) if (!referenced.has(key)) tx.objectStore('images').delete(key);
        tx.objectStore('app').put(packed, 'state');
        tx.objectStore('app').put(revision + 1, 'revision');
      };
      tx.oncomplete = () => {
        revision++;
        knownAssets = new Set(referenced);
        // Forget hashes of files no longer in the room so the cache does not grow for the whole session.
        for (const [src, key] of hashes) if (!referenced.has(key)) hashes.delete(src);
        resolve();
      };
      tx.onabort = () =>
        reject(conflict ? new SaveConflict() : (tx.error ?? new Error('Saving was interrupted.')));
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
/** Serialize writes within a tab; compare revisions atomically across tabs. `isCurrent` is checked when the
 * write's turn comes: a save queued before a restore must not land after it, so it resolves false unwritten. */
export function saveState(state: AppState, isCurrent: () => boolean = () => true): Promise<boolean> {
  const next = queue
    .catch(() => {})
    .then(async () => {
      if (!isCurrent()) return false;
      await persist(state);
      return true;
    });
  queue = next;
  return next;
}

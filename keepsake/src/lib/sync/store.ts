import type {Change, Snapshot} from './snapshot.ts';
import {changeKey} from './snapshot.ts';

/**
 * The sync client's own IndexedDB database ('keepsake-sync'), separate from the room ('keepsake') so the
 * sync code can never write to the room. Stores:
 *   outbox  changes waiting to be sent, keyed by what they change (a newer change replaces an older one)
 *   ids     local id -> server uuid ('book:<id>', 'page:<id>', 'photo:<key>')
 *   meta    account, server revision, last queued snapshot, pause reason, last sync time, problems
 */
export interface OutboxEntry {
  key: string;
  change: Change;
  /** Bumped on every re-queue, so finishing an older send never drops a newer change. */
  seq: number;
  attempts: number;
  notBefore: number;
}
export type Pause = 'other-account' | 'server-has-room' | 'changed-elsewhere';
export interface Meta {
  account?: string;
  revision?: number;
  snapshot?: Snapshot | null;
  paused?: Pause | null;
  lastSyncedAt?: number;
  problems?: string[];
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('keepsake-sync', 1);
    req.onupgradeneeded = () => {
      for (const name of ['outbox', 'ids', 'meta']) req.result.createObjectStore(name);
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Close other Keepsake tabs to finish setting up backup.'));
  });
}
async function run<T>(
  stores: string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await open();
  try {
    const tx = db.transaction(stores, mode);
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error('Backup bookkeeping was interrupted.'));
      tx.onerror = () => reject(tx.error);
    });
    const result = await body(tx);
    await done;
    return result;
  } finally {
    db.close();
  }
}

export async function readMeta(): Promise<Meta> {
  return run(['meta'], 'readonly', async tx => {
    const store = tx.objectStore('meta');
    const [keys, values] = await Promise.all([request(store.getAllKeys()), request(store.getAll())]);
    return Object.fromEntries(keys.map((k, i) => [String(k), values[i]])) as Meta;
  });
}
export async function writeMeta(patch: Partial<Meta>): Promise<void> {
  await run(['meta'], 'readwrite', tx => {
    for (const [k, v] of Object.entries(patch)) tx.objectStore('meta').put(v, k);
  });
}

/** Stores the new snapshot and queues its changes in one transaction. */
export async function queueChanges(snapshot: Snapshot, changes: Change[]): Promise<void> {
  await run(['meta', 'outbox'], 'readwrite', async tx => {
    const outbox = tx.objectStore('outbox');
    for (const change of changes) {
      const key = changeKey(change);
      const old = (await request(outbox.get(key))) as OutboxEntry | undefined;
      // A photo upload and its trash cancel out when neither has been sent.
      const opposite =
        change.kind === 'photo-trash'
          ? `photo:${change.key}`
          : change.kind === 'photo'
            ? `photo-trash:${change.key}`
            : null;
      if (opposite) outbox.delete(opposite);
      outbox.put(
        {key, change, seq: (old?.seq ?? 0) + 1, attempts: 0, notBefore: 0} satisfies OutboxEntry,
        key,
      );
    }
    tx.objectStore('meta').put(snapshot, 'snapshot');
  });
}
export async function pendingChanges(): Promise<OutboxEntry[]> {
  return run(['outbox'], 'readonly', tx => request(tx.objectStore('outbox').getAll()));
}
/** Removes a sent change, unless it was queued again while being sent. */
export async function finishChange(entry: OutboxEntry): Promise<void> {
  await run(['outbox'], 'readwrite', async tx => {
    const store = tx.objectStore('outbox');
    const now = (await request(store.get(entry.key))) as OutboxEntry | undefined;
    if (now && now.seq === entry.seq) store.delete(entry.key);
  });
}
export async function delayChange(entry: OutboxEntry, notBefore: number): Promise<void> {
  await run(['outbox'], 'readwrite', async tx => {
    const store = tx.objectStore('outbox');
    const now = (await request(store.get(entry.key))) as OutboxEntry | undefined;
    if (now && now.seq === entry.seq) store.put({...now, attempts: now.attempts + 1, notBefore}, entry.key);
  });
}
/** Queues a change again (for example a book once one of its photos has been uploaded). */
export async function requeue(changes: Change[]): Promise<void> {
  if (!changes.length) return;
  await run(['outbox'], 'readwrite', async tx => {
    const outbox = tx.objectStore('outbox');
    for (const change of changes) {
      const key = changeKey(change);
      const old = (await request(outbox.get(key))) as OutboxEntry | undefined;
      outbox.put(
        {key, change, seq: (old?.seq ?? 0) + 1, attempts: 0, notBefore: 0} satisfies OutboxEntry,
        key,
      );
    }
  });
}

export async function knownId(name: string): Promise<string | undefined> {
  return run(['ids'], 'readonly', tx => request(tx.objectStore('ids').get(name)));
}
/** The server id for a local thing, made once and kept, so a retried send updates instead of duplicating. */
export async function serverId(name: string): Promise<string> {
  return run(['ids'], 'readwrite', async tx => {
    const store = tx.objectStore('ids');
    const existing = (await request(store.get(name))) as string | undefined;
    if (existing) return existing;
    const id = crypto.randomUUID();
    store.put(id, name);
    return id;
  });
}
export async function rememberId(name: string, id: string): Promise<void> {
  await run(['ids'], 'readwrite', tx => {
    tx.objectStore('ids').put(id, name);
  });
}

/** Starts the bookkeeping afresh (after the room here was replaced by the account's copy). */
export async function resetTo(meta: Partial<Meta>): Promise<void> {
  await run(['meta', 'outbox'], 'readwrite', tx => {
    tx.objectStore('outbox').clear();
    for (const [k, v] of Object.entries(meta)) tx.objectStore('meta').put(v, k);
  });
}

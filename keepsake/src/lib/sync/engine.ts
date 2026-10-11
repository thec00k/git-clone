import type {AppState} from '../../types/app';
import {buildSnapshot, diffSnapshots, PRIVATE_BYTES, SETTINGS_BYTES} from './snapshot.ts';
import type {BookShape, Change, RoomShape, Snapshot} from './snapshot.ts';
import * as store from './store.ts';
import type {OutboxEntry, Pause} from './store.ts';

/**
 * Sync engine: the local room is the working copy, the server is a copy it is sent to.
 * - record(): after each local save, works out what changed and queues it (the outbox).
 * - flush(): sends queued changes when online; failures wait and retry, nothing is lost.
 * Nothing here writes to the room on this device. When the server holds a room this device did not send,
 * or another device saved in between, sending pauses and the room here stays as it is.
 */
export interface ServerBook {
  title: string;
  subtitle: string;
  visibility: 'private' | 'friends';
  cover: Record<string, unknown>;
  pages: {
    id: string;
    elements: unknown[];
    paper: Record<string, unknown>;
    photos: {photo_id: string; slot: number; layout: Record<string, unknown>}[];
  }[];
}
export interface SyncBackend {
  userId(): Promise<string | null>;
  /** The server room's revision and whether anything has been saved into this account yet. */
  room(): Promise<{revision: number; hasContent: boolean}>;
  /** New revision, or null when the room changed elsewhere since `expected` (nothing written). */
  saveRoom(room: RoomShape, expected: number): Promise<number | null>;
  saveBook(id: string, book: ServerBook): Promise<void>;
  trashBook(id: string): Promise<void>;
  /** Sends one photo through the upload pipeline; returns its server id. */
  uploadPhoto(key: string, data: string): Promise<string>;
  trashPhoto(id: string): Promise<void>;
}
/** A change the server will never accept (too large, refused by moderation): dropped and reported. */
export class PermanentError extends Error {}

export interface Local {
  keyOf(src: string): Promise<string>;
  readFile(key: string): Promise<string | undefined>;
}

export interface SyncStatus {
  linked: boolean;
  paused: Pause | null;
  pending: number;
  lastSyncedAt?: number;
  problems: string[];
  lastError?: string;
}
let lastError: string | undefined;
const listeners = new Set<() => void>();
export const onStatusChange = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
const changed = () => listeners.forEach(fn => fn());

export async function status(): Promise<SyncStatus> {
  const [meta, pending] = await Promise.all([store.readMeta(), store.pendingChanges()]);
  return {
    linked: !!meta.account,
    paused: meta.paused ?? null,
    pending: pending.length,
    lastSyncedAt: meta.lastSyncedAt,
    problems: meta.problems ?? [],
    lastError,
  };
}

/** Connects this device's room to the signed-in account, once. Never uploads into an account that already
 * holds a room from somewhere else, and never mixes two accounts on one device. */
export async function link(backend: SyncBackend): Promise<void> {
  const uid = await backend.userId();
  if (!uid) return;
  const meta = await store.readMeta();
  if (meta.account) {
    const paused =
      meta.account !== uid ? 'other-account' : meta.paused === 'other-account' ? null : meta.paused;
    if (paused !== meta.paused) await store.writeMeta({paused});
  } else {
    const server = await backend.room();
    if (server.hasContent) await store.writeMeta({paused: 'server-has-room'});
    else await store.writeMeta({account: uid, revision: server.revision, snapshot: null, paused: null});
  }
  changed();
}

/** Queues what changed since the last call. Call after the room has been saved on this device. */
export async function record(state: AppState, local: Local): Promise<void> {
  const meta = await store.readMeta();
  if (!meta.account || meta.paused === 'other-account' || meta.paused === 'server-has-room') return;
  const next = await buildSnapshot(state, local.keyOf);
  const changes = diffSnapshots(meta.snapshot ?? null, next);
  if (changes.length) await store.queueChanges(next, changes);
  changed();
}

const ORDER: Change['kind'][] = ['photo', 'room', 'book', 'book-trash', 'photo-trash'];
const backoff = (attempts: number) => Math.min(10 * 60_000, 5_000 * 2 ** attempts);
const size = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

async function serverBook(book: BookShape): Promise<ServerBook> {
  const pages = [];
  for (const page of book.pages) {
    const photos = [];
    for (const p of page.photos) {
      const id = await store.knownId(`photo:${p.key}`);
      // Photos still uploading join the page when they arrive (the book is queued again then).
      if (id) photos.push({photo_id: id, slot: p.slot, layout: {...p.layout, key: p.key}});
    }
    pages.push({
      id: await store.serverId(`page:${page.id}`),
      elements: page.elements,
      paper: page.paper,
      photos,
    });
  }
  return {title: book.title, subtitle: book.subtitle, visibility: book.visibility, cover: book.cover, pages};
}

async function send(entry: OutboxEntry, snapshot: Snapshot, backend: SyncBackend, local: Local) {
  const c = entry.change;
  if (c.kind === 'photo') {
    if (!snapshot.photos.includes(c.key)) return; // removed again before it was sent
    const data = await local.readFile(c.key);
    if (!data) return;
    const id = await backend.uploadPhoto(c.key, data);
    await store.rememberId(`photo:${c.key}`, id);
    const books = Object.entries(snapshot.books)
      .filter(([, b]) => b.pages.some(p => p.photos.some(ph => ph.key === c.key)))
      .map(([id]) => ({kind: 'book', id}) as Change);
    await store.requeue(books);
  } else if (c.kind === 'room') {
    if (size(snapshot.room.settings) > SETTINGS_BYTES || size(snapshot.room.private) > PRIVATE_BYTES)
      throw new PermanentError('The room is too large to back up in one piece.');
    const meta = await store.readMeta();
    const revision = await backend.saveRoom(snapshot.room, meta.revision ?? 0);
    if (revision == null) {
      await store.writeMeta({paused: 'changed-elsewhere'});
      throw new Paused();
    }
    await store.writeMeta({revision});
  } else if (c.kind === 'book') {
    const book = snapshot.books[c.id];
    if (!book) return;
    await backend.saveBook(await store.serverId(`book:${c.id}`), await serverBook(book));
  } else if (c.kind === 'book-trash') {
    if (c.id in snapshot.books) return;
    const id = await store.knownId(`book:${c.id}`);
    if (id) await backend.trashBook(id);
  } else if (c.kind === 'photo-trash') {
    if (snapshot.photos.includes(c.key)) return;
    const id = await store.knownId(`photo:${c.key}`);
    if (id) await backend.trashPhoto(id);
  }
}
class Paused extends Error {}

let running: Promise<void> | null = null;
/** Sends what is due. One run at a time in this tab (and across tabs where the browser supports locks). */
export function flush(backend: SyncBackend, local: Local, now = Date.now): Promise<void> {
  if (running) return running;
  const work = async () => {
    for (;;) {
      const meta = await store.readMeta();
      if (!meta.account || meta.paused || !meta.snapshot) return;
      const due = (await store.pendingChanges())
        .filter(e => e.notBefore <= now())
        .sort((a, b) => ORDER.indexOf(a.change.kind) - ORDER.indexOf(b.change.kind));
      if (!due.length) {
        if (!(await store.pendingChanges()).length) await store.writeMeta({lastSyncedAt: now()});
        return;
      }
      const entry = due[0];
      try {
        await send(entry, meta.snapshot, backend, local);
        await store.finishChange(entry);
        lastError = undefined;
      } catch (error) {
        if (error instanceof Paused) return;
        if (error instanceof PermanentError) {
          const problems = [...(meta.problems ?? []), error.message].slice(-20);
          await store.writeMeta({problems});
          await store.finishChange(entry);
        } else {
          // Offline, signed out or the server is busy: this change waits and the others still get a turn.
          lastError = error instanceof Error ? error.message : String(error);
          await store.delayChange(entry, now() + backoff(entry.attempts));
        }
      } finally {
        changed();
      }
    }
  };
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  running = (
    locks ? locks.request('keepsake-sync', {ifAvailable: true}, l => (l ? work() : undefined)) : work()
  )
    .then(() => undefined)
    .finally(() => {
      running = null;
      changed();
    });
  return running;
}

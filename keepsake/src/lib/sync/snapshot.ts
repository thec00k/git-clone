import type {AppState} from '../../types/app';
import type {Scrapbook} from '../../types/scrapbook';
import {LIMITS, canShareBook} from '../limits.ts';

/**
 * The server's view of a room, built from the local room. Pure: it reads the state and never changes it.
 * Files are replaced by their storage keys (the same SHA-256 keys as the local 'images' store), so nothing
 * here holds file data. See docs/backend-design.md ("Sync plan").
 */
export interface PagePhoto {
  key: string;
  slot: number;
  layout: Record<string, unknown>;
}
export interface PageShape {
  id: string;
  elements: unknown[];
  paper: Record<string, unknown>;
  photos: PagePhoto[];
}
export interface BookShape {
  title: string;
  subtitle: string;
  visibility: 'private' | 'friends';
  cover: Record<string, unknown>;
  pages: PageShape[];
}
export interface RoomShape {
  theme: 'woodland' | 'beachfront' | 'cyberpunk';
  /** What a visitor sees: lights, season, decor. */
  settings: Record<string, unknown>;
  /** Owner only: everything else that is not a book or a file. */
  private: Record<string, unknown>;
}
export interface Snapshot {
  room: RoomShape;
  books: Record<string, BookShape>;
  /** Keys of photos to back up (archive, pages, pins), in upload order. */
  photos: string[];
}

export const SETTINGS_BYTES = 240_000; // server limit 256 KiB
export const PRIVATE_BYTES = 1_000_000; // server limit 1 MiB
/** Which kind of file a value is, if any. The app passes fileKind from ../storage.ts, which also knows the
 * blob: URLs of saved files; this default only sees data: URLs. */
export type KindOf = (src: string) => 'image' | 'model' | undefined;
const dataKind: KindOf = s =>
  s.startsWith('data:image/') ? 'image' : s.startsWith('data:model/') ? 'model' : undefined;

/** Replaces every file in a value by its key. */
function withKeys(value: unknown, keys: Map<string, string>): unknown {
  if (typeof value === 'string' && keys.has(value)) return keys.get(value);
  if (Array.isArray(value)) return value.map(v => withKeys(v, keys));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withKeys(v, keys)]));
  return value;
}
function collectFiles(value: unknown, kind: KindOf, into: Map<string, 'image' | 'model'>) {
  const found = typeof value === 'string' ? kind(value) : undefined;
  if (found) into.set(value as string, found);
  else if (Array.isArray(value)) for (const v of value) collectFiles(v, kind, into);
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) collectFiles(v, kind, into);
}

function bookShape(book: Scrapbook, keys: Map<string, string>, images: Set<string>): BookShape {
  const {pages, title, subtitle, visibility, ...rest} = book;
  return {
    title: (title.trim() || 'Untitled').slice(0, 80),
    subtitle: subtitle.slice(0, 120),
    // Only friends can ever see a book, and only once it has enough photos (canShareBook).
    visibility: visibility !== 'private' && canShareBook(book) ? 'friends' : 'private',
    cover: withKeys({...rest, localVisibility: visibility}, keys) as Record<string, unknown>,
    pages: pages.map(page => {
      const photos: PagePhoto[] = [];
      const elements: unknown[] = [];
      for (const el of page.elements) {
        if (el.type === 'photo' && images.has(el.src) && photos.length < LIMITS.photosPerPage) {
          const {src, ...layout} = el;
          photos.push({key: keys.get(src)!, slot: photos.length, layout});
        } else elements.push(withKeys(el, keys));
      }
      return {
        id: page.id,
        elements,
        paper: withKeys(
          {
            ...page.paper,
            pageId: page.id,
            titlePage: !!page.titlePage,
            backgroundStyle: page.backgroundStyle,
          },
          keys,
        ) as Record<string, unknown>,
        photos,
      };
    }),
  };
}

/** keyOf: the storage key of a file (assetKey from ../storage.ts). */
export async function buildSnapshot(
  state: AppState,
  keyOf: (src: string) => Promise<string>,
  kind: KindOf = dataKind,
): Promise<Snapshot> {
  const files = new Map<string, 'image' | 'model'>();
  collectFiles(state, kind, files);
  const images = new Set([...files].filter(([, k]) => k === 'image').map(([src]) => src));
  const keys = new Map<string, string>();
  for (const src of files.keys()) keys.set(src, await keyOf(src));

  const photos = new Set<string>();
  const addPhoto = (src: unknown) => {
    if (typeof src === 'string' && images.has(src)) photos.add(keys.get(src)!);
  };
  for (const p of state.archive ?? []) addPhoto(p.src);
  for (const b of state.books ?? [])
    for (const pg of b.pages) for (const el of pg.elements) if (el.type === 'photo') addPhoto(el.src);
  for (const pin of state.pins ?? []) addPhoto(pin.photoSrc);

  // Books are rows of their own; originalFiles only exists inside downloaded backups.
  const {books, originalFiles: _originals, environment, roomDecor, ownedRoomThemes, ...rest} = state;
  return {
    room: {
      theme: environment?.roomTheme ?? 'woodland',
      settings: withKeys({environment, roomDecor, ownedRoomThemes}, keys) as Record<string, unknown>,
      private: withKeys(rest, keys) as Record<string, unknown>,
    },
    books: Object.fromEntries((books ?? []).map(b => [b.id, bookShape(b, keys, images)])),
    photos: [...photos],
  };
}

export type Change =
  | {kind: 'photo'; key: string}
  | {kind: 'photo-trash'; key: string}
  | {kind: 'room'}
  | {kind: 'book'; id: string}
  | {kind: 'book-trash'; id: string};

export const changeKey = (c: Change) =>
  c.kind === 'room' ? 'room' : `${c.kind}:${'key' in c ? c.key : c.id}`;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** What changed between the last queued snapshot and this one. Deletions only ever move things to the
 * server's 30-day trash; nothing here deletes or changes anything on this device. */
export function diffSnapshots(before: Snapshot | null, after: Snapshot): Change[] {
  const changes: Change[] = [];
  const oldPhotos = new Set(before?.photos ?? []);
  const newPhotos = new Set(after.photos);
  for (const key of after.photos) if (!oldPhotos.has(key)) changes.push({kind: 'photo', key});
  if (!before || !same(before.room, after.room)) changes.push({kind: 'room'});
  for (const [id, book] of Object.entries(after.books))
    if (!before || !same(before.books[id], book)) changes.push({kind: 'book', id});
  for (const id of Object.keys(before?.books ?? {}))
    if (!(id in after.books)) changes.push({kind: 'book-trash', id});
  for (const key of oldPhotos) if (!newPhotos.has(key)) changes.push({kind: 'photo-trash', key});
  return changes;
}

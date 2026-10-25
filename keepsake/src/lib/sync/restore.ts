import type {AppState} from '../../types/app';
import type {Page, PageElement, Scrapbook} from '../../types/scrapbook';

/**
 * Rebuilds a local room from the copy in an account (bringing a room to a new device). Pure: it only turns
 * server rows and downloaded photos into a room. Anything whose file is not on the server (a photo still
 * being processed or refused, card art, 3D scans) is left out and counted, never left as a broken reference:
 * a reference to a missing file would stop the room from loading.
 */
export interface ServerRoomData {
  revision: number;
  theme: string;
  settings: Record<string, unknown>;
  private: Record<string, unknown>;
  books: {
    id: string;
    title: string;
    subtitle: string;
    visibility: 'private' | 'friends';
    cover: Record<string, unknown>;
    pages: {
      id: string;
      position: number;
      elements: unknown[];
      paper: Record<string, unknown>;
      photos: {photo_id: string; slot: number; layout: Record<string, unknown>}[];
    }[];
  }[];
  /** Photos downloaded as data URLs. sourceKey is the device key the photo was uploaded under. */
  photos: {id: string; sourceKey: string | null; data: string}[];
}
export interface Restored {
  state: AppState;
  /** Local id -> server id, so later backups update these rows instead of making new ones. */
  ids: Record<string, string>;
  /** Server photo id for each file now in the room, by its data URL. */
  photoIdByData: Map<string, string>;
  missing: number;
}

const PREFIX = 'keepsake-asset:';
const FILE_FIELDS = ['src', 'photoSrc', 'coverSrc', 'backSrc', 'modelSrc'];
const isKey = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PREFIX);

export function fromServer(data: ServerRoomData): Restored {
  const byKey = new Map<string, {id: string; data: string}>();
  const photoIdByData = new Map<string, string>();
  for (const p of data.photos) {
    if (p.sourceKey) byKey.set(PREFIX + p.sourceKey, {id: p.id, data: p.data});
    photoIdByData.set(p.data, p.id);
  }
  let missing = 0;
  const resolve = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const out = [];
      for (const item of value) {
        // A list item whose own file is missing (an archive photo, a scan) is left out as a whole.
        if (
          item &&
          typeof item === 'object' &&
          FILE_FIELDS.some(f => isKey((item as Record<string, unknown>)[f]))
        ) {
          const fields = item as Record<string, unknown>;
          if (FILE_FIELDS.some(f => isKey(fields[f]) && !byKey.has(fields[f] as string))) {
            missing++;
            continue;
          }
        }
        out.push(resolve(item));
      }
      return out;
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (isKey(v)) {
          const file = byKey.get(v);
          if (file) out[k] = file.data;
          else missing++; // the field is dropped (for example a pin keeps its caption without its photo)
        } else out[k] = resolve(v);
      }
      return out;
    }
    if (isKey(value)) return byKey.get(value)?.data ?? null;
    return value;
  };
  const photoById = new Map(data.photos.map(p => [p.id, p.data]));
  const ids: Record<string, string> = {};

  const books: Scrapbook[] = data.books.map(b => {
    const {localVisibility, ...cover} = resolve(b.cover) as Record<string, unknown>;
    const id = typeof cover.id === 'string' ? cover.id : b.id;
    ids[`book:${id}`] = b.id;
    const pages: Page[] = [...b.pages]
      .sort((x, y) => x.position - y.position)
      .map(pg => {
        const {pageId, titlePage, backgroundStyle, ...paper} = resolve(pg.paper) as Record<string, unknown>;
        const localId = typeof pageId === 'string' ? pageId : pg.id;
        ids[`page:${localId}`] = pg.id;
        const photos: PageElement[] = [];
        for (const ph of [...pg.photos].sort((x, y) => x.slot - y.slot)) {
          const src = photoById.get(ph.photo_id);
          const {key: _key, ...layout} = ph.layout;
          if (src) photos.push({...layout, src} as unknown as PageElement);
          else missing++;
        }
        const page: Page = {
          id: localId,
          elements: [...photos, ...(resolve(pg.elements) as PageElement[])],
        };
        if (titlePage) page.titlePage = true;
        if (typeof backgroundStyle === 'string') page.backgroundStyle = backgroundStyle;
        if (Object.keys(paper).length) page.paper = paper as unknown as Page['paper'];
        return page;
      });
    return {
      ...(cover as unknown as Scrapbook),
      id,
      title: b.title,
      subtitle: b.subtitle,
      visibility: (localVisibility as Scrapbook['visibility']) ?? b.visibility,
      pages,
    };
  });

  const state = {
    ...(resolve(data.private) as Record<string, unknown>),
    ...(resolve(data.settings) as Record<string, unknown>),
    books,
  } as unknown as AppState;
  // Full-size originals never leave the device they were added on; the account holds the display copy only,
  // so a photo must not point at an original this device does not have.
  if (Array.isArray(state.archive)) state.archive = state.archive.map(({original: _original, ...p}) => p);
  return {state, ids, photoIdByData, missing};
}

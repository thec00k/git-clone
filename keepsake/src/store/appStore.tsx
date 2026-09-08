import {musicOnEntry} from '../lib/roomMusic';
import {ownsRoomTheme} from '../lib/roomThemes';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  AppState,
  ArchivePhoto,
  ArchiveTab,
  Environment,
  MemoryPin,
  PinNote,
  Profile,
  ViewAs,
} from "../types/app";
import {canLeaveBookNote} from "../lib/permissions";
import { PIN_NOTE_MAX, TIDY_ROOM, STICKY_NOTE_MAX } from "../types/app";
import type {
  CoverStyle,
  SaveStatus,
  Scrapbook,
  Visibility,
} from "../types/scrapbook";
import { uid } from "../lib/id";
import { createSeed } from "../data/seed";
import { loadState, saveState, SaveConflict } from "../lib/storage";
import { downloadRoom } from "../lib/roomBackup";
import { evaluate } from "../lib/achievements";
import {baseline} from '../lib/discoveries';
import type { Progress } from "../types/app";
import { EVERYDAY_PACK_ID, STARTING_STAMPS, packById } from "../lib/stickerPacks";

interface AppContextValue {
  state: AppState;
  saveStatus: SaveStatus;
  newlyUnlocked: string[];
  clearNewlyUnlocked: () => void;
  activeBook: Scrapbook | null;
  environment: Environment;

  update: (fn: (prev: AppState) => AppState) => void;
  updateActiveBook: (fn: (b: Scrapbook) => Scrapbook) => void;

  setProfile: (patch: Partial<Profile>) => void;
  setActiveBook: (id: string) => void;
  addBook: () => string;
  renameBook: (id: string, title: string, subtitle: string) => void;
  deleteBook: (id: string) => void;
  setBookVisibility: (id: string, v: Visibility) => void;
  setBookCover: (id: string, c: CoverStyle) => void;
  setBookPlaylist: (id: string, uri: string | undefined) => void;
  setBookShelf: (id: string, pos: { shelfRow: number; shelfX: number }) => void;

  addArchivePhoto: (src: string, aspect: number, categories?: string[]) => string;
  toggleFavorite: (id: string) => void;
  setCategories: (id: string, categories: string[]) => void;
  addArchiveTab: (name: string) => string;
  renameArchiveTab: (id: string, name: string) => void;
  removeArchiveTab: (id: string) => void;

  setEnvironment: (patch: Partial<Environment>) => void;
  tidyRoom: () => Promise<boolean>;
  flushSave: (transform?: (state: AppState) => AppState) => Promise<boolean>;
  restoreRoom: (state: AppState) => Promise<void>;

  addGuestEntry: (author: string, message: string,deskCopy?:boolean) => void;
  addNote: (bookId: string, pageId: string, author: string, message: string, viewer?: ViewAs) => void;
  approveNote: (id: string) => void;
  deleteNote: (id: string) => void;
  addPin: (pin: Omit<MemoryPin, "id" | "createdAt">) => void;
  updatePin: (id: string, patch: Partial<Omit<MemoryPin, "id" | "createdAt">>) => void;
  removePin: (id: string) => void;
  addPinNote: (pinId: string, author: string, message: string) => void;
  updatePinNote: (id: string, message: string) => void;
  deletePinNote: (id: string) => void;

  recordProgress: (patch: Partial<Progress>) => void;
  markAchievementsSeen: (ids: string[]) => void;
  recordReceipt: (id: string) => void;
  buyStickerPack: (id: string) => "ok" | "owned" | "short";
}

function deriveArchiveTabs(archive: ArchivePhoto[], tabs?: ArchiveTab[]): ArchiveTab[] {
  const have = new Map((tabs ?? []).map((t) => [t.id, t]));
  for (const id of archive.flatMap((a) => a.categories)) {
    if (!have.has(id)) have.set(id, { id, name: id });
  }
  return [...have.values()];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const savedRef = useRef<AppState | null>(null);
  const blockedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const loadedRef = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const stateRef = useRef<AppState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadState();
      if (cancelled) return;
      // Drop the retired timeline field from older saves so it is not rewritten.
      if (stored && "timeline" in stored) {
        delete (stored as { timeline?: unknown }).timeline;
      }
      // Normalise older saved state that predates newer fields.
      const initial: AppState = stored
        ? {
            ...stored,
            environment: {
              ...stored.environment,
              musicProvider: stored.environment?.musicProvider ?? "ambient",
              pinsLocked: stored.environment?.pinsLocked ?? false,
              shelfLit: stored.environment?.shelfLit ?? true,
              ceilingOn: stored.environment?.ceilingOn ?? true,
            },
            achievementsAt: stored.achievementsAt ?? {},
            achievementsSeen: stored.achievementsSeen ?? [],
            progress: {
              ...stored.progress,
              visitedAtNight: stored.progress?.visitedAtNight ?? false,
              previewedAsVisitor: stored.progress?.previewedAsVisitor ?? false,
              completedTour: stored.progress?.completedTour ?? false,
            },
            receipts: stored.receipts ?? {},
            stamps: stored.stamps ?? STARTING_STAMPS,
            ownedStickerPacks: [...new Set([EVERYDAY_PACK_ID, ...(stored.ownedStickerPacks ?? [])])],
            pinNotes: stored.pinNotes ?? [],
            archiveTabs: deriveArchiveTabs(stored.archive ?? [], stored.archiveTabs),
            books: (stored.books ?? []).map((b, i) => ({
              ...b,
              shelfRow: b.shelfRow ?? i % 3,
              shelfX: b.shelfX ?? Math.min(82, 8 + (i % 6) * 14),
            })),
          }
        : createSeed();
      if(!initial.achievementBaseline)initial.achievementBaseline=baseline(initial);
      if (!initial.ownedRoomThemes && initial.environment.roomTheme === 'beachfront') {
        initial.ownedRoomThemes = ['woodland','beachfront'];
        initial.environment = {...initial.environment, crtColor:'coastal'};
      }
      setState(musicOnEntry(initial));
      loadedRef.current = true;
    })().catch(error => { if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Your saved room could not be read.'); });
    return () => { cancelled = true; };
  }, [retry]);

  const persist = useCallback(async (snapshot: AppState) => {
    if (blockedRef.current) return false;
    try {
      await saveState(snapshot);
      savedRef.current = snapshot;
      if (stateRef.current === snapshot) setSaveStatus('saved');
      return true;
    } catch (error) {
      setSaveStatus('error');
      if (error instanceof SaveConflict) { blockedRef.current = true; setConflict(true); }
      return false;
    }
  }, []);

  useEffect(() => {
    const pending = () => !!stateRef.current && stateRef.current !== savedRef.current;
    const flush = () => { if (pending() && !blockedRef.current) { window.clearTimeout(saveTimer.current); void persist(stateRef.current!); } };
    const hide = () => { if (document.hidden) flush(); };
    const leave = (event: BeforeUnloadEvent) => { if (pending()) { flush(); event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', hide);
    return () => { window.removeEventListener('beforeunload', leave); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hide); };
  }, [persist]);

  // Achievement ledger: grants are derived from state (idempotent), stamped
  // with a completion time; then autosave (debounced).
  useEffect(() => {
    if (!state || !loadedRef.current || blockedRef.current) return;
    const satisfied = evaluate(state);
    const merged = [...new Set([...state.achievements, ...satisfied])];
    if (merged.length !== state.achievements.length) {
      const added = merged.filter((id) => !state.achievements.includes(id));
      const now = Date.now();
      const at = { ...state.achievementsAt };
      added.forEach((id) => {
        if (!at[id]) at[id] = now;
      });
      setNewlyUnlocked((n) => [...n, ...added]);
      setState((prev) => (prev ? { ...prev, achievements: merged, achievementsAt: at } : prev));
      return;
    }
    setSaveStatus("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist(state);
    }, 450);
    return () => window.clearTimeout(saveTimer.current);
  }, [state, persist]);

  const restoreRoom = useCallback(async (next: AppState) => {
    next={...next,achievementBaseline:next.achievementBaseline??baseline(next)};
    window.clearTimeout(saveTimer.current);
    if (!await persist(next)) throw new Error("The restored room could not be saved.");
    stateRef.current=next;setState(next);setNewlyUnlocked([]);setSaveStatus('saved');
  }, [persist]);
  const update = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => (prev ? fn(prev) : prev));
  }, []);

  const updateActiveBook = useCallback(
    (fn: (b: Scrapbook) => Scrapbook) => {
      setState((prev) => {
        if (!prev || !prev.activeBookId) return prev;
        return {
          ...prev,
          books: prev.books.map((b) =>
            b.id === prev.activeBookId ? { ...fn(b), updatedAt: Date.now() } : b,
          ),
        };
      });
    },
    [],
  );

  const setProfile = useCallback((patch: Partial<Profile>) => update((p) => ({ ...p, profile: { ...p.profile, ...patch } })), [update]);
  const setActiveBook = useCallback((id: string) => update((p) => ({ ...p, activeBookId: id })), [update]);

  const addBook = useCallback(() => {
    const id = uid("book");
    update((p) => ({
      ...p,
      activeBookId: id,
      books: [
        ...p.books,
        {
          id,
          title: "New book",
          subtitle: "untitled",
          coverStyle: "forest",
          visibility: "private",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pages: [
            { id: uid("page"), titlePage: true, elements: [] },
            { id: uid("page"), elements: [] },
          ],
          shelfRow: p.books.length % 3,
          shelfX: Math.min(82, 8 + (p.books.length % 6) * 14),
        },
      ],
    }));
    return id;
  }, [update]);

  const renameBook = useCallback(
    (id: string, title: string, subtitle: string) =>
      update((p) => ({ ...p, books: p.books.map((b) => (b.id === id ? { ...b, title, subtitle } : b)) })),
    [update],
  );

  const setBookShelf = useCallback(
    (id: string, pos: { shelfRow: number; shelfX: number }) =>
      update((p) => ({
        ...p,
        books: p.books.map((b) =>
          b.id === id ? { ...b, shelfRow: pos.shelfRow, shelfX: pos.shelfX } : b,
        ),
      })),
    [update],
  );

  const deleteBook = useCallback(
    (id: string) =>
      update((p) => {
        const books = p.books.filter((b) => b.id !== id);
        return {
          ...p,
          books,
          activeBookId: p.activeBookId === id ? (books[0]?.id ?? null) : p.activeBookId,
        };
      }),
    [update],
  );

  const setBookVisibility = useCallback(
    (id: string, v: Visibility) => update((p) => ({ ...p, books: p.books.map((b) => (b.id === id ? { ...b, visibility: v } : b)) })),
    [update],
  );

  const setBookCover = useCallback(
    (id: string, c: CoverStyle) => update((p) => ({ ...p, books: p.books.map((b) => (b.id === id ? { ...b, coverStyle: c } : b)) })),
    [update],
  );

  const setBookPlaylist = useCallback(
    (id: string, uri: string | undefined) =>
      update((p) => ({ ...p, books: p.books.map((b) => (b.id === id ? { ...b, playlistUri: uri } : b)) })),
    [update],
  );

  const addArchivePhoto = useCallback(
    (src: string, aspect: number, categories: string[] = []) => {
      const id = uid("ph");
      update((p) => ({
        ...p,
        archive: [{ id, src, aspect, createdAt: Date.now(), categories, favorite: false }, ...p.archive],
      }));
      return id;
    },
    [update],
  );

  const toggleFavorite = useCallback(
    (id: string) => update((p) => ({ ...p, archive: p.archive.map((a) => (a.id === id ? { ...a, favorite: !a.favorite } : a)) })),
    [update],
  );

  const setCategories = useCallback(
    (id: string, categories: string[]) => update((p) => ({ ...p, archive: p.archive.map((a) => (a.id === id ? { ...a, categories } : a)) })),
    [update],
  );

  const addArchiveTab = useCallback(
    (name: string) => {
      const id = uid("tab");
      update((p) => ({ ...p, archiveTabs: [...p.archiveTabs, { id, name: name.trim() || "untitled" }] }));
      return id;
    },
    [update],
  );

  const renameArchiveTab = useCallback(
    (id: string, name: string) =>
      update((p) => ({
        ...p,
        archiveTabs: p.archiveTabs.map((t) => (t.id === id ? { ...t, name: name.trim() || t.name } : t)),
      })),
    [update],
  );

  const removeArchiveTab = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        archiveTabs: p.archiveTabs.filter((t) => t.id !== id),
        archive: p.archive.map((a) => ({ ...a, categories: a.categories.filter((c) => c !== id) })),
      })),
    [update],
  );

  const setEnvironment = useCallback((patch: Partial<Environment>) => update((p) => {
    if (patch.crtColor === 'coastal' && !ownsRoomTheme(p,'beachfront')) return p;
    return {...p, environment: {...p.environment,...patch}};
  }), [update]);

  const flushSave = useCallback(async (transform?: (state: AppState) => AppState) => {
    const current = stateRef.current;
    if (!current) return false;
    const snap = transform ? transform(current) : current;
    if (transform) { stateRef.current = snap; setState(snap); }
    window.clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    try {
      return await persist(snap);
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, [persist]);

  const tidyRoom = useCallback(
    () => flushSave(p => ({ ...p, environment: { ...p.environment, ...TIDY_ROOM } })),
    [flushSave],
  );

  const addGuestEntry = useCallback(
    (author: string, message: string,deskCopy=false) =>
      update((p) => ({ ...p, guestbook: [{ id: uid("g"), author, message,deskCopy,createdAt: Date.now() }, ...p.guestbook] })),
    [update],
  );

  const addNote = useCallback(
    (bookId: string, pageId: string, author: string, message: string, viewer: ViewAs = 'public') =>
      update(p => {
        const book=p.books.find(b=>b.id===bookId),text=message.trim();
        if(!book || !canLeaveBookNote(book.visibility,viewer,p.profile.allowFriendScrapbooks===true) || !book.pages.some(page=>page.id===pageId) || !text || Array.from(text).length>STICKY_NOTE_MAX) return p;
        return {...p,notes:[{id:uid('note'),bookId,pageId,author,message:text,approved:false,createdAt:Date.now()},...p.notes]};
      }),
    [update],
  );

  const approveNote = useCallback(
    (id: string) => update((p) => ({ ...p, notes: p.notes.map((n) => (n.id === id ? { ...n, approved: true } : n)) })),
    [update],
  );

  const deleteNote = useCallback(
    (id: string) => update((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) })),
    [update],
  );

  const addPin = useCallback(
    (pin: Omit<MemoryPin, "id" | "createdAt">) =>
      update((p) => ({ ...p, pins: [...p.pins, { ...pin, id: uid("pin"), createdAt: Date.now() }] })),
    [update],
  );

  const updatePin = useCallback(
    (id: string, patch: Partial<Omit<MemoryPin, "id" | "createdAt">>) =>
      update((p) => ({
        ...p,
        pins: p.pins.map((pin) => (pin.id === id ? { ...pin, ...patch } : pin)),
      })),
    [update],
  );

  const removePin = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        pins: p.pins.filter((x) => x.id !== id),
        pinNotes: p.pinNotes.filter((n) => n.pinId !== id),
      })),
    [update],
  );

  const addPinNote = useCallback(
    (pinId: string, author: string, message: string) => {
      const text = message.trim().slice(0, PIN_NOTE_MAX);
      if (!text) return;
      update((p) => {
        const list = p.pinNotes ?? [];
        const existing = list.find((n) => n.pinId === pinId && n.author === author);
        if (existing) {
          return { ...p, pinNotes: list.map((n) => (n.id === existing.id ? { ...n, message: text } : n)) };
        }
        const note: PinNote = { id: uid("pnote"), pinId, author, message: text, createdAt: Date.now() };
        return { ...p, pinNotes: [...list, note] };
      });
    },
    [update],
  );

  const updatePinNote = useCallback(
    (id: string, message: string) => {
      const text = message.trim().slice(0, PIN_NOTE_MAX);
      if (!text) return;
      update((p) => ({ ...p, pinNotes: p.pinNotes.map((n) => (n.id === id ? { ...n, message: text } : n)) }));
    },
    [update],
  );

  const deletePinNote = useCallback(
    (id: string) => update((p) => ({ ...p, pinNotes: p.pinNotes.filter((n) => n.id !== id) })),
    [update],
  );

  const recordProgress = useCallback(
    (patch: Partial<Progress>) =>
      setState((prev) => {
        if (!prev) return prev;
        const next = { ...prev.progress, ...patch };
        // avoid needless updates (keeps the save/eval loop calm)
        if (
          next.visitedAtNight === prev.progress.visitedAtNight &&
          next.previewedAsVisitor === prev.progress.previewedAsVisitor &&
          next.completedTour === prev.progress.completedTour
        ) {
          return prev;
        }
        return { ...prev, progress: next };
      }),
    [],
  );

  const markAchievementsSeen = useCallback(
    (ids: string[]) =>
      update((p) => ({ ...p, achievementsSeen: [...new Set([...p.achievementsSeen, ...ids])] })),
    [update],
  );

  const recordReceipt = useCallback(
    (id: string) => update((p) => ({ ...p, receipts: { ...p.receipts, [id]: Date.now() } })),
    [update],
  );

  const buyStickerPack = useCallback((id: string): "ok" | "owned" | "short" => {
    const pack = packById(id);
    if (!pack || pack.price <= 0) return "owned";
    let result: "ok" | "owned" | "short" = "short";
    update((p) => {
      if (p.ownedStickerPacks.includes(id)) {
        result = "owned";
        return p;
      }
      if (p.stamps < pack.price) {
        result = "short";
        return p;
      }
      result = "ok";
      return {
        ...p,
        stamps: p.stamps - pack.price,
        ownedStickerPacks: [...p.ownedStickerPacks, id],
      };
    });
    return result;
  }, [update]);

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  const activeBook = useMemo(
    () => state?.books.find((b) => b.id === state.activeBookId) ?? null,
    [state],
  );

  if (loadError) return <div className="ks-save-recovery" role="alert"><h1>Your room could not be opened</h1><p>{loadError}</p><p>Your existing save has not been replaced. Close other Keepsake tabs if necessary, then try again.</p><button className="ks-tool" onClick={() => { setLoadError(''); setRetry(n => n + 1); }}>Retry opening room</button></div>;
  if (!state) {
    return (
      <div className="ks-room flex h-dvh items-center justify-center text-paper/60">
        Opening the room…
      </div>
    );
  }

  const value: AppContextValue = {
    state,
    saveStatus,
    newlyUnlocked,
    clearNewlyUnlocked,
    activeBook,
    environment: state.environment,
    update,
    updateActiveBook,
    setProfile,
    setActiveBook,
    addBook,
    renameBook,
    deleteBook,
    setBookVisibility,
    setBookCover,
    setBookPlaylist,
    setBookShelf,
    addArchivePhoto,
    toggleFavorite,
    setCategories,
    addArchiveTab,
    renameArchiveTab,
    removeArchiveTab,
    setEnvironment,
    tidyRoom,
    flushSave,
    restoreRoom,
    addGuestEntry,
    addNote,
    approveNote,
    deleteNote,
    addPin,
    updatePin,
    removePin,
    addPinNote,
    updatePinNote,
    deletePinNote,
    recordProgress,
    markAchievementsSeen,
    recordReceipt,
    buyStickerPack,
  };

  return <AppContext.Provider value={value}>{conflict ? <div className="ks-save-recovery" role="alert"><h1>This room changed in another tab</h1><p>Saving in this tab has stopped to protect the newer room. Download this tab’s changes before reloading if you want to keep them.</p><button className="ks-tool" onClick={() => downloadRoom(state)}>Download this tab’s room</button><button className="ks-tool" onClick={() => { savedRef.current = stateRef.current; window.location.reload(); }}>Reload latest saved room</button></div> : children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

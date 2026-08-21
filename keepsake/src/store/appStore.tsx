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
  Environment,
  MemoryPin,
  Profile,
} from "../types/app";
import type {
  CoverStyle,
  SaveStatus,
  Scrapbook,
  Visibility,
} from "../types/scrapbook";
import { uid } from "../lib/id";
import { createSeed } from "../data/seed";
import { loadState, saveState } from "../lib/storage";

function computeAutoUnlocks(s: AppState): string[] {
  const ids = new Set(s.achievements);
  const anyPhoto = s.books.some((b) => b.pages.some((p) => p.elements.some((e) => e.type === "photo")));
  if (anyPhoto) ids.add("first-photo");
  const fullPage = s.books.some((b) =>
    b.pages.some((p) => p.elements.filter((e) => e.type === "photo").length >= 3),
  );
  if (fullPage) ids.add("full-spread");
  const anyCaption = s.books.some((b) =>
    b.pages.some((p) => p.elements.some((e) => e.type === "caption")),
  );
  if (anyCaption) ids.add("wordsmith");
  if (s.books.length > 1) ids.add("librarian");
  if (s.pins.length > 0) ids.add("cartographer");
  if (s.guestbook.length > 0) ids.add("keeper");
  return [...ids];
}

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

  addArchivePhoto: (src: string, aspect: number) => string;
  toggleFavorite: (id: string) => void;
  setCategories: (id: string, categories: string[]) => void;

  setEnvironment: (patch: Partial<Environment>) => void;

  addGuestEntry: (author: string, message: string) => void;
  addNote: (bookId: string, pageId: string, author: string, message: string) => void;
  approveNote: (id: string) => void;
  deleteNote: (id: string) => void;
  addPin: (pin: Omit<MemoryPin, "id" | "createdAt">) => void;
  removePin: (id: string) => void;

  unlock: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const loadedRef = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadState();
      if (cancelled) return;
      // Normalise older saved state that predates newer fields.
      const initial = stored
        ? {
            ...stored,
            environment: {
              ...stored.environment,
              musicProvider: stored.environment?.musicProvider ?? "ambient",
            },
          }
        : createSeed();
      setState(initial);
      loadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-unlock data-derived achievements, then autosave (debounced).
  useEffect(() => {
    if (!state || !loadedRef.current) return;
    const unlocks = computeAutoUnlocks(state);
    if (unlocks.length !== state.achievements.length) {
      const added = unlocks.filter((u) => !state.achievements.includes(u));
      if (added.length) setNewlyUnlocked((n) => [...n, ...added]);
      setState((prev) => (prev ? { ...prev, achievements: unlocks } : prev));
      return;
    }
    setSaveStatus("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveState(state)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 450);
    return () => window.clearTimeout(saveTimer.current);
  }, [state]);

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
    (src: string, aspect: number) => {
      const id = uid("ph");
      update((p) => ({
        ...p,
        archive: [{ id, src, aspect, createdAt: Date.now(), categories: [], favorite: false }, ...p.archive],
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

  const setEnvironment = useCallback((patch: Partial<Environment>) => update((p) => ({ ...p, environment: { ...p.environment, ...patch } })), [update]);

  const addGuestEntry = useCallback(
    (author: string, message: string) =>
      update((p) => ({ ...p, guestbook: [{ id: uid("g"), author, message, createdAt: Date.now() }, ...p.guestbook] })),
    [update],
  );

  const addNote = useCallback(
    (bookId: string, pageId: string, author: string, message: string) =>
      update((p) => ({
        ...p,
        notes: [
          { id: uid("note"), bookId, pageId, author, message, approved: false, createdAt: Date.now() },
          ...p.notes,
        ],
      })),
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

  const removePin = useCallback((id: string) => update((p) => ({ ...p, pins: p.pins.filter((x) => x.id !== id) })), [update]);

  const unlock = useCallback(
    (id: string) =>
      setState((prev) => {
        if (!prev || prev.achievements.includes(id)) return prev;
        setNewlyUnlocked((n) => [...n, id]);
        return { ...prev, achievements: [...prev.achievements, id] };
      }),
    [],
  );

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  const activeBook = useMemo(
    () => state?.books.find((b) => b.id === state.activeBookId) ?? null,
    [state],
  );

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
    addArchivePhoto,
    toggleFavorite,
    setCategories,
    setEnvironment,
    addGuestEntry,
    addNote,
    approveNote,
    deleteNote,
    addPin,
    removePin,
    unlock,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

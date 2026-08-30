import { useMemo, useRef, useState } from "react";
import { BookPlus, Check, Heart, Lock, Pencil, Plus, Search, Upload, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { loadImageFile } from "../../lib/image";
import { uid } from "../../lib/id";
import type { PhotoElement } from "../../types/scrapbook";
import { ViewShell } from "./ViewShell";

type TabKey = "all" | "favorites" | string;

export function Archive() {
  const {
    state,
    activeBook,
    addArchivePhoto,
    toggleFavorite,
    updateActiveBook,
    setCategories,
    addArchiveTab,
    renameArchiveTab,
    removeArchiveTab,
  } = useApp();
  const { isVisitor } = useNav();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const tabs = state.archiveTabs;

  const recent = useMemo(
    () => [...state.archive].sort((a, b) => b.createdAt - a.createdAt),
    [state.archive],
  );

  const filtered = recent.filter((a) => {
    if (tab === "favorites" && !a.favorite) return false;
    if (tab !== "all" && tab !== "favorites" && !a.categories.includes(tab)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const names = a.categories.map((id) => tabs.find((t) => t.id === id)?.name ?? id).join(" ");
    if (a.favorite && ("favourites".includes(q) || "favorites".includes(q))) return true;
    return names.toLowerCase().includes(q);
  });

  async function upload(files: FileList | null) {
    if (!files) return;
    const cats = tab !== "all" && tab !== "favorites" ? [tab] : [];
    for (const f of Array.from(files)) {
      try {
        const { src, aspect } = await loadImageFile(f);
        addArchivePhoto(src, aspect, cats);
      } catch {
        /* ignore */
      }
    }
  }

  function placeInBook(src: string, photoId: string) {
    if (!activeBook) return;
    updateActiveBook((b) => {
      const pages = [...b.pages];
      const target = pages[pages.length - 1];
      const el: PhotoElement = {
        id: uid("el"),
        type: "photo",
        src,
        photoId,
        x: 50,
        y: 45,
        w: 46,
        rotation: -3,
        z: (target.elements.reduce((m, e) => Math.max(m, e.z), 0) || 0) + 1,
        frame: "polaroid",
      };
      pages[pages.length - 1] = { ...target, elements: [...target.elements, el] };
      return { ...b, pages };
    });
  }

  function startRename(id: string, name: string) {
    setEditingId(id);
    setDraftName(name);
  }

  function commitRename() {
    if (editingId && draftName.trim()) renameArchiveTab(editingId, draftName.trim());
    setEditingId(null);
  }

  function commitNewTab() {
    const name = newName.trim();
    if (name) {
      const id = addArchiveTab(name);
      setTab(id);
    }
    setNewName("");
    setAdding(false);
  }

  function toggleTabOnPhoto(photoId: string, tabId: string, current: string[]) {
    const next = current.includes(tabId) ? current.filter((c) => c !== tabId) : [...current, tabId];
    setCategories(photoId, next);
  }

  if (isVisitor) {
    return (
      <ViewShell title="The archive" subtitle="filing cabinet">
        <div className="mt-16 flex flex-col items-center gap-3 text-paper/60">
          <Lock size={26} /> The archive is private.
        </div>
      </ViewShell>
    );
  }

  return (
    <ViewShell
      title="The archive"
      subtitle="every photograph you've kept"
      actions={
        <button className="ks-tool ks-tool--accent" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> Upload
        </button>
      }
    >
      <input ref={inputRef} type="file" accept="image/*" multiple hidden aria-label="Upload photographs" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />

      <div className="mt-3 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5">
        <Search size={15} className="text-paper/50" />
        <input
          name="search"
          aria-label="Search photos by tab"
          className="w-full bg-transparent text-paper outline-none"
          placeholder="search by tab…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Archive tabs">
        <button className={`ks-tool ${tab === "all" ? "ks-tool--accent" : ""}`} role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>
          All
        </button>
        <button className={`ks-tool ${tab === "favorites" ? "ks-tool--accent" : ""}`} role="tab" aria-selected={tab === "favorites"} onClick={() => setTab("favorites")}>
          <Heart size={13} fill={tab === "favorites" ? "currentColor" : "none"} /> Favourites
        </button>
        {tabs.map((t) =>
          editingId === t.id ? (
            <span key={t.id} className="flex items-center gap-1">
              <input
                className="w-28 rounded bg-black/30 px-2 py-1 text-sm text-paper outline-none"
                value={draftName}
                aria-label="Tab name"
                autoFocus
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <button className="ks-chip h-7 w-7" aria-label="Save tab name" onClick={commitRename}>
                <Check size={13} />
              </button>
            </span>
          ) : (
            <span key={t.id} className="flex items-center">
              <button className={`ks-tool ${tab === t.id ? "ks-tool--accent" : ""}`} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.name}
              </button>
              <button className="ml-0.5 text-paper/40 hover:text-paper" aria-label={`Rename ${t.name}`} onClick={() => startRename(t.id, t.name)}>
                <Pencil size={11} />
              </button>
              <button className="text-paper/30 hover:text-accent" aria-label={`Remove ${t.name} tab`} onClick={() => { if (tab === t.id) setTab("all"); removeArchiveTab(t.id); }}>
                <X size={12} />
              </button>
            </span>
          ),
        )}
        {adding ? (
          <span className="flex items-center gap-1">
            <input
              className="w-28 rounded bg-black/30 px-2 py-1 text-sm text-paper outline-none"
              placeholder="tab name"
              aria-label="New tab name"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewTab();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <button className="ks-chip h-7 w-7" aria-label="Create tab" onClick={commitNewTab}>
              <Check size={13} />
            </button>
          </span>
        ) : (
          <button className="ks-tool" onClick={() => setAdding(true)}>
            <Plus size={13} /> New tab
          </button>
        )}
      </div>

      <p className="mt-4 mb-2 text-sm text-paper/50">
        {filtered.length} photo{filtered.length === 1 ? "" : "s"} · newest first
        {tab !== "all" && tab !== "favorites" ? " · uploads join this tab" : ""}
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {filtered.map((a) => (
          <div key={a.id} className="ks-panel overflow-hidden">
            <div className="aspect-square w-full overflow-hidden">
              <img src={a.src} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <button
                className={`ks-chip h-8 w-8 ${a.favorite ? "!bg-seal" : ""}`}
                title="Favourite"
                aria-label={a.favorite ? "Remove from favourites" : "Add to favourites"}
                aria-pressed={a.favorite}
                onClick={() => toggleFavorite(a.id)}
              >
                <Heart size={14} fill={a.favorite ? "currentColor" : "none"} />
              </button>
              <button
                className="ks-chip h-8 w-8"
                title="Place in current book"
                aria-label="Place in current book"
                onClick={() => placeInBook(a.src, a.id)}
              >
                <BookPlus size={14} />
              </button>
            </div>
            {tabs.length > 0 && (
              <div className="flex flex-wrap gap-1 px-2 pb-2">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    className={`rounded-full px-1.5 py-0.5 text-[0.65rem] ${
                      a.categories.includes(t.id) ? "bg-accent/80 text-accent-fg" : "bg-black/25 text-paper/50"
                    }`}
                    aria-pressed={a.categories.includes(t.id)}
                    onClick={() => toggleTabOnPhoto(a.id, t.id, a.categories)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ViewShell>
  );
}

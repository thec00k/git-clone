import { useMemo, useRef, useState } from "react";
import { BookPlus, Heart, Lock, Search, Upload } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { loadImageFile } from "../../lib/image";
import { uid } from "../../lib/id";
import type { PhotoElement } from "../../types/scrapbook";
import { ViewShell } from "./ViewShell";

export function Archive() {
  const { state, activeBook, addArchivePhoto, toggleFavorite, updateActiveBook } = useApp();
  const { isVisitor } = useNav();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => [...new Set(state.archive.flatMap((a) => a.categories))].sort(),
    [state.archive],
  );

  const recent = [...state.archive].sort((a, b) => b.createdAt - a.createdAt);
  const filtered = recent.filter((a) => {
    if (cat && !a.categories.includes(cat)) return false;
    if (query && !a.categories.join(" ").toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  async function upload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        const { src, aspect } = await loadImageFile(f);
        addArchivePhoto(src, aspect);
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
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />

      <div className="mt-3 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5">
        <Search size={15} className="text-paper/50" />
        <input
          className="w-full bg-transparent text-paper outline-none"
          placeholder="search by category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button className={`ks-tool ${!cat ? "ks-tool--accent" : ""}`} onClick={() => setCat(null)}>All</button>
        {categories.map((c) => (
          <button key={c} className={`ks-tool ${cat === c ? "ks-tool--accent" : ""}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <p className="mt-4 mb-2 text-sm text-paper/50">
        {filtered.length} photo{filtered.length === 1 ? "" : "s"} · newest first
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
                onClick={() => toggleFavorite(a.id)}
              >
                <Heart size={14} fill={a.favorite ? "currentColor" : "none"} />
              </button>
              <button
                className="ks-chip h-8 w-8"
                title="Place in current book"
                onClick={() => placeInBook(a.src, a.id)}
              >
                <BookPlus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ViewShell>
  );
}

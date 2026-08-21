import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  ImagePlus,
  LayoutGrid,
  Plus,
  Rows3,
  Shuffle,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { useScrapbook } from "./hooks/useScrapbook";
import { loadImageFile } from "./lib/image";
import type { LayoutPreset } from "./lib/layout";
import { RoomFrame } from "./components/RoomFrame";
import { BookCover } from "./components/BookCover";
import { Spread } from "./components/Spread";
import { PageFlip } from "./components/PageFlip";
import { SelectionToolbar } from "./components/SelectionToolbar";
import { SaveIndicator } from "./components/SaveIndicator";

export default function App() {
  const sb = useScrapbook();
  const [opened, setOpened] = useState(false);
  const [turn, setTurn] = useState<{ dir: "next" | "prev" } | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const turningRef = useRef(false);

  const targetPageId = sb.activePageId ?? sb.leftPage?.id ?? sb.rightPage?.id ?? null;

  // Route navigation through a directional page turn (Bible §7); honour
  // reduced-motion by swapping instantly.
  const requestTurn = useCallback(
    (dir: "next" | "prev") => {
      if (turningRef.current) return;
      sb.setSelectedId(null);
      if (dir === "next" && sb.spread >= sb.spreadCount - 1) return;
      if (dir === "prev" && sb.spread <= 0) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        if (dir === "next") sb.goNext();
        else sb.goPrev();
        return;
      }
      turningRef.current = true;
      setTurn({ dir });
    },
    [sb],
  );

  // Idempotent commit (guards against transitionend + fallback both firing,
  // and StrictMode double-invocation). No side effects inside a setState updater.
  const finishTurn = useCallback(() => {
    if (!turningRef.current) return;
    turningRef.current = false;
    if (turn?.dir === "next") sb.goNext();
    else if (turn?.dir === "prev") sb.goPrev();
    setTurn(null);
  }, [turn, sb]);

  const applyPreset = (preset: LayoutPreset) => {
    const hasPhotos = (id: string | null | undefined) =>
      !!id && !!sb.pages.find((p) => p.id === id)?.elements.some((e) => e.type === "photo");
    // Prefer the active page, but if it has no photos (e.g. the title page),
    // fall back to whichever page in the open spread does.
    let pid = targetPageId;
    if (!hasPhotos(pid)) {
      pid = [sb.leftPage, sb.rightPage].find((p) => hasPhotos(p?.id))?.id ?? pid;
    }
    if (pid) sb.arrangePage(pid, preset);
    setShowPresets(false);
  };

  const otherIdx = turn ? (turn.dir === "next" ? sb.spread + 1 : sb.spread - 1) : sb.spread;
  const otherL = sb.pages[otherIdx * 2] ?? null;
  const otherR = sb.pages[otherIdx * 2 + 1] ?? null;

  async function handleFiles(files: FileList | null) {
    if (!files || !targetPageId) return;
    for (const file of Array.from(files)) {
      try {
        const { src } = await loadImageFile(file);
        sb.addPhoto(targetPageId, src);
      } catch {
        /* ignore unreadable files */
      }
    }
  }

  async function handleReplace(id: string, file: File) {
    try {
      const { src } = await loadImageFile(file);
      sb.updateElement(id, { src });
    } catch {
      /* ignore */
    }
  }

  // Keyboard: page turn with arrows; delete the selected element.
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (e.key === "ArrowLeft") requestTurn("prev");
      else if (e.key === "ArrowRight") requestTurn("next");
      else if ((e.key === "Delete" || e.key === "Backspace") && sb.selectedId) {
        e.preventDefault();
        sb.removeElement(sb.selectedId);
      } else if (e.key === "Escape") {
        sb.setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, sb, requestTurn]);

  if (!sb.book) {
    return (
      <RoomFrame>
        <div className="flex flex-1 items-center justify-center text-paper/60">
          Opening the room…
        </div>
      </RoomFrame>
    );
  }

  if (!opened) {
    return (
      <RoomFrame
        header={
          <p className="font-display text-sm uppercase tracking-[0.22em] text-paper/70">
            Keepsake
          </p>
        }
      >
        <BookCover
          title={sb.book.title}
          subtitle={sb.book.subtitle}
          onOpenAlbum={() => setOpened(true)}
          onCraft={() => setOpened(true)}
        />
      </RoomFrame>
    );
  }

  return (
    <RoomFrame
      header={
        <>
          <div className="flex items-center gap-3">
            <button
              className="ks-chip"
              title="Back to cover"
              onClick={() => {
                sb.setSelectedId(null);
                setOpened(false);
              }}
            >
              <Home size={16} />
            </button>
            <div className="leading-tight">
              <p className="font-display font-semibold text-paper">{sb.book.title}</p>
              <p className="ks-caption text-paper/70" style={{ fontSize: "1.1rem" }}>
                {sb.book.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              className="ks-chip"
              title="Previous"
              onClick={() => requestTurn("prev")}
              disabled={sb.spread === 0 || !!turn}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-14 text-center text-sm text-paper/70">
              {sb.spread + 1} / {sb.spreadCount}
            </span>
            <button
              className="ks-chip"
              title="Next"
              onClick={() => requestTurn("next")}
              disabled={sb.spread === sb.spreadCount - 1 || !!turn}
            >
              <ChevronRight size={16} />
            </button>
            <span className="mx-1 h-6 w-px bg-paper/15" />
            <button className="ks-chip" title="Add spread" onClick={sb.addSpread}>
              <Plus size={16} />
            </button>
            <button
              className="ks-chip hover:!bg-seal"
              title="Delete this spread"
              onClick={sb.deleteCurrentSpread}
              disabled={sb.spreadCount <= 1}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="hidden sm:block">
            <SaveIndicator status={sb.saveStatus} />
          </div>
        </>
      }
      footer={
        <div className="flex flex-col items-center gap-2 px-4 pb-4">
          {sb.selected && (
            <SelectionToolbar
              selected={sb.selected}
              onRotate={sb.rotateBy}
              onScale={sb.scaleBy}
              onReset={sb.resetTransform}
              onForward={sb.bringForward}
              onBackward={sb.sendBackward}
              onCycleFrame={sb.cycleFrame}
              onColor={(id, color) => sb.updateElement(id, { color })}
              onReplace={handleReplace}
              onDelete={sb.removeElement}
            />
          )}
          {showPresets && (
            <div
              data-no-drag
              className="flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-[rgb(28_22_16/0.92)] px-2 py-1.5 shadow-lg"
            >
              <span className="px-1 text-sm text-paper/60">Arrange photos:</span>
              <button className="ks-tool" onClick={() => applyPreset("grid")}>
                <LayoutGrid size={16} /> Grid
              </button>
              <button className="ks-tool" onClick={() => applyPreset("column")}>
                <Rows3 size={16} /> Column
              </button>
              <button className="ks-tool" onClick={() => applyPreset("scatter")}>
                <Shuffle size={16} /> Scatter
              </button>
            </div>
          )}
          <div className="ks-desk flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2">
            <button
              className="ks-tool ks-tool--accent"
              onClick={() => addInputRef.current?.click()}
            >
              <ImagePlus size={18} /> Add photo
            </button>
            <button
              className="ks-tool"
              onClick={() => targetPageId && sb.addCaption(targetPageId)}
            >
              <Type size={18} /> Add caption
            </button>
            <button className="ks-tool" onClick={() => setShowPresets((v) => !v)}>
              <Wand2 size={18} /> Arrange
            </button>
            <input
              ref={addInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      }
    >
      {turn ? (
        <PageFlip
          dir={turn.dir}
          curL={sb.leftPage}
          curR={sb.rightPage}
          otherL={otherL}
          otherR={otherR}
          bookTitle={sb.book.title}
          bookSubtitle={sb.book.subtitle}
          onDone={finishTurn}
        />
      ) : (
        <Spread
          leftPage={sb.leftPage}
          rightPage={sb.rightPage}
          activePageId={sb.activePageId}
          bookTitle={sb.book.title}
          bookSubtitle={sb.book.subtitle}
          selectedId={sb.selectedId}
          onActivate={sb.setActivePageId}
          onSelect={sb.setSelectedId}
          onDeselect={() => sb.setSelectedId(null)}
          onMove={(id, x, y) => sb.updateElement(id, { x, y })}
          onEditText={(id, text) => sb.updateElement(id, { text })}
        />
      )}
    </RoomFrame>
  );
}

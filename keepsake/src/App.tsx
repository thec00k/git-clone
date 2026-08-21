import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  ImagePlus,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { useScrapbook } from "./hooks/useScrapbook";
import { loadImageFile } from "./lib/image";
import { RoomFrame } from "./components/RoomFrame";
import { BookCover } from "./components/BookCover";
import { Spread } from "./components/Spread";
import { SelectionToolbar } from "./components/SelectionToolbar";
import { SaveIndicator } from "./components/SaveIndicator";

export default function App() {
  const sb = useScrapbook();
  const [opened, setOpened] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const targetPageId = sb.activePageId ?? sb.leftPage?.id ?? sb.rightPage?.id ?? null;

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
      if (e.key === "ArrowLeft") sb.goPrev();
      else if (e.key === "ArrowRight") sb.goNext();
      else if ((e.key === "Delete" || e.key === "Backspace") && sb.selectedId) {
        e.preventDefault();
        sb.removeElement(sb.selectedId);
      } else if (e.key === "Escape") {
        sb.setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, sb]);

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
            <button className="ks-chip" title="Previous" onClick={sb.goPrev} disabled={sb.spread === 0}>
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-14 text-center text-sm text-paper/70">
              {sb.spread + 1} / {sb.spreadCount}
            </span>
            <button
              className="ks-chip"
              title="Next"
              onClick={sb.goNext}
              disabled={sb.spread === sb.spreadCount - 1}
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
          <div className="ks-desk flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl px-3 py-2">
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
    </RoomFrame>
  );
}

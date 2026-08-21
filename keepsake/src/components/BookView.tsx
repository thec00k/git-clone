import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  ImagePlus,
  LayoutGrid,
  Lock,
  Plus,
  Printer,
  Rows3,
  Shuffle,
  Smile,
  StickyNote,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { useScrapbook } from "../hooks/useScrapbook";
import { useApp } from "../store/appStore";
import { useNav } from "../store/nav";
import { loadImageFile } from "../lib/image";
import { canSee, VIEW_AS_LABEL } from "../lib/permissions";
import type { LayoutPreset } from "../lib/layout";
import { STICKER_GLYPHS } from "../types/scrapbook";
import { RoomFrame } from "./RoomFrame";
import { Spread } from "./Spread";
import { PageFlip } from "./PageFlip";
import { SelectionToolbar } from "./SelectionToolbar";
import { SaveIndicator } from "./SaveIndicator";
import { PrintView } from "./PrintView";
import { NotesPanel } from "./NotesPanel";

export function BookView() {
  const sb = useScrapbook();
  const { addArchivePhoto } = useApp();
  const { back, viewAs, isVisitor } = useNav();
  const [turn, setTurn] = useState<{ dir: "next" | "prev" } | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const turningRef = useRef(false);

  const targetPageId = sb.activePageId ?? sb.leftPage?.id ?? sb.rightPage?.id ?? null;
  const canView = sb.book ? canSee(sb.book.visibility, viewAs) : true;

  async function handleFiles(files: FileList | null) {
    if (!files || !targetPageId) return;
    for (const file of Array.from(files)) {
      try {
        const { src, aspect } = await loadImageFile(file);
        const id = addArchivePhoto(src, aspect);
        sb.addPhoto(targetPageId, src, id);
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

  const applyPreset = (preset: LayoutPreset) => {
    const hasPhotos = (id: string | null | undefined) =>
      !!id && !!sb.pages.find((p) => p.id === id)?.elements.some((e) => e.type === "photo");
    let pid = targetPageId;
    if (!hasPhotos(pid)) pid = [sb.leftPage, sb.rightPage].find((p) => hasPhotos(p?.id))?.id ?? pid;
    if (pid) sb.arrangePage(pid, preset);
    setShowPresets(false);
  };

  const requestTurn = (dir: "next" | "prev") => {
    if (turningRef.current) return;
    sb.setSelectedId(null);
    if (dir === "next" && sb.spread >= sb.spreadCount - 1) return;
    if (dir === "prev" && sb.spread <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (dir === "next") sb.goNext();
      else sb.goPrev();
      return;
    }
    turningRef.current = true;
    setTurn({ dir });
  };

  const finishTurn = () => {
    if (!turningRef.current) return;
    turningRef.current = false;
    if (turn?.dir === "next") sb.goNext();
    else if (turn?.dir === "prev") sb.goPrev();
    setTurn(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (e.key === "ArrowLeft") requestTurn("prev");
      else if (e.key === "ArrowRight") requestTurn("next");
      else if (!isVisitor && (e.key === "Delete" || e.key === "Backspace") && sb.selectedId) {
        e.preventDefault();
        sb.removeElement(sb.selectedId);
      } else if (e.key === "Escape") sb.setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const otherIdx = turn ? (turn.dir === "next" ? sb.spread + 1 : sb.spread - 1) : sb.spread;
  const otherL = sb.pages[otherIdx * 2] ?? null;
  const otherR = sb.pages[otherIdx * 2 + 1] ?? null;

  if (!sb.book) {
    return (
      <RoomFrame header={<HomeBtn onClick={back} />}>
        <div className="flex flex-1 items-center justify-center text-paper/60">No book open.</div>
      </RoomFrame>
    );
  }

  if (!canView) {
    return (
      <RoomFrame header={<HomeBtn onClick={back} />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-paper/70">
          <Lock size={28} />
          <p>This book is private.</p>
          <p className="text-sm text-paper/50">Viewing as {VIEW_AS_LABEL[viewAs]}.</p>
        </div>
      </RoomFrame>
    );
  }

  return (
    <RoomFrame
      header={
        <>
          <div className="flex items-center gap-3">
            <HomeBtn onClick={back} />
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
            {!isVisitor && (
              <>
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
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="ks-chip" title="Notes on this spread" onClick={() => setShowNotes(true)}>
              <StickyNote size={16} />
            </button>
            <button className="ks-chip" title="Export / print book" onClick={() => setShowPrint(true)}>
              <Printer size={16} />
            </button>
            <div className="hidden items-center gap-3 sm:flex">
              {isVisitor ? (
                <span className="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent-fg">
                  Viewing as {VIEW_AS_LABEL[viewAs]}
                </span>
              ) : (
                <SaveIndicator status={sb.saveStatus} />
              )}
            </div>
          </div>
        </>
      }
      footer={
        isVisitor ? null : (
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
              <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-[rgb(28_22_16/0.92)] px-2 py-1.5 shadow-lg">
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
            {showStickers && (
              <div className="flex max-w-xl flex-wrap items-center justify-center gap-1 rounded-2xl bg-[rgb(28_22_16/0.92)] px-2 py-2 shadow-lg">
                {STICKER_GLYPHS.map((g) => (
                  <button
                    key={g}
                    className="ks-chip text-lg"
                    onClick={() => {
                      if (targetPageId) sb.addSticker(targetPageId, g);
                      setShowStickers(false);
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            <div className="ks-desk flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2">
              <button className="ks-tool ks-tool--accent" onClick={() => addInputRef.current?.click()}>
                <ImagePlus size={18} /> Add photo
              </button>
              <button className="ks-tool" onClick={() => targetPageId && sb.addCaption(targetPageId)}>
                <Type size={18} /> Add caption
              </button>
              <button className="ks-tool" onClick={() => setShowStickers((v) => !v)}>
                <Smile size={18} /> Stickers
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
        )
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
          activePageId={isVisitor ? null : sb.activePageId}
          bookTitle={sb.book.title}
          bookSubtitle={sb.book.subtitle}
          selectedId={isVisitor ? null : sb.selectedId}
          onActivate={isVisitor ? () => {} : sb.setActivePageId}
          onSelect={isVisitor ? () => {} : sb.setSelectedId}
          onDeselect={() => sb.setSelectedId(null)}
          onMove={isVisitor ? () => {} : (id, x, y) => sb.updateElement(id, { x, y })}
          onTransform={isVisitor ? () => {} : (id, patch) => sb.updateElement(id, patch)}
          onEditText={isVisitor ? () => {} : (id, text) => sb.updateElement(id, { text })}
        />
      )}
      {showPrint && sb.book && <PrintView book={sb.book} onClose={() => setShowPrint(false)} />}
      {showNotes && sb.book && (
        <NotesPanel
          bookId={sb.book.id}
          pageIds={[sb.leftPage?.id, sb.rightPage?.id].filter(Boolean) as string[]}
          onClose={() => setShowNotes(false)}
        />
      )}
    </RoomFrame>
  );
}

function HomeBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="ks-chip" title="Back to the room" onClick={onClick}>
      <DoorOpen size={16} />
    </button>
  );
}

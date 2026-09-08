import {PhotoImportDialog} from './PhotoImportDialog';
import { MAX_PHOTOS_PER_PAGE } from '../types/scrapbook';
import {StickerStore} from './StickerStore';
import { SpreadOverview } from './SpreadOverview';
import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Keyboard,
  LayoutGrid,
  Lock,
  Plus,
  Printer,
  Redo2,
  Smile,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Wand2,
} from "lucide-react";
import { playPageTurn } from "../lib/audio";
import { useScrapbook } from "../hooks/useScrapbook";
import { useApp } from "../store/appStore";
import { useNav } from "../store/nav";
import { loadImageFile } from "../lib/image";
import { canSee, VIEW_AS_LABEL } from "../lib/permissions";
import type { LayoutPreset } from "../lib/layout";
import { ownedStickerGlyphs } from "../lib/stickerPacks";
import { RoomFrame } from "./RoomFrame";
import { Spread } from "./Spread";
import { PageFlip } from "./PageFlip";
import { SelectionToolbar } from "./SelectionToolbar";
import { SaveIndicator } from "./SaveIndicator";
import { PrintView } from "./PrintView";
import { NotesPanel } from "./NotesPanel";
import { BookIdentityEditor } from "./BookIdentityEditor";
import { HomeChip } from "./views/ViewShell";
import { DeskClutter } from "./DeskClutter";

export function BookView() {
  const sb = useScrapbook();
  const { addArchivePhoto, renameBook, setBookCover, state } = useApp();
  const stickerGlyphs = [...ownedStickerGlyphs(state.ownedStickerPacks),...(state.roomDecor?.owned.includes('fern-stamp')?['keepsake:fern-stamp']:[]),...new Set(discoveryState(state).entries.filter(e=>e.reward&&e.keptAt).map(e=>REWARDS[e.reward!].glyph))];
  const { viewAs, isVisitor, setPrinterOpen, printerOpen, bookPageId, setBookPageId } = useNav();
  useEffect(() => {
    if (!bookPageId) return;
    const index = sb.pages.findIndex(p => p.id === bookPageId);
    if (index >= 0) { sb.setSpread(Math.floor(index / 2)); sb.setActivePageId(bookPageId); }
    setBookPageId(null);
  }, [bookPageId, sb.pages, sb.setSpread, sb.setActivePageId, setBookPageId]);
  const [turn, setTurn] = useState<{ dir: "next" | "prev" } | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [arrangeNote, setArrangeNote] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [showCover, setShowCover] = useState(sb.book?.title === "New book");
  const [showShop,setShowShop]=useState(false);
  const [drawInk, setDrawInk] = useState<string | null>(null);
  const [showPhotos,setShowPhotos]=useState(false);
  const [drawWidth,setDrawWidth]=useState(1.7);
  const turningRef = useRef(false);

  const targetPageId = sb.activePageId && [sb.leftPage?.id, sb.rightPage?.id].includes(sb.activePageId)
    ? sb.activePageId : sb.leftPage?.id ?? sb.rightPage?.id ?? null;
  const canView = sb.book ? canSee(sb.book.visibility, viewAs) : true;

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
    if (pid) {
      const ok=sb.arrangePage(pid, preset);
      setArrangeNote(ok===false ? "Not enough clear space. Move writing or use a fresh page, then try again." : "Photos aligned in two columns. Undo restores your previous arrangement.");
    }
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
    playPageTurn(state.environment.ambienceVolume);
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
      if (e.defaultPrevented || showPrint || showNotes || showKeys || printerOpen) return;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!isVisitor && !turn && mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) sb.redo();
        else sb.undo();
        return;
      }
      if (!isVisitor && !turn && mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        sb.redo();
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowKeys((v) => !v);
        return;
      }
      if (e.key === "ArrowLeft") requestTurn("prev");
      else if (e.key === "ArrowRight") requestTurn("next");
      else if (!isVisitor && (e.key === "Delete" || e.key === "Backspace") && sb.selectedId) {
        e.preventDefault();
        sb.removeElement(sb.selectedId);
      } else if (e.key === "Escape") {
        sb.setSelectedId(null);
        setDrawInk(null);
        setShowStickers(false);
        setShowPresets(false);
        setShowCover(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const otherIdx = turn ? (turn.dir === "next" ? sb.spread + 1 : sb.spread - 1) : sb.spread;
  const otherL = sb.pages[otherIdx * 2] ?? null;
  const otherR = sb.pages[otherIdx * 2 + 1] ?? null;

  if (!sb.book) {
    return (
      <RoomFrame header={<HomeChip />}>
        <div className="flex flex-1 items-center justify-center text-paper/60">No book open.</div>
      </RoomFrame>
    );
  }

  if (!canView) {
    return (
      <RoomFrame header={<HomeChip />}>
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
      className="ks-room--desk-top"
      header={
        <>
          <div className="flex items-center gap-3">
            <HomeChip />
            <div className="leading-tight">
              <p className="font-display font-semibold text-ink">{sb.book.title}</p>
              <p className="ks-caption text-ink/70" style={{ fontSize: "1.1rem" }}>
                {sb.book.subtitle}
              </p>
            </div>
          </div>

          <div className="ks-book-progress">
            <span className="min-w-14 text-center text-sm text-ink/70" aria-live="polite">
              Spread {sb.spread + 1} of {sb.spreadCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isVisitor&&<button className="ks-chip" style={{width:'auto',paddingInline:12}} onClick={()=>setShowShop(true)}>Drawer shop</button>}
            {!isVisitor && (
              <button
                className="ks-chip"
                aria-label="Edit cover and title page"
                title="Cover & title page"
                aria-expanded={showCover}
                onClick={() => { setShowCover((v) => !v); setShowStickers(false); setShowPresets(false); }}
              >
                <BookMarked size={16} /> Cover & title
              </button>
            )}
            <button className="ks-chip" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={() => setShowKeys(true)}>
              <Keyboard size={16} />
            </button>
            <button className="ks-chip" aria-label="Notes on this spread" title="Notes on this spread" onClick={() => setShowNotes(true)}>
              <StickyNote size={16} />
            </button>
            <button className="ks-chip" aria-label="Export or print this book" title="Export / print book" onClick={() => setShowPrint(true)}>
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
          <div className="ks-editor-dock">
            {showCover && sb.book && (
              <div className="ks-panel ks-cover-editor p-4">
                <div className="flex justify-between mb-2"><p className="font-display text-paper">Make this book yours</p><button className="ks-chip" onClick={()=>setShowCover(false)}>Done</button></div>
                <BookIdentityEditor
                  title={sb.book.title}
                  subtitle={sb.book.subtitle}
                  coverStyle={sb.book.coverStyle}
                  onTitle={(t) => renameBook(sb.book!.id, t, sb.book!.subtitle)}
                  onSubtitle={(s) => renameBook(sb.book!.id, sb.book!.title, s)}
                  onCover={(c) => setBookCover(sb.book!.id, c)}
                />
              </div>
            )}
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
                <span className="px-1 text-sm text-paper/60">Two columns · room for 4–6 photos</span>
                <button className="ks-tool" onClick={() => applyPreset("grid")}><LayoutGrid size={16} /> Align side by side</button>
              </div>
            )}
            {showStickers && (
              <div className="flex max-w-xl flex-col items-center gap-1.5 rounded-2xl bg-[rgb(28_22_16/0.92)] px-3 py-2 shadow-lg">
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {stickerGlyphs.map((g) => (
                    <button
                      key={g}
                      className="ks-chip text-lg"
                      aria-label={`Add sticker ${g==='keepsake:fern-stamp'?'Woodland fern stamp':Object.values(REWARDS).find(r=>r.glyph===g)?.title??g}`}
                      onClick={() => {
                        if (targetPageId) sb.addSticker(targetPageId, g);
                        setShowStickers(false);
                      }}
                    >
                      <KeepsakeGlyph glyph={g}/>
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-paper/50">More packs live in the desk drawer.</p>
              </div>
            )}
            {arrangeNote && <p className="ks-arrange-note" role="status">{arrangeNote}</p>}
            <div className="ks-page-target" role="group" aria-label="Page to edit">
              <span>{drawInk ? "Drawing on" : "Adding to"}</span>
              <button type="button" aria-pressed={targetPageId === sb.leftPage?.id} disabled={!sb.leftPage || !!turn} onClick={() => sb.leftPage && sb.setActivePageId(sb.leftPage.id)}>Left page</button>
              <button type="button" aria-pressed={targetPageId === sb.rightPage?.id} disabled={!sb.rightPage || !!turn} onClick={() => sb.rightPage && sb.setActivePageId(sb.rightPage.id)}>Right page</button>
              {drawInk && <button type="button" onClick={() => setDrawInk(null)}>Finish drawing</button>}
            </div>
            <div className="ks-editor-toolbar" role="toolbar" aria-label="Scrapbook editing tools">
              <div className="ks-editor-history" role="group" aria-label="Edit history">
                <button className="ks-tool" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" onClick={sb.undo} disabled={!sb.canUndo}><Undo2 size={17} /> Undo</button>
                <button className="ks-tool" aria-label="Redo" title="Redo (Ctrl Y / ⌘ Shift Z)" onClick={sb.redo} disabled={!sb.canRedo}><Redo2 size={17} /> Redo</button>
              </div>
              <button className="ks-tool ks-tool--accent" onClick={() => setShowPhotos(true)}>
                <ImagePlus size={18} /> Add photo
              </button>
              <button className="ks-tool" onClick={() => targetPageId && sb.addCaption(targetPageId)}>
                <Type size={18} /> Add caption
              </button>
              <button className="ks-tool" aria-expanded={showStickers} onClick={() => { setShowStickers((v) => !v); setShowPresets(false); setShowCover(false); }}>
                <Smile size={18} /> Stickers
              </button>
              <button className="ks-tool" aria-expanded={showPresets} onClick={() => { setShowPresets((v) => !v); setShowStickers(false); setShowCover(false); }}>
                <Wand2 size={18} /> Arrange
              </button>
              <button className="ks-tool" onClick={() => setPrinterOpen(true)}><Printer size={17} /> Print photo</button>
              <details className="ks-book-pages-menu" onKeyDown={e => { if (e.key === "Escape") { e.currentTarget.open = false; e.currentTarget.querySelector("summary")?.focus(); } }}>
                <summary>Pages <ChevronRight size={14} /></summary>
                <div>
                  <button className="ks-tool" onClick={sb.addSpread} disabled={!!turn}><Plus size={16} /> Add a spread</button>
                  <button className="ks-tool" onClick={sb.deleteCurrentSpread} disabled={sb.spreadCount <= 1 || !!turn}><Trash2 size={16} /> Delete this spread</button>
                  <p>Deleted a spread by mistake? Use Undo.</p>
                  <SpreadOverview pages={sb.pages} current={sb.spread} disabled={!!turn} onJump={i=>{sb.setSpread(i);sb.setSelectedId(null);}} onMove={sb.moveSpread}/>
                </div>
              </details>
            </div>
          </div>
        )
      }
    >
      {showShop&&!isVisitor&&<StickerStore onClose={()=>setShowShop(false)}/>}
      <div className="ks-desk-top" data-desk-top data-draw-ink={drawInk ?? ""}>
        <DeskClutter
          ink={isVisitor ? null : drawInk}
          thickness={drawWidth} onThickness={setDrawWidth}
          onPickInk={isVisitor ? undefined : setDrawInk}
          onPrint={() => isVisitor ? setShowPrint(true) : setPrinterOpen(true)}
          onSnap={() => {
            if (!isVisitor) setShowPhotos(true);
          }}
        />
        <div className="ks-book-stage">
          <div className="ks-book-canvas">
          <button
            type="button"
            className="ks-page-turn ks-page-turn--prev"
            aria-label="Previous spread"
            title="Turn the page back"
            onClick={() => requestTurn("prev")}
            disabled={sb.spread === 0 || !!turn}
          >
            <ChevronLeft size={22} />
          </button>
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
              activePageId={isVisitor ? null : targetPageId}
              bookTitle={sb.book.title}
              bookSubtitle={sb.book.subtitle}
              selectedId={isVisitor ? null : sb.selectedId}
              onActivate={isVisitor ? () => {} : sb.setActivePageId}
              onSelect={isVisitor ? () => {} : sb.setSelectedId}
              onDeselect={() => sb.setSelectedId(null)}
              onMove={isVisitor ? () => {} : (id, x, y) => sb.updateElement(id, { x, y })}
              onTransform={isVisitor ? () => {} : (id, patch) => sb.updateElement(id, patch)}
              onEditText={isVisitor ? () => {} : (id, text) => sb.updateElement(id, { text })}
              drawColor={isVisitor ? null : drawInk}
              drawWidth={drawWidth}
              onDrawStroke={isVisitor ? undefined : (id,color,points)=>sb.addStroke(id,color,points,drawWidth)}
            />
          )}
          <button
            type="button"
            className="ks-page-turn ks-page-turn--next"
            aria-label={!isVisitor && sb.spread === sb.spreadCount - 1 ? "Add new page" : "Next spread"}
            title={!isVisitor && sb.spread === sb.spreadCount - 1 ? "Add new page" : "Turn the page"}
            onClick={() => !isVisitor && sb.spread === sb.spreadCount - 1 ? sb.addPage() : requestTurn("next")}
            disabled={(isVisitor && sb.spread === sb.spreadCount - 1) || !!turn}
          >
            {!isVisitor && sb.spread === sb.spreadCount - 1 ? <Plus size={22}/> : <ChevronRight size={22} />}
          </button>
          <p className="ks-page-navigation-hint">{sb.spread === 0 ? "The beginning" : "← Previous"} <span>·</span> {sb.spread === sb.spreadCount - 1 ? "The latest chapter" : "Next →"}</p>
          </div>
        </div>
      </div>
      {showPhotos && !isVisitor && <PhotoImportDialog onClose={()=>setShowPhotos(false)} onAdd={photos=>{
        if(!targetPageId)return;
        const target=sb.pages.find(page=>page.id===targetPageId);
        if(!target)return;
        const ready=photos.map(p=>({...p,photoId:p.photoId??addArchivePhoto(p.src,p.aspect)}));
        if(ready.length===1 && target.elements.filter(e=>e.type==='photo').length<MAX_PHOTOS_PER_PAGE) sb.addPhoto(targetPageId,ready[0].src,ready[0].photoId);
        else sb.addPhotoBatch(targetPageId,ready);
        setShowPhotos(false);
      }}/>}
      {showKeys && <ShortcutsHelp onClose={() => setShowKeys(false)} />}
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

function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        className="ks-panel w-full max-w-sm p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 font-display text-xl">On the page</h2>
        <dl className="space-y-1.5 text-sm text-paper/80">
          <Row k="← →" v="Turn the page" />
          <Row k="⌘Z / Ctrl Z" v="Undo" />
          <Row k="⌘⇧Z / Ctrl Y" v="Redo" />
          <Row k="Delete" v="Remove the selected piece" />
          <Row k="Esc" v="Clear selection / close" />
          <Row k="?" v="This list" />
        </dl>
        <button className="ks-tool ks-tool--accent mt-4 w-full justify-center" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-display text-paper/50">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
import {KeepsakeGlyph} from './KeepsakeGlyph';
import {discoveryState,REWARDS} from '../lib/discoveries';

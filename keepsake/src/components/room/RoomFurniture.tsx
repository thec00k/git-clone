import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Archive, Clock, Lamp, Library, MapPin, Music, Moon, CloudSun, Sun, Pencil } from "lucide-react";
import type { MemoryPin } from "../../types/app";
import { COVER_STYLES } from "../../types/scrapbook";
import type { Scrapbook } from "../../types/scrapbook";

export type Phase = "day" | "dusk" | "night";

export function phaseOf(timeMode: string): Phase {
  if (timeMode === "day") return "day";
  if (timeMode === "night") return "night";
  if (timeMode === "dusk") return "dusk";
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

export const SKY: Record<Phase, string> = {
  day: "linear-gradient(180deg,#87b8d4 0%,#c5dce8 48%,#f3e6c8 100%)",
  dusk: "linear-gradient(180deg,#3a2848 0%,#c47a4a 52%,#f0b070 100%)",
  night: "linear-gradient(180deg,#12182a 0%,#1a2238 58%,#0e1424 100%)",
};

export const SEASON_TINT: Record<string, string> = {
  spring: "rgb(180 210 140 / 0.12)",
  summer: "rgb(255 220 140 / 0.12)",
  autumn: "rgb(210 120 70 / 0.10)",
  winter: "rgb(200 220 235 / 0.12)",
};

export const WALL_PAINT: Record<Phase, string> = {
  day: "linear-gradient(180deg,#f6e6d0 0%,#f0d4b8 45%,#e8c8a4 100%)",
  dusk: "linear-gradient(180deg,#6a4a3e 0%,#8a5a42 50%,#c47a4a 100%)",
  night: "linear-gradient(180deg,#1e1410 0%,#2a1c18 55%,#3a2418 100%)",
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  const Icon = phase === "night" ? Moon : phase === "dusk" ? CloudSun : Sun;
  return (
    <div
      className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-sm text-ink/80"
      aria-label={`Time of day: ${phase}`}
    >
      <Icon size={14} aria-hidden="true" /> {phase}
    </div>
  );
}

export function MiniShelf({ count, lit = true }: { count: number; lit?: boolean }) {
  const spines = Array.from({ length: Math.max(4, count + 2) });
  const colors = ["#6b3a2a", "#8b5a3c", "#3d4a38", "#7a3d3a", "#4a3a2a"];
  return (
    <div
      className={`ks-mini-shelf${lit ? " is-lit" : ""}`}
      style={{
        boxShadow: lit
          ? "inset 0 0 30px rgb(20 10 6/.35), 0 0 18px rgb(255 190 100/.22)"
          : "inset 0 0 30px rgb(20 10 6/.45)",
        filter: lit ? undefined : "brightness(0.72)",
      }}
    >
      {[0, 1].map((row) => (
        <div key={row} className="ks-mini-shelf-row">
          {spines.slice(row * 4, row * 4 + 5).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: 30 + ((i * 7) % 16),
                background: colors[(row * 5 + i) % colors.length],
              }}
            />
          ))}
          <Library size={16} className="mb-1 text-paper/40" />
        </div>
      ))}
    </div>
  );
}

export function Cabinet() {
  return (
    <div
      className="flex h-full w-full flex-col gap-1 rounded-sm bg-[#6b4330] p-1.5"
      style={{ boxShadow: "0 8px 20px rgb(20 10 6/.35)" }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 items-center justify-center rounded-sm bg-[#8b5a3c]">
          <div className="h-1.5 w-6 rounded-full bg-[#3d2418]" />
        </div>
      ))}
      <Archive size={14} className="mx-auto text-paper/40" />
    </div>
  );
}

export function CRT({ on }: { on: boolean }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-lg bg-[#3a3330] p-2"
      style={{ boxShadow: "0 10px 22px rgb(0 0 0/.5)" }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-md"
        style={{
          background: on ? "radial-gradient(circle, #2a5f6a, #10222a)" : "radial-gradient(circle, #1a2224, #0c1113)",
          boxShadow: on ? "inset 0 0 24px #4fd6e0aa" : "inset 0 0 18px #000",
        }}
      >
        <Music size={20} className={on ? "text-[#9fe8ee]" : "text-paper/40"} />
      </div>
    </div>
  );
}

export function WeatherFx({ kind }: { kind: "rain" | "snow" }) {
  const drops = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {drops.map((_, i) => (
        <span
          key={i}
          className="ks-mote"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            width: kind === "snow" ? 4 : 2,
            height: kind === "snow" ? 4 : 10,
            background: kind === "snow" ? "#fff" : "rgb(200 220 255 /.7)",
            animationDuration: `${kind === "snow" ? 6 : 2.4}s`,
            animationDelay: `${-(i % 6)}s`,
          }}
        />
      ))}
    </div>
  );
}

export function TimelineFrame() {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-sm bg-[#8b5a3c] p-1"
      style={{ boxShadow: "inset 0 0 0 6px #6b4330" }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-sm bg-paper/90 text-ink">
        <Clock size={20} />
      </div>
    </div>
  );
}

export function MiniMap() {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-sm"
      style={{ background: "#c4a078", boxShadow: "inset 0 0 0 5px #8b5a3c, inset 0 0 30px rgb(20 10 6/.18)" }}
    >
      <img src="/maps/world.svg" alt="" className="ks-world-map h-[78%] w-[86%] object-cover opacity-90" />
    </div>
  );
}

export function CorkboardWall({ pins }: { pins: MemoryPin[] }) {
  return (
    <div className="ks-cork h-full w-full p-3">
      <div className="ks-cork-map relative h-full w-full overflow-hidden">
        <img
          src="/maps/world.svg"
          alt="World map"
          className="ks-world-map pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "url('/textures/grain.png')", opacity: 0.14 }}
        />
        {pins.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[85%]"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.photoSrc ? (
              <img
                src={p.photoSrc}
                alt=""
                className="mb-0.5 h-9 w-9 rounded-[2px] border-2 border-[#fffef8] object-cover shadow-md"
                style={{ transform: "rotate(-4deg)" }}
              />
            ) : null}
            <MapPin size={22} className="mx-auto text-[#b55245] drop-shadow" fill="#b55245" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookshelfWall({
  books,
  canEdit,
  lit,
  onToggleLit,
  onOpenBook,
  onRename,
  onPlace,
  onNewBook,
}: {
  books: Scrapbook[];
  canEdit: boolean;
  lit: boolean;
  onToggleLit: () => void;
  onOpenBook: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPlace: (id: string, pos: { shelfRow: number; shelfX: number }) => void;
  onNewBook?: () => void;
}) {
  return (
    <div className={`ks-shelf-case${lit ? " is-lit" : ""}`} data-shelf-lit={lit ? "on" : "off"}>
      <button
        type="button"
        className="ks-shelf-lamp"
        aria-pressed={lit}
        aria-label={lit ? "Turn shelf lights off" : "Turn shelf lights on"}
        onClick={onToggleLit}
      >
        <Lamp size={14} aria-hidden="true" />
        {lit ? "Lights on" : "Lights off"}
      </button>
      {canEdit && onNewBook && (
        <button type="button" className="ks-shelf-new" onClick={onNewBook}>
          New book
        </button>
      )}
      <div className="ks-shelf-inner">
        {[0, 1, 2].map((row) => (
          <div key={row} className="ks-shelf-row" data-shelf-row={row} />
        ))}
        <div className="ks-shelf-books">
          {books.map((b, i) => (
            <BookSpine
              key={b.id}
              book={b}
              fallbackX={8 + (i % 6) * 14}
              canEdit={canEdit}
              onOpen={() => onOpenBook(b.id)}
              onRename={(title) => onRename(b.id, title)}
              onPlace={(pos) => onPlace(b.id, pos)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookSpine({
  book,
  fallbackX,
  canEdit,
  onOpen,
  onRename,
  onPlace,
}: {
  book: Scrapbook;
  fallbackX: number;
  canEdit: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onPlace: (pos: { shelfRow: number; shelfX: number }) => void;
}) {
  const cover = COVER_STYLES[book.coverStyle];
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(book.title);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const commitTitle = () => {
    const next = draft.trim();
    if (next && next !== book.title) onRename(next);
    setRenaming(false);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (!s || s.pointerId !== e.pointerId) return;
    if (!s.moved && Math.hypot(e.clientX - s.startX, e.clientY - s.startY) < 6) return;
    if (!s.moved) {
      s.moved = true;
      setDragging(true);
    }
    const caseEl = e.currentTarget.closest(".ks-shelf-inner");
    if (!(caseEl instanceof HTMLElement)) return;
    const r = caseEl.getBoundingClientRect();
    const y = ((e.clientY - r.top) / r.height) * 100;
    const x = ((e.clientX - r.left) / r.width) * 100;
    onPlace({
      shelfRow: y < 33 ? 0 : y < 66 ? 1 : 2,
      shelfX: Math.min(88, Math.max(2, x - 3)),
    });
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (!s || s.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
    setDragging(false);
    if (!s.moved) onOpen();
  };

  return (
    <div
      className={`ks-spine${dragging ? " is-dragging" : ""}`}
      style={{
        ["--shelf-row" as string]: String(book.shelfRow ?? 0),
        left: `${book.shelfX ?? fallbackX}%`,
        background: `linear-gradient(90deg, rgb(0 0 0 /.28), transparent 22%, rgb(255 255 255 /.08) 48%, transparent 70%), url('/textures/leather.jpg') center/cover`,
        backgroundColor: cover.leather,
        color: cover.ink,
        cursor: canEdit ? "grab" : "pointer",
      }}
      data-book-id={book.id}
      role="button"
      tabIndex={0}
      aria-label={`Open book: ${book.title}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => {
        if (!canEdit && !renaming) onOpen();
      }}
      onKeyDown={(e) => {
        if (renaming || (e.target as HTMLElement).closest("[data-no-drag]")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="ks-spine-title">{book.title}</span>
      {canEdit && (
        <button
          type="button"
          className="ks-spine-rename"
          data-no-drag
          aria-label={`Edit title of ${book.title}`}
          onClick={(e) => {
            e.stopPropagation();
            setDraft(book.title);
            setRenaming(true);
          }}
        >
          <Pencil size={11} />
        </button>
      )}
      {renaming && (
        <form
          className="ks-spine-form"
          data-no-drag
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault();
            commitTitle();
          }}
        >
          <input
            aria-label="Book title"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            autoFocus
          />
        </form>
      )}
    </div>
  );
}

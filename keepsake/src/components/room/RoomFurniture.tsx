import { Archive, Clock, Library, MapPin, Music, Moon, CloudSun, Sun } from "lucide-react";
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
  day: "linear-gradient(180deg,#8fb8d6 0%,#c8dce6 55%,#e9dcc4 100%)",
  dusk: "linear-gradient(180deg,#3a4a6b 0%,#a9668a 55%,#e6a15e 100%)",
  night: "linear-gradient(180deg,#0d1830 0%,#1d2a49 60%,#2a3355 100%)",
};

export const SEASON_TINT: Record<string, string> = {
  spring: "rgb(120 170 120 / 0.10)",
  summer: "rgb(240 200 120 / 0.10)",
  autumn: "rgb(200 120 60 / 0.12)",
  winter: "rgb(180 210 235 / 0.12)",
};

export function PhaseBadge({ phase }: { phase: Phase }) {
  const Icon = phase === "night" ? Moon : phase === "dusk" ? CloudSun : Sun;
  return (
    <div
      className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-sm text-paper/70"
      aria-label={`Time of day: ${phase}`}
    >
      <Icon size={14} aria-hidden="true" /> {phase}
    </div>
  );
}

export function MiniShelf({ count }: { count: number }) {
  const spines = Array.from({ length: Math.max(4, count + 2) });
  const colors = ["#4a3224", "#2f4a3c", "#5b2733", "#20293f", "#7a5320"];
  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-sm bg-[#3a2a1e] p-2"
      style={{ boxShadow: "inset 0 0 30px rgb(0 0 0/.4)" }}
    >
      {[0, 1].map((row) => (
        <div key={row} className="flex items-end gap-1 border-b-4 border-[#6e4a32] pb-1">
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
      className="flex h-full w-full flex-col gap-1 rounded-sm bg-[#4a3a2c] p-1.5"
      style={{ boxShadow: "0 8px 20px rgb(0 0 0/.45)" }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 items-center justify-center rounded-sm bg-[#5c4836]">
          <div className="h-1.5 w-6 rounded-full bg-[#2c2418]" />
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
      className="flex h-full w-full items-center justify-center rounded-sm bg-[#3a2e26] p-1"
      style={{ boxShadow: "inset 0 0 0 6px #6e4a32" }}
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
      style={{ background: "#b98a4e", boxShadow: "inset 0 0 0 5px #6e4a32, inset 0 0 30px rgb(0 0 0/.25)" }}
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

const FILLER = ["#4a3224", "#2f4a3c", "#5b2733", "#20293f", "#7a5320", "#3a2a1e"];

export function BookshelfWall({
  books,
  onOpenBook,
  onOpenShelf,
}: {
  books: Scrapbook[];
  onOpenBook: (id: string) => void;
  onOpenShelf: () => void;
}) {
  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
        onClick={onOpenShelf}
        aria-label="Open the bookshelf"
      >
        <div
          className="flex h-full w-full flex-col justify-between rounded-sm bg-[#2c2018] p-3"
          style={{ boxShadow: "inset 0 0 40px rgb(0 0 0/.5), inset 0 0 0 8px #4a3224" }}
        >
          {[0, 1, 2].map((row) => (
            <div key={row} className="relative flex-1 border-b-[10px] border-[#6e4a32]">
              <div className="absolute inset-x-2 bottom-1 top-3 flex items-end gap-1.5">
                {FILLER.slice(row, row + 5).map((c, i) => (
                  <div
                    key={i}
                    className="w-[9%] rounded-t-sm"
                    style={{ height: `${48 + ((row * 3 + i) % 5) * 8}%`, background: c, opacity: 0.85 }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </button>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
        {books.slice(0, 6).map((b, i) => {
          const cover = COVER_STYLES[b.coverStyle];
          const row = i % 3;
          const col = Math.floor(i / 3);
          return (
            <button
              key={b.id}
              type="button"
              className="pointer-events-auto absolute z-10 cursor-pointer border-0 p-0 text-left"
              style={{
                left: `${18 + col * 36}%`,
                top: `${8 + row * 30}%`,
                width: "22%",
                height: "26%",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenBook(b.id);
              }}
              aria-label={`Open book: ${b.title}`}
            >
              <div
                className="flex h-full w-full flex-col items-center justify-center rounded-sm p-2 text-center"
                style={{
                  background: `linear-gradient(90deg, rgb(0 0 0 /.35), transparent 14%), url('/textures/leather.jpg') center/cover`,
                  backgroundColor: cover.leather,
                  color: cover.ink,
                  boxShadow: "4px 8px 18px rgb(0 0 0 /.45)",
                }}
              >
                <span className="text-[0.45rem] uppercase tracking-[0.16em] opacity-70">a book of</span>
                <span className="font-display text-sm font-semibold leading-tight">{b.title}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

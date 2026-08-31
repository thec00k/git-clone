import type { CSSProperties } from "react";
import { BookOpen, Map as MapIcon, PenLine } from "lucide-react";
import { HOTSPOTS } from "../../lib/hotspots";
import type { HotspotId } from "../../lib/hotspots";
import { COVER_STYLES } from "../../types/scrapbook";
import type { Scrapbook } from "../../types/scrapbook";
import type { Environment } from "../../types/app";
import { Cabinet, CRT, MiniShelf, SKY, SEASON_TINT, TimelineFrame, WALL_PAINT, WeatherFx, type Phase } from "./RoomFurniture";

export function RoomFlat({
  phase,
  environment,
  activeBook,
  bookCount,
  tourFocus,
  layer,
  onOpenWindow,
  onOpenMusic,
  onGo,
}: {
  phase: Phase;
  environment: Environment;
  activeBook: Scrapbook | null;
  bookCount: number;
  tourFocus: HotspotId | null;
  layer: (depth: number) => { transform: string };
  onOpenWindow: () => void;
  onOpenMusic: () => void;
  onGo: (view: "shelf" | "timeline" | "atlas" | "archive" | "book" | "guestbook") => void;
}) {
  const cover = COVER_STYLES[activeBook?.coverStyle ?? "cocoa"];
  const tourClass = (id: HotspotId) => (tourFocus === id ? " ks-obj--tour" : "");

  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={layer(6)}>
        <div
          className="absolute inset-0"
          style={{
            background: WALL_PAINT[phase],
          }}
        />
        <div className="absolute inset-0" style={{ background: SEASON_TINT[environment.season] }} />
        <button
          className={`ks-obj${tourClass("window")}`}
          data-tour="window"
          style={HOTSPOTS.window}
          onClick={onOpenWindow}
          aria-label="Window and room settings"
        >
          <WindowPane phase={phase} weather={environment.weather} />
          <span className="ks-obj-label">the window</span>
        </button>
      </div>

      <div className="pointer-events-none absolute inset-0" style={layer(16)}>
        <button
          className={`ks-obj${tourClass("shelf")}`}
          data-tour="shelf"
          style={HOTSPOTS.shelf}
          onClick={() => onGo("shelf")}
          aria-label="Bookshelf"
        >
          <MiniShelf count={bookCount} lit={environment.shelfLit} />
          <span className="ks-obj-label">the bookshelf</span>
        </button>
        <button
          className={`ks-obj${tourClass("timeline")}`}
          data-tour="timeline"
          style={HOTSPOTS.timeline}
          onClick={() => onGo("timeline")}
          aria-label="Timeline"
        >
          <TimelineFrame />
          <span className="ks-obj-label">the timeline</span>
        </button>
        <button
          className={`ks-obj${tourClass("map")}`}
          data-tour="map"
          style={HOTSPOTS.map}
          onClick={() => onGo("atlas")}
          aria-label="Memory map"
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-sm"
            style={{ background: "#c4a078", boxShadow: "inset 0 0 0 5px #8b5a3c, inset 0 0 30px rgb(40 20 10/.18)" }}
          >
            <MapIcon size={22} className="text-[#2c221c]" />
          </div>
          <span className="ks-obj-label">the map</span>
        </button>
      </div>

      <DeskLayer
        phase={phase}
        environment={environment}
        activeBook={activeBook}
        cover={cover}
        tourClass={tourClass}
        layer={layer}
        onOpenMusic={onOpenMusic}
        onGo={onGo}
      />
    </>
  );
}

export function WindowPane({ phase, weather }: { phase: Phase; weather: Environment["weather"] }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-md"
      style={{
        background: SKY[phase],
        boxShadow: "inset 0 0 0 8px #4a3224, inset 0 0 40px rgb(0 0 0 /0.35)",
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          right: phase === "night" ? "20%" : "18%",
          top: phase === "day" ? "18%" : "26%",
          width: 46,
          height: 46,
          background:
            phase === "night"
              ? "radial-gradient(circle at 40% 40%, #eef, #cdd)"
              : "radial-gradient(circle at 40% 40%, #fff6d8, #ffd479)",
          boxShadow: phase === "night" ? "0 0 24px #aab8ff88" : "0 0 40px #ffdd8bcc",
        }}
      />
      <div className="absolute left-1/2 top-0 h-full w-[6px] -translate-x-1/2 bg-[#4a3224]" />
      <div className="absolute top-1/2 left-0 h-[6px] w-full -translate-y-1/2 bg-[#4a3224]" />
      {weather !== "clear" && <WeatherFx kind={weather} />}
    </div>
  );
}

export function DeskLayer({
  phase,
  environment,
  activeBook,
  cover,
  tourClass,
  layer,
  onOpenMusic,
  onGo,
  hotspots,
}: {
  phase: Phase;
  environment: Environment;
  activeBook: Scrapbook | null;
  cover: { leather: string; ink: string };
  tourClass: (id: HotspotId) => string;
  layer: (depth: number) => { transform: string };
  onOpenMusic: () => void;
  onGo: (view: "archive" | "book" | "guestbook") => void;
  hotspots?: {
    archive?: CSSProperties;
    book?: CSSProperties;
    guestbook?: CSSProperties;
    crt?: CSSProperties;
  };
}) {
  const archive = hotspots?.archive ?? HOTSPOTS.archive;
  const book = hotspots?.book ?? HOTSPOTS.book;
  const guestbook = hotspots?.guestbook ?? HOTSPOTS.guestbook;
  const crt = hotspots?.crt ?? HOTSPOTS.crt;

  return (
    <div className="pointer-events-none absolute inset-0" style={layer(30)}>
      <div className="ks-desk absolute bottom-0 left-0 right-0" style={{ height: "26%" }} />
      <button
        className={`ks-obj${tourClass("archive")}`}
        data-tour="archive"
        style={archive}
        onClick={() => onGo("archive")}
        aria-label="Filing cabinet"
      >
        <Cabinet />
        <span className="ks-obj-label">the archive</span>
      </button>
      <button
        className={`ks-obj${tourClass("book")}`}
        data-tour="book"
        style={book}
        onClick={() => onGo("book")}
        aria-label={`Open ${activeBook?.title ?? "book"}`}
      >
        <div
          className="flex h-full w-full flex-col items-center justify-center rounded-md p-3 text-center"
          style={{
            background: `linear-gradient(90deg, rgb(0 0 0 /.35), transparent 14%), url('/textures/leather.jpg') center/cover`,
            backgroundColor: cover.leather,
            color: cover.ink,
            boxShadow: "6px 12px 30px rgb(0 0 0 /.5)",
          }}
        >
          <span className="text-[0.6rem] uppercase tracking-[0.2em] opacity-70">a book of</span>
          <span className="font-display text-lg font-semibold leading-tight">{activeBook?.title ?? "Keepsake"}</span>
          <span className="ks-caption" style={{ fontSize: "1rem" }}>
            {activeBook?.subtitle ?? ""}
          </span>
          <BookOpen size={16} className="mt-1 opacity-70" />
        </div>
        <span className="ks-obj-label">open the book</span>
      </button>
      <button
        className={`ks-obj${tourClass("guestbook")}`}
        data-tour="guestbook"
        style={guestbook}
        onClick={() => onGo("guestbook")}
        aria-label="Guest book"
      >
        <div
          className="flex h-full w-full items-center justify-center rounded-sm bg-[#7a3d3a] text-paper"
          style={{ boxShadow: "0 8px 18px rgb(0 0 0/.4)" }}
        >
          <PenLine size={18} />
        </div>
        <span className="ks-obj-label">the guest book</span>
      </button>
      <button className={`ks-obj${tourClass("crt")}`} data-tour="crt" style={crt} onClick={onOpenMusic} aria-label="CRT music">
        <CRT on={environment.musicOn} />
        <span className="ks-obj-label">{environment.musicOn ? "music: on" : "the CRT"}</span>
      </button>
      {(phase === "night" || phase === "dusk") && environment.lampOn && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: "30%",
            bottom: "0%",
            width: "44%",
            height: "70%",
            background: "radial-gradient(ellipse at 50% 100%, rgb(255 210 130 / 0.22), transparent 62%)",
          }}
        />
      )}
    </div>
  );
}

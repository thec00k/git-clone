import { useEffect, useRef, useState } from "react";
import { CHAMBER_HOTSPOTS } from "../../lib/hotspots";
import type { HotspotId } from "../../lib/hotspots";
import { nextFace, yawDegrees, YAW_MS } from "../../lib/roomLayout";
import type { RoomFace } from "../../lib/roomLayout";
import { canSee } from "../../lib/permissions";
import { COVER_STYLES } from "../../types/scrapbook";
import type { Scrapbook } from "../../types/scrapbook";
import type { Environment, MemoryPin } from "../../types/app";
import type { ViewAs } from "../../types/app";
import { BookshelfWall, CorkboardWall, SEASON_TINT, TimelineFrame, WALL_PAINT, type Phase } from "./RoomFurniture";
import { DeskLayer, WindowPane } from "./RoomFlat";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RoomChamber({
  roomFace,
  setRoomFace,
  phase,
  environment,
  activeBook,
  books,
  pins,
  viewAs,
  touring,
  tourFocus,
  layer,
  onOpenWindow,
  onOpenMusic,
  onGo,
  onOpenBook,
  onRenameBook,
  onPlaceBook,
  onNewBook,
}: {
  roomFace: RoomFace;
  setRoomFace: (face: RoomFace) => void;
  phase: Phase;
  environment: Environment;
  activeBook: Scrapbook | null;
  books: Scrapbook[];
  pins: MemoryPin[];
  viewAs: ViewAs;
  touring: boolean;
  tourFocus: HotspotId | null;
  layer: (depth: number) => { transform: string };
  onOpenWindow: () => void;
  onOpenMusic: () => void;
  onGo: (view: "shelf" | "timeline" | "atlas" | "archive" | "book" | "guestbook") => void;
  onOpenBook: (id: string) => void;
  onRenameBook: (id: string, title: string) => void;
  onPlaceBook: (id: string, pos: { shelfRow: number; shelfX: number }) => void;
  onNewBook: () => void;
}) {
  const cover = COVER_STYLES[activeBook?.coverStyle ?? "cocoa"];
  const tourClass = (id: HotspotId) => (tourFocus === id ? " ks-obj--tour" : "");
  const visibleBooks = books.filter((b) => canSee(b.visibility, viewAs));
  const yaw = yawDegrees(roomFace);
  const par = roomFace === "front" && !touring;
  const [flat, setFlat] = useState(true);
  const faceRef = useRef(roomFace);

  useEffect(() => {
    if (faceRef.current === roomFace) return;
    faceRef.current = roomFace;
    if (prefersReducedMotion()) {
      setFlat(true);
      return;
    }
    setFlat(false);
    const t = window.setTimeout(() => setFlat(true), YAW_MS);
    return () => window.clearTimeout(t);
  }, [roomFace]);

  useEffect(() => {
    if (touring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setRoomFace(nextFace(roomFace, "left"));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setRoomFace(nextFace(roomFace, "right"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring, roomFace, setRoomFace]);

  return (
    <div className="ks-chamber" data-room-face={roomFace} aria-label="The scrapbook room">
      <div
        className={`ks-yaw${flat ? " is-flat" : " is-turning"}`}
        style={{ ["--yaw" as string]: `${yaw}deg` }}
      >
        <div
          className={`ks-wall ks-wall-front${roomFace === "front" ? " is-facing" : ""}`}
          data-wall="front"
          aria-hidden={roomFace !== "front"}
        >
          <WallPaint phase={phase} season={environment.season} />
          <div className="pointer-events-none absolute inset-0" style={par ? layer(6) : undefined}>
            <button
              className={`ks-obj${tourClass("window")}`}
              data-tour="window"
              style={CHAMBER_HOTSPOTS.window}
              onClick={onOpenWindow}
              aria-label="Window and room settings"
              tabIndex={roomFace === "front" ? 0 : -1}
            >
              <WindowPane phase={phase} weather={environment.weather} />
              <span className="ks-obj-label">the window</span>
            </button>
          </div>
          <div className="pointer-events-none absolute inset-0" style={par ? layer(16) : undefined}>
            <button
              className={`ks-obj${tourClass("timeline")}`}
              data-tour="timeline"
              style={CHAMBER_HOTSPOTS.timeline}
              onClick={() => onGo("timeline")}
              aria-label="Timeline"
              tabIndex={roomFace === "front" ? 0 : -1}
            >
              <TimelineFrame />
              <span className="ks-obj-label">the timeline</span>
            </button>
          </div>
          <DeskLayer
            phase={phase}
            environment={environment}
            activeBook={activeBook}
            cover={cover}
            tourClass={tourClass}
            layer={par ? layer : () => ({ transform: "none" })}
            onOpenMusic={onOpenMusic}
            onGo={onGo}
            hotspots={{
              archive: CHAMBER_HOTSPOTS.archive,
              book: CHAMBER_HOTSPOTS.book,
              guestbook: CHAMBER_HOTSPOTS.guestbook,
              crt: CHAMBER_HOTSPOTS.crt,
            }}
          />
        </div>

        <div
          className={`ks-wall ks-wall-left${roomFace === "left" ? " is-facing" : ""}`}
          data-wall="left"
          aria-hidden={roomFace !== "left"}
        >
          <WallPaint phase={phase} season={environment.season} />
          <div className="ks-wall-stage">
            <button
              type="button"
              className={`ks-obj ks-wall-piece${tourClass("map")}`}
              data-tour="map"
              onClick={() => onGo("atlas")}
              aria-label="Open the memory map"
              tabIndex={roomFace === "left" ? 0 : -1}
            >
              <CorkboardWall pins={pins} />
              <span className="ks-wall-open">Open the map</span>
            </button>
          </div>
        </div>

        <div
          className={`ks-wall ks-wall-right${roomFace === "right" ? " is-facing" : ""}`}
          data-wall="right"
          aria-hidden={roomFace !== "right"}
        >
          <WallPaint phase={phase} season={environment.season} />
          <div className="ks-wall-stage">
            <div className={`ks-wall-piece${tourClass("shelf")}`} data-tour="shelf">
              <BookshelfWall
                books={visibleBooks}
                canEdit={viewAs === "owner"}
                onOpenBook={onOpenBook}
                onRename={onRenameBook}
                onPlace={onPlaceBook}
                onNewBook={onNewBook}
              />
            </div>
          </div>
        </div>
      </div>

      <WallReturns face={roomFace} onTurn={setRoomFace} />
    </div>
  );
}

function WallPaint({ phase, season }: { phase: Phase; season: string }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            WALL_PAINT[phase],
        }}
      />
      <div className="absolute inset-0" style={{ background: SEASON_TINT[season] }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(120deg, rgb(255 255 255 / 0.38), transparent 42%)" }}
      />
      <div className="ks-wall-skirting" aria-hidden="true" />
    </>
  );
}

function WallReturns({ face, onTurn }: { face: RoomFace; onTurn: (f: RoomFace) => void }) {
  return (
    <nav className="ks-returns" aria-label="Turn the room">
      {face === "front" && (
        <>
          <button type="button" className="ks-return ks-return--left ks-return--map" onClick={() => onTurn("left")}>
            <span className="ks-return-label">Corkboard map</span>
          </button>
          <button type="button" className="ks-return ks-return--right ks-return--shelf" onClick={() => onTurn("right")}>
            <span className="ks-return-label">Bookshelf</span>
          </button>
        </>
      )}
      {face === "left" && (
        <button type="button" className="ks-return ks-return--right ks-return--desk" onClick={() => onTurn("front")}>
          <span className="ks-return-label">Desk</span>
        </button>
      )}
      {face === "right" && (
        <button type="button" className="ks-return ks-return--left ks-return--desk" onClick={() => onTurn("front")}>
          <span className="ks-return-label">Desk</span>
        </button>
      )}
    </nav>
  );
}

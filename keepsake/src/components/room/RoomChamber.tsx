import { useEffect } from "react";
import { CHAMBER_HOTSPOTS } from "../../lib/hotspots";
import type { HotspotId } from "../../lib/hotspots";
import { nextFace, yawDegrees } from "../../lib/roomLayout";
import type { RoomFace } from "../../lib/roomLayout";
import { canSee } from "../../lib/permissions";
import { COVER_STYLES } from "../../types/scrapbook";
import type { Scrapbook } from "../../types/scrapbook";
import type { Environment, MemoryPin } from "../../types/app";
import type { ViewAs } from "../../types/app";
import { BookshelfWall, CorkboardWall, SEASON_TINT, TimelineFrame, type Phase } from "./RoomFurniture";
import { DeskLayer, WindowPane } from "./RoomFlat";
import { RoomCurator } from "./RoomCurator";

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
}) {
  const cover = COVER_STYLES[activeBook?.coverStyle ?? "cocoa"];
  const tourClass = (id: HotspotId) => (tourFocus === id ? " ks-obj--tour" : "");
  const visibleBooks = books.filter((b) => canSee(b.visibility, viewAs));
  const yaw = yawDegrees(roomFace);
  const par = roomFace === "front" && !touring;

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
      <div className="ks-yaw" style={{ ["--yaw" as string]: `${yaw}deg` }}>
        <div
          className={`ks-wall ks-wall-front${roomFace === "front" ? " is-facing" : ""}`}
          data-wall="front"
          aria-hidden={roomFace !== "front"}
        >
          <WallPaint phase={phase} season={environment.season} />
          <button
            type="button"
            className="ks-corner-peek ks-corner-peek--left"
            onClick={() => setRoomFace("left")}
            aria-label="Turn to the corkboard map"
            tabIndex={roomFace === "front" ? 0 : -1}
          >
            <span className="sr-only">Corkboard map</span>
          </button>
          <button
            type="button"
            className="ks-corner-peek ks-corner-peek--right"
            onClick={() => setRoomFace("right")}
            aria-label="Turn to the bookshelf"
            tabIndex={roomFace === "front" ? 0 : -1}
          >
            <span className="sr-only">Bookshelf</span>
          </button>
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
          {roomFace === "front" && !touring && <RoomCurator />}
        </div>

        <div
          className={`ks-wall ks-wall-left${roomFace === "left" ? " is-facing" : ""}`}
          data-wall="left"
          aria-hidden={roomFace !== "left"}
        >
          <WallPaint phase={phase} season={environment.season} />
          <button
            className={`ks-obj${tourClass("map")}`}
            data-tour="map"
            style={CHAMBER_HOTSPOTS.map}
            onClick={() => onGo("atlas")}
            aria-label="Memory map"
            tabIndex={roomFace === "left" ? 0 : -1}
          >
            <CorkboardWall pins={pins} />
            <span className="ks-obj-label">the map</span>
          </button>
        </div>

        <div
          className={`ks-wall ks-wall-right${roomFace === "right" ? " is-facing" : ""}`}
          data-wall="right"
          aria-hidden={roomFace !== "right"}
        >
          <WallPaint phase={phase} season={environment.season} />
          <div className={`ks-obj${tourClass("shelf")}`} data-tour="shelf" style={CHAMBER_HOTSPOTS.shelf}>
            <BookshelfWall books={visibleBooks} onOpenBook={onOpenBook} onOpenShelf={() => onGo("shelf")} />
            <span className="ks-obj-label">the bookshelf</span>
          </div>
        </div>
      </div>

      <RoomTabs face={roomFace} onTurn={setRoomFace} />
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
            phase === "night" ? "linear-gradient(180deg,#2a2119,#1a1410)" : "linear-gradient(180deg,#3a2c22,#2a2019)",
        }}
      />
      <div className="absolute inset-0" style={{ background: SEASON_TINT[season] }} />
      <div className="ks-wall-skirting" aria-hidden="true" />
    </>
  );
}

function RoomTabs({ face, onTurn }: { face: RoomFace; onTurn: (f: RoomFace) => void }) {
  return (
    <nav className="ks-wall-tabs" aria-label="Turn the room">
      {face === "front" && (
        <>
          <button type="button" className="ks-wall-tab ks-wall-tab--left" onClick={() => onTurn("left")}>
            Corkboard map
          </button>
          <button type="button" className="ks-wall-tab ks-wall-tab--right" onClick={() => onTurn("right")}>
            Bookshelf
          </button>
        </>
      )}
      {face === "left" && (
        <button type="button" className="ks-wall-tab ks-wall-tab--right" onClick={() => onTurn("front")}>
          The room
        </button>
      )}
      {face === "right" && (
        <button type="button" className="ks-wall-tab ks-wall-tab--left" onClick={() => onTurn("front")}>
          The room
        </button>
      )}
    </nav>
  );
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Settings2, Sparkles } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { VIEW_AS_LABEL } from "../../lib/permissions";
import type { ViewAs } from "../../types/app";
import { ACHIEVEMENTS } from "../../types/app";
import { roomLayoutFromSearch } from "../../lib/roomLayout";
import { tourAlreadyFinished } from "../../lib/tour";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { LeavePanel } from "./LeavePanel";
import { AchievementsToast } from "./AchievementsToast";
import { RoomTour } from "./RoomTour";
import { RoomCurator } from "./RoomCurator";

import { useFocusTrap } from "../../hooks/useFocusTrap";
import { PhaseBadge, phaseOf } from "./RoomFurniture";
import { RoomFlat } from "./RoomFlat";
import { RoomChamber } from "./RoomChamber";
const RoomScene3D = lazy(() => import("../room3d/RoomScene3D").then(module => ({ default: module.RoomScene3D })));
import { WebGLGuard } from "../room3d/WebGLGuard";
import { HomeChip } from "../views/ViewShell";
import { RoomListen } from "./RoomListen";
import { useListen } from "../../store/listen";
import type { ListenId } from "../../lib/roomListen";

export function Room() {
  const {
    state,
    environment,
    activeBook,
    recordProgress,
    newlyUnlocked,
    clearNewlyUnlocked,
    markAchievementsSeen,
    setActiveBook,
    renameBook,
    setBookShelf,
    addBook,
    setEnvironment,
  } = useApp();
  const { go, viewAs, setViewAs, touring, tourFocus, startTour, roomFace, setRoomFace } = useNav();
  const { scene } = useListen();
  const [envOpen, setEnvOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'appearance'|'music'>('appearance');
  const setMusicOpen = (_open: boolean) => { setSettingsSection('music'); setEnvOpen(true); };
  const [doorOpen, setDoorOpen] = useState(false);
  // The scene registers this callback with ListenProvider; keep it stable across context updates.
  const openDoor = useCallback(() => setDoorOpen(true), []);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });
  const layout = useMemo(() => roomLayoutFromSearch(), []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") === "1" && !tourAlreadyFinished()) startTour();
    const time = q.get("time");
    if (time === "day" || time === "dusk" || time === "night" || time === "auto") {
      setEnvironment({ timeMode: time });
    }
  }, [startTour, setEnvironment]);

  const phase = phaseOf(environment.timeMode);

  useEffect(() => {
    if (phase === "night") recordProgress({ visitedAtNight: true });
  }, [phase, recordProgress]);

  const onMove = (e: React.PointerEvent) => {
    if(layout === 'glb')return;
    if (touring) return;
    if (layout === "chamber" && roomFace !== "front") return;
    const r = sceneRef.current?.getBoundingClientRect();
    if (!r) return;
    setPar({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };

  const layer = (depth: number) => {
    const p = touring ? { x: 0, y: 0 } : par;
    return { transform: `translate(${-p.x * depth}px, ${-p.y * depth}px)` };
  };

  const motes = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 61) % 100}%`,
        size: 3 + (i % 3) * 2,
        dur: 9 + (i % 5) * 3,
        delay: -(i * 1.7),
      })),
    [],
  );

  const unlockedCount = state.achievements.length;

  return (
    <div
      className={`ks-room flex h-dvh flex-col overflow-hidden${layout !== "flat" ? " ks-room--chamber" : ""}`}
      data-room-layout={layout}
    >
      <nav className="ks-skips" aria-label="Skip">
        <a className="ks-skip" href="#ks-main">
          Skip to the room
        </a>
        <a className="ks-skip" href="#ks-room-things">
          Things in the room
        </a>
      </nav>
      <h1 className="sr-only">{state.profile.displayName}&rsquo;s scrapbook room</h1>
      <header
        data-tour="hud"
        className={`z-30 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6${tourFocus === "hud" ? " ks-hud--tour" : ""}`}
      >
        <div className="flex items-center gap-3">
          {roomFace !== "front" && <HomeChip />}
          <div className="leading-tight">
            <p className="font-display text-sm uppercase tracking-[0.22em] text-ink/70">Keepsake</p>
            <p className="ks-caption text-ink/80" style={{ fontSize: "1.15rem" }}>
              {state.profile.displayName}&rsquo;s room
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full bg-white/55 px-2 py-1 text-sm text-ink/80">
            <span className="hidden sm:inline text-paper/50">View as</span>
            <select
              name="viewAs"
              aria-label="View the room as"
              className="bg-transparent text-ink outline-none"
              value={viewAs}
              onChange={(e) => {
                const v = e.target.value as ViewAs;
                setViewAs(v);
                if (v !== "owner") recordProgress({ previewedAsVisitor: true });
              }}
            >
              {(["owner", "close", "friend", "public"] as ViewAs[]).map((v) => (
                <option key={v} value={v} className="text-ink">
                  {VIEW_AS_LABEL[v]}
                </option>
              ))}
            </select>
          </label>
          <button
            className="ks-chip"
            title="Keepsakes found"
            aria-label="Keepsakes found"
            aria-expanded={achOpen}
            onClick={() => setAchOpen((v) => !v)}
          >
            <Sparkles size={16} />
          </button>
          <span className="hidden text-sm text-ink/55 sm:inline">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>
      </header>

      <main id="ks-main" ref={sceneRef} className="ks-scene flex-1" tabIndex={-1} onPointerMove={onMove}>
        {layout === "glb" ? (
          <Suspense fallback={<div className="ks-room-loading" role="status">Opening your room…</div>}><WebGLGuard
            fallback={
              <RoomChamber
                roomFace={roomFace}
                setRoomFace={setRoomFace}
                phase={phase}
                environment={environment}
                activeBook={activeBook}
                books={state.books}
                pins={state.pins}
                viewAs={viewAs}
                touring={touring}
                tourFocus={tourFocus}
                layer={layer}
                onOpenWindow={() => {setSettingsSection('appearance'); setEnvOpen(true);}}
                onOpenMusic={() => setMusicOpen(true)}
                onSetEnvironment={setEnvironment}
                onGo={go}
                onOpenBook={(id) => {
                  setActiveBook(id);
                  go("book");
                }}
                onRenameBook={(id, title) => {
                  const book = state.books.find((b) => b.id === id);
                  if (book) renameBook(id, title, book.subtitle);
                }}
                onPlaceBook={setBookShelf}
                onNewBook={() => {
                  addBook();
                }}
              />
            }
          >
            <RoomScene3D
              roomFace={roomFace}
              setRoomFace={setRoomFace}
              phase={phase}
              environment={environment}
              tourFocus={tourFocus}
              touring={touring}
              onOpenWindow={() => {setSettingsSection('appearance'); setEnvOpen(true);}}
              onOpenMusic={() => setMusicOpen(true)}
              onOpenDoor={openDoor}
              onGo={go}
            />
          </WebGLGuard></Suspense>
        ) : layout === "flat" ? (
          <RoomFlat
            phase={phase}
            environment={environment}
            activeBook={activeBook}
            bookCount={state.books.length}
            tourFocus={tourFocus}
            layer={layer}
            onOpenWindow={() => {setSettingsSection('appearance'); setEnvOpen(true);}}
            onOpenMusic={() => setMusicOpen(true)}
            onGo={go}
          />
        ) : (
          <RoomChamber
            roomFace={roomFace}
            setRoomFace={setRoomFace}
            phase={phase}
            environment={environment}
            activeBook={activeBook}
            books={state.books}
            pins={state.pins}
            viewAs={viewAs}
            touring={touring}
            tourFocus={tourFocus}
            layer={layer}
            onOpenWindow={() => {setSettingsSection('appearance'); setEnvOpen(true);}}
            onOpenMusic={() => setMusicOpen(true)}
            onSetEnvironment={setEnvironment}
            onGo={go}
            onOpenBook={(id) => {
              setActiveBook(id);
              go("book");
            }}
            onRenameBook={(id, title) => {
              const book = state.books.find((b) => b.id === id);
              if (book) renameBook(id, title, book.subtitle);
            }}
            onPlaceBook={setBookShelf}
            onNewBook={() => {
              addBook();
            }}
          />
        )}

        <RoomListen
          onAct={(id: ListenId) => {
            if (id === "book") {
              go("book");
              return;
            }
            if (id === "window") {
              setSettingsSection('appearance'); setEnvOpen(true);
              return;
            }
            if (id === "shelf") {
              go("shelf");
              return;
            }
            if (id === "archive") {
              go("archive");
              return;
            }
            if (id === "map") {
              go("atlas");
              return;
            }
            if (id === "guestbook") {
              go("guestbook");
              return;
            }
            if (id === "crt") {
              setMusicOpen(true);
              return;
            }
            if (id === "chair") {
              scene?.sit();
              return;
            }
            if (id === "drawer") {
              scene?.openDrawer();
              return;
            }
            if (id === "stand") {
              scene?.stand();
              return;
            }
            if (id === "door") {
              scene?.openDoor();
              return;
            }
            if (id === "lamp") {
              scene?.toggleLamp();
              return;
            }
            if (id === "switch") {
              scene?.toggleCeiling();
            }
          }}
        />

        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
          {motes.map((m, i) => (
            <span
              key={i}
              className="ks-mote"
              style={{
                left: m.left,
                bottom: "10%",
                width: m.size,
                height: m.size,
                animationDuration: `${m.dur}s`,
                animationDelay: `${m.delay}s`,
              }}
            />
          ))}
        </div>

        {!touring && (
          <button
            className="absolute bottom-3 right-3 z-30 ks-chip"
            title="Room settings"
            aria-label="Room settings"
            aria-expanded={envOpen}
            onClick={() => {setSettingsSection('appearance'); setEnvOpen(true);}}
          >
            <Settings2 size={16} />
          </button>
        )}

        {!touring && <PhaseBadge phase={phase} />}
      </main>

      <RoomCurator visible={layout !== "glb" && (layout === "flat" || roomFace === "front") && !touring} />
      {touring && <RoomTour />}

      {envOpen && <EnvironmentPanel initialSection={settingsSection} onClose={() => setEnvOpen(false)} />}
      {doorOpen && <LeavePanel onClose={() => setDoorOpen(false)} />}
      {achOpen && <AchievementsPanel onClose={() => setAchOpen(false)} unlocked={state.achievements} />}
      <AchievementsToast
        ids={newlyUnlocked}
        onDone={() => {
          markAchievementsSeen(newlyUnlocked);
          clearNewlyUnlocked();
        }}
      />
    </div>
  );
}

function AchievementsPanel({ onClose, unlocked }: { onClose: () => void; unlocked: string[] }) {
  const {setDiscoveryOpen,isVisitor}=useNav();const {state}=useApp();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        className="ks-panel w-full max-w-md p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Keepsakes found"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h2 className="font-display text-xl">Keepsakes found</h2>
        </div>
        {!isVisitor&&<button className="ks-tool mb-3" onClick={()=>{onClose();setDiscoveryOpen('collection');}}>Letters and keepsakes</button>}
        <ul className="space-y-2" style={{maxHeight:'58vh',overflowY:'auto'}}>
          {ACHIEVEMENTS.map((a) => {
            const has = unlocked.includes(a.id);
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2">
                <div>
                  <p className={has ? "text-paper" : "text-paper/40"}>{has ? a.title : "???"}</p>
                  <p className="text-sm text-paper/50">{a.hint}</p>
                  {has&&state.achievementsAt[a.id]&&<small>Found {new Date(state.achievementsAt[a.id]).toLocaleDateString()}</small>}
                </div>
                <span className={has ? "text-accent" : "text-paper/30"}>{has ? "✦" : "·"}</span>
              </li>
            );
          })}
        </ul>
        <button className="ks-tool mt-4 w-full justify-center" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

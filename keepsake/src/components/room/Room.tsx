import { useEffect, useMemo, useRef, useState } from "react";
import { Settings2, Sparkles } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { VIEW_AS_LABEL } from "../../lib/permissions";
import type { ViewAs } from "../../types/app";
import { ACHIEVEMENTS } from "../../types/app";
import { roomLayoutFromSearch } from "../../lib/roomLayout";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { AchievementsToast } from "./AchievementsToast";
import { RoomTour } from "./RoomTour";
import { MusicPanel } from "./MusicPanel";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { PhaseBadge, phaseOf } from "./RoomFurniture";
import { RoomFlat } from "./RoomFlat";
import { RoomChamber } from "./RoomChamber";

export function Room() {
  const { state, environment, activeBook, recordProgress, newlyUnlocked, clearNewlyUnlocked, markAchievementsSeen, setActiveBook } =
    useApp();
  const { go, viewAs, setViewAs, touring, tourFocus, startTour, roomFace, setRoomFace } = useNav();
  const [envOpen, setEnvOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });
  const layout = useMemo(() => roomLayoutFromSearch(), []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") === "1") startTour();
  }, [startTour]);

  const phase = phaseOf(environment.timeMode);

  useEffect(() => {
    if (phase === "night") recordProgress({ visitedAtNight: true });
  }, [phase, recordProgress]);

  const onMove = (e: React.PointerEvent) => {
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
      className={`ks-room flex h-dvh flex-col overflow-hidden${layout === "chamber" ? " ks-room--chamber" : ""}`}
      data-room-layout={layout}
    >
      <a className="ks-skip" href="#ks-main">
        Skip to the room
      </a>
      <h1 className="sr-only">{state.profile.displayName}&rsquo;s scrapbook room</h1>
      <header
        data-tour="hud"
        className={`z-30 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6${tourFocus === "hud" ? " ks-hud--tour" : ""}`}
      >
        <div className="leading-tight">
          <p className="font-display text-sm uppercase tracking-[0.22em] text-paper/70">Keepsake</p>
          <p className="ks-caption text-paper/80" style={{ fontSize: "1.15rem" }}>
            {state.profile.displayName}&rsquo;s room
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 text-sm text-paper/80">
            <span className="hidden sm:inline text-paper/50">View as</span>
            <select
              name="viewAs"
              aria-label="View the room as"
              className="bg-transparent text-paper outline-none"
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
          <span className="hidden text-sm text-paper/50 sm:inline">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>
      </header>

      <main id="ks-main" ref={sceneRef} className="ks-scene flex-1" onPointerMove={onMove}>
        {layout === "flat" ? (
          <RoomFlat
            phase={phase}
            environment={environment}
            activeBook={activeBook}
            bookCount={state.books.length}
            touring={touring}
            tourFocus={tourFocus}
            layer={layer}
            onOpenWindow={() => setEnvOpen(true)}
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
            onOpenWindow={() => setEnvOpen(true)}
            onOpenMusic={() => setMusicOpen(true)}
            onGo={go}
            onOpenBook={(id) => {
              setActiveBook(id);
              go("book");
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-0 z-10">
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
            onClick={() => setEnvOpen(true)}
          >
            <Settings2 size={16} />
          </button>
        )}

        {!touring && <PhaseBadge phase={phase} />}
      </main>

      {touring && <RoomTour />}

      {envOpen && <EnvironmentPanel onClose={() => setEnvOpen(false)} />}
      {musicOpen && <MusicPanel onClose={() => setMusicOpen(false)} />}
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
        <ul className="space-y-2">
          {ACHIEVEMENTS.map((a) => {
            const has = unlocked.includes(a.id);
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2">
                <div>
                  <p className={has ? "text-paper" : "text-paper/40"}>{has ? a.title : "???"}</p>
                  <p className="text-sm text-paper/50">{a.hint}</p>
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

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  Clock,
  Library,
  Map as MapIcon,
  Music,
  PenLine,
  Settings2,
  Sparkles,
  Sun,
  Moon,
  CloudSun,
} from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { VIEW_AS_LABEL } from "../../lib/permissions";
import { COVER_STYLES } from "../../types/scrapbook";
import type { ViewAs } from "../../types/app";
import { ACHIEVEMENTS } from "../../types/app";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { AchievementsToast } from "./AchievementsToast";

type Phase = "day" | "dusk" | "night";

function phaseOf(timeMode: string): Phase {
  if (timeMode === "day") return "day";
  if (timeMode === "night") return "night";
  if (timeMode === "dusk") return "dusk";
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

const SKY: Record<Phase, string> = {
  day: "linear-gradient(180deg,#8fb8d6 0%,#c8dce6 55%,#e9dcc4 100%)",
  dusk: "linear-gradient(180deg,#3a4a6b 0%,#a9668a 55%,#e6a15e 100%)",
  night: "linear-gradient(180deg,#0d1830 0%,#1d2a49 60%,#2a3355 100%)",
};

const SEASON_TINT: Record<string, string> = {
  spring: "rgb(120 170 120 / 0.10)",
  summer: "rgb(240 200 120 / 0.10)",
  autumn: "rgb(200 120 60 / 0.12)",
  winter: "rgb(180 210 235 / 0.12)",
};

export function Room() {
  const { state, environment, setEnvironment, activeBook, unlock, newlyUnlocked, clearNewlyUnlocked } =
    useApp();
  const { go, viewAs, setViewAs } = useNav();
  const [envOpen, setEnvOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });

  const phase = phaseOf(environment.timeMode);
  const cover = COVER_STYLES[activeBook?.coverStyle ?? "cocoa"];

  useEffect(() => {
    if (phase === "night") unlock("night-owl");
  }, [phase, unlock]);

  const onMove = (e: React.PointerEvent) => {
    const r = sceneRef.current?.getBoundingClientRect();
    if (!r) return;
    setPar({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };

  const layer = (depth: number) => ({
    transform: `translate(${-par.x * depth}px, ${-par.y * depth}px)`,
  });

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
    <div className="ks-room flex h-dvh flex-col overflow-hidden">
      {/* HUD */}
      <header className="z-30 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
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
              className="bg-transparent text-paper outline-none"
              value={viewAs}
              onChange={(e) => {
                const v = e.target.value as ViewAs;
                setViewAs(v);
                if (v !== "owner") unlock("host");
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
            title="Achievements"
            onClick={() => setAchOpen((v) => !v)}
          >
            <Sparkles size={16} />
          </button>
          <span className="hidden text-sm text-paper/50 sm:inline">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>
      </header>

      {/* Scene */}
      <div ref={sceneRef} className="ks-scene flex-1" onPointerMove={onMove}>
        {/* Wall + window (back layer) */}
        <div className="pointer-events-none absolute inset-0" style={layer(6)}>
          <div
            className="absolute inset-0"
            style={{
              background:
                phase === "night"
                  ? "linear-gradient(180deg,#2a2119,#1a1410)"
                  : "linear-gradient(180deg,#3a2c22,#2a2019)",
            }}
          />
          <div className="absolute inset-0" style={{ background: SEASON_TINT[environment.season] }} />
          {/* Window */}
          <button
            className="ks-obj"
            style={{ left: "8%", top: "12%", width: "26%", height: "42%" }}
            onClick={() => setEnvOpen(true)}
            aria-label="Window and room settings"
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-md"
              style={{
                background: SKY[phase],
                boxShadow: "inset 0 0 0 8px #4a3224, inset 0 0 40px rgb(0 0 0 /0.35)",
              }}
            >
              {/* sun / moon */}
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
                  boxShadow:
                    phase === "night" ? "0 0 24px #aab8ff88" : "0 0 40px #ffdd8bcc",
                }}
              />
              {/* muntin bars */}
              <div className="absolute left-1/2 top-0 h-full w-[6px] -translate-x-1/2 bg-[#4a3224]" />
              <div className="absolute top-1/2 left-0 w-full h-[6px] -translate-y-1/2 bg-[#4a3224]" />
              {environment.weather !== "clear" && <WeatherFx kind={environment.weather} />}
            </div>
            <span className="ks-obj-label">the window</span>
          </button>
        </div>

        {/* Mid layer: shelves, frames, corkboard */}
        <div className="pointer-events-none absolute inset-0" style={layer(16)}>
          {/* Bookshelf */}
          <button
            className="ks-obj"
            style={{ right: "6%", top: "10%", width: "30%", height: "34%" }}
            onClick={() => go("shelf")}
            aria-label="Bookshelf"
          >
            <Shelf count={state.books.length} />
            <span className="ks-obj-label">the bookshelf</span>
          </button>

          {/* Timeline frame */}
          <button
            className="ks-obj"
            style={{ left: "40%", top: "14%", width: "20%", height: "16%" }}
            onClick={() => go("timeline")}
            aria-label="Timeline"
          >
            <div className="flex h-full w-full items-center justify-center rounded-sm bg-[#3a2e26] p-1"
                 style={{ boxShadow: "inset 0 0 0 6px #6e4a32" }}>
              <div className="flex h-full w-full items-center justify-center rounded-sm bg-paper/90 text-ink">
                <Clock size={20} />
              </div>
            </div>
            <span className="ks-obj-label">the timeline</span>
          </button>

          {/* Corkboard / map */}
          <button
            className="ks-obj"
            style={{ left: "38.5%", top: "33%", width: "23%", height: "20%" }}
            onClick={() => go("atlas")}
            aria-label="Memory map"
          >
            <div className="flex h-full w-full items-center justify-center rounded-sm"
                 style={{ background: "#b98a4e", boxShadow: "inset 0 0 0 5px #6e4a32, inset 0 0 30px rgb(0 0 0/.25)" }}>
              <MapIcon size={22} className="text-[#3a2a18]" />
            </div>
            <span className="ks-obj-label">the map</span>
          </button>
        </div>

        {/* Front layer: desk + objects */}
        <div className="pointer-events-none absolute inset-0" style={layer(30)}>
          {/* Desk surface */}
          <div
            className="ks-desk absolute bottom-0 left-0 right-0"
            style={{ height: "26%" }}
          />

          {/* Filing cabinet */}
          <button
            className="ks-obj"
            style={{ left: "5%", bottom: "16%", width: "16%", height: "40%" }}
            onClick={() => go("archive")}
            aria-label="Filing cabinet"
          >
            <Cabinet />
            <span className="ks-obj-label">the archive</span>
          </button>

          {/* The book on the desk */}
          <button
            className="ks-obj"
            style={{ left: "42%", bottom: "10%", width: "18%", height: "30%" }}
            onClick={() => go("book")}
            aria-label={`Open ${activeBook?.title ?? "book"}`}
          >
            <div
              className="flex h-full w-full flex-col items-center justify-center rounded-md p-3 text-center"
              style={{
                background: `linear-gradient(90deg, rgb(0 0 0 /.35), transparent 14%), url('/textures/leather.jpg') center/cover`,
                backgroundColor: cover.leather,
                color: cover.ink,
                boxShadow: "6px 12px 30px rgb(0 0 0 /.5)",
                animation: "ks-mote-float 0s",
              }}
            >
              <span className="text-[0.6rem] uppercase tracking-[0.2em] opacity-70">a book of</span>
              <span className="font-display text-lg font-semibold leading-tight">
                {activeBook?.title ?? "Keepsake"}
              </span>
              <span className="ks-caption" style={{ fontSize: "1rem" }}>
                {activeBook?.subtitle ?? ""}
              </span>
              <BookOpen size={16} className="mt-1 opacity-70" />
            </div>
            <span className="ks-obj-label">open the book</span>
          </button>

          {/* Guest book on the desk */}
          <button
            className="ks-obj"
            style={{ left: "64%", bottom: "12%", width: "12%", height: "16%" }}
            onClick={() => go("guestbook")}
            aria-label="Guest book"
          >
            <div className="flex h-full w-full items-center justify-center rounded-sm bg-[#7a3d3a] text-paper"
                 style={{ boxShadow: "0 8px 18px rgb(0 0 0/.4)" }}>
              <PenLine size={18} />
            </div>
            <span className="ks-obj-label">the guest book</span>
          </button>

          {/* CRT / music */}
          <button
            className="ks-obj"
            style={{ right: "6%", bottom: "16%", width: "18%", height: "26%" }}
            onClick={() => setEnvironment({ musicOn: !environment.musicOn })}
            aria-label="CRT music"
          >
            <CRT on={environment.musicOn} />
            <span className="ks-obj-label">{environment.musicOn ? "music: on" : "the CRT"}</span>
          </button>

          {/* Lamp glow at night */}
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

        {/* Dust motes */}
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

        {/* Settings hint */}
        <button
          className="absolute bottom-3 right-3 z-30 ks-chip"
          title="Room settings"
          onClick={() => setEnvOpen(true)}
        >
          <Settings2 size={16} />
        </button>

        <PhaseBadge phase={phase} />
      </div>

      {envOpen && <EnvironmentPanel onClose={() => setEnvOpen(false)} />}
      {achOpen && <AchievementsPanel onClose={() => setAchOpen(false)} unlocked={state.achievements} />}
      <AchievementsToast ids={newlyUnlocked} onDone={clearNewlyUnlocked} />
    </div>
  );
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const Icon = phase === "night" ? Moon : phase === "dusk" ? CloudSun : Sun;
  return (
    <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-sm text-paper/70">
      <Icon size={14} /> {phase}
    </div>
  );
}

function Shelf({ count }: { count: number }) {
  const spines = Array.from({ length: Math.max(4, count + 2) });
  const colors = ["#4a3224", "#2f4a3c", "#5b2733", "#20293f", "#7a5320"];
  return (
    <div className="flex h-full w-full flex-col justify-between rounded-sm bg-[#3a2a1e] p-2"
         style={{ boxShadow: "inset 0 0 30px rgb(0 0 0/.4)" }}>
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

function Cabinet() {
  return (
    <div className="flex h-full w-full flex-col gap-1 rounded-sm bg-[#4a3a2c] p-1.5"
         style={{ boxShadow: "0 8px 20px rgb(0 0 0/.45)" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 items-center justify-center rounded-sm bg-[#5c4836]">
          <div className="h-1.5 w-6 rounded-full bg-[#2c2418]" />
        </div>
      ))}
      <Archive size={14} className="mx-auto text-paper/40" />
    </div>
  );
}

function CRT({ on }: { on: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#3a3330] p-2"
         style={{ boxShadow: "0 10px 22px rgb(0 0 0/.5)" }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-md"
        style={{
          background: on
            ? "radial-gradient(circle, #2a5f6a, #10222a)"
            : "radial-gradient(circle, #1a2224, #0c1113)",
          boxShadow: on ? "inset 0 0 24px #4fd6e0aa" : "inset 0 0 18px #000",
        }}
      >
        <Music size={20} className={on ? "text-[#9fe8ee]" : "text-paper/40"} />
      </div>
    </div>
  );
}

function WeatherFx({ kind }: { kind: "rain" | "snow" }) {
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

function AchievementsPanel({ onClose, unlocked }: { onClose: () => void; unlocked: string[] }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="ks-panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
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

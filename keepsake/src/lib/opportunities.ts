/*
 * Curated-RNG opportunity queue (Bible §20).
 * Candidates carry eligibility + priority + a cooldown. A curator picks at most
 * one eligible, not-in-cooldown candidate (highest priority; ties broken
 * randomly) and the caller records a receipt. This keeps the room attentive but
 * quiet — "one beautiful thing is better than five", and often nothing happens.
 */
import type { AppState } from "../types/app";

export type OpportunityKind =
  | "welcome"
  | "reward"
  | "whisper"
  | "letter"
  | "ajar-book"
  | "photo-out"
  | "bookmark"
  | "kettle"
  | "pressed-flower"
  | "window-draft"
  | "guest-wave"
  | "map-glint"
  | "empty-page"
  | "season-note"
  | "night-moth"
  | "tea-ring";

export interface Opportunity {
  id: OpportunityKind;
  priority: number;
  cooldownMs: number;
  eligible: (ctx: OpportunityContext) => boolean;
}

export interface OpportunityContext {
  state: AppState;
  /** an unlocked-but-unseen achievement id, if any */
  pendingReward: string | null;
}

const HOUR = 3600_000;

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "welcome",
    priority: 100,
    cooldownMs: 0,
    eligible: ({ state }) => !state.progress.completedTour,
  },
  {
    id: "reward",
    priority: 60,
    cooldownMs: 0,
    eligible: ({ pendingReward }) => pendingReward !== null,
  },
  {
    id: "empty-page",
    priority: 28,
    cooldownMs: 6 * HOUR,
    eligible: ({ state }) =>
      state.books.some((b) => b.pages.some((p) => !p.titlePage && p.elements.length === 0)),
  },
  {
    id: "whisper",
    priority: 30,
    cooldownMs: 3 * HOUR,
    eligible: ({ state }) => state.notes.some((n) => n.approved),
  },
  {
    id: "photo-out",
    priority: 24,
    cooldownMs: 8 * HOUR,
    eligible: ({ state }) => state.archive.length > 0,
  },
  {
    id: "ajar-book",
    priority: 20,
    cooldownMs: 12 * HOUR,
    eligible: ({ state }) => state.books.length > 1,
  },
  {
    id: "bookmark",
    priority: 18,
    cooldownMs: 10 * HOUR,
    eligible: ({ state }) => state.books.some((b) => b.pages.length > 2),
  },
  {
    id: "guest-wave",
    priority: 16,
    cooldownMs: 10 * HOUR,
    eligible: ({ state }) => state.guestbook.length > 0,
  },
  {
    id: "map-glint",
    priority: 15,
    cooldownMs: 12 * HOUR,
    eligible: ({ state }) => state.pins.length > 0,
  },
  {
    id: "night-moth",
    priority: 14,
    cooldownMs: 16 * HOUR,
    eligible: ({ state }) =>
      state.environment.timeMode === "night" ||
      (state.environment.timeMode === "auto" && (new Date().getHours() < 6 || new Date().getHours() >= 20)),
  },
  {
    id: "pressed-flower",
    priority: 13,
    cooldownMs: 20 * HOUR,
    eligible: ({ state }) => state.environment.season === "spring" || state.environment.season === "summer",
  },
  {
    id: "season-note",
    priority: 12,
    cooldownMs: 24 * HOUR,
    eligible: () => true,
  },
  {
    id: "letter",
    priority: 10,
    cooldownMs: 6 * HOUR,
    eligible: () => true,
  },
  {
    id: "window-draft",
    priority: 9,
    cooldownMs: 8 * HOUR,
    eligible: ({ state }) => state.environment.weather !== "clear",
  },
  {
    id: "kettle",
    priority: 8,
    cooldownMs: 14 * HOUR,
    eligible: () => true,
  },
  {
    id: "tea-ring",
    priority: 7,
    cooldownMs: 18 * HOUR,
    eligible: () => true,
  },
];

const KINDS = new Set(OPPORTUNITIES.map((o) => o.id));

export function isOpportunityKind(value: string): value is OpportunityKind {
  return KINDS.has(value as OpportunityKind);
}

/** Choose zero or one opportunity to present now. */
export function pickOpportunity(
  ctx: OpportunityContext,
  receipts: Record<string, number>,
  now = Date.now(),
  rng = Math.random,
): OpportunityKind | null {
  const ready = OPPORTUNITIES.filter((o) => {
    if (!o.eligible(ctx)) return false;
    const last = receipts[o.id];
    if (last === undefined) return true;
    if (!Number.isFinite(o.cooldownMs)) return false;
    return now - last >= o.cooldownMs;
  });
  if (ready.length === 0) return null;
  const top = Math.max(...ready.map((o) => o.priority));
  // High-priority events always present; quieter ones may leave the room still.
  if (top < 25 && rng() < 0.35) return null;
  const tied = ready.filter((o) => o.priority === top);
  return tied[Math.floor(rng() * tied.length)].id;
}

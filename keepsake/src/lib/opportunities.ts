/*
 * Curated-RNG opportunity queue (Bible §20).
 * Candidates carry eligibility + priority + a cooldown. A curator picks at most
 * one eligible, not-in-cooldown candidate (highest priority; ties broken
 * randomly) and the caller records a receipt. This keeps the room attentive but
 * quiet — "one beautiful thing is better than five", and often nothing happens.
 */
import type { AppState } from "../types/app";

export type OpportunityKind = "welcome" | "reward" | "whisper" | "letter" | "ajar-book";

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

const OPPORTUNITIES: Opportunity[] = [
  {
    id: "welcome",
    priority: 100,
    cooldownMs: 0,
    // Once the guided tour is finished or skipped it never auto-starts again.
    // Replay lives in room settings ("Show me around").
    eligible: ({ state }) => !state.progress.completedTour,
  },
  {
    id: "reward",
    priority: 60,
    cooldownMs: 0,
    eligible: ({ pendingReward }) => pendingReward !== null,
  },
  {
    id: "whisper",
    priority: 30,
    cooldownMs: 3 * HOUR,
    eligible: ({ state }) => state.notes.some((n) => n.approved),
  },
  {
    id: "ajar-book",
    priority: 20,
    cooldownMs: 12 * HOUR,
    eligible: ({ state }) => state.books.length > 1,
  },
  {
    id: "letter",
    priority: 10,
    cooldownMs: 6 * HOUR,
    eligible: () => true,
  },
];

/** Choose zero or one opportunity to present now. */
export function pickOpportunity(
  ctx: OpportunityContext,
  receipts: Record<string, number>,
  now = Date.now(),
): OpportunityKind | null {
  const ready = OPPORTUNITIES.filter((o) => {
    if (!o.eligible(ctx)) return false;
    const last = receipts[o.id];
    if (last === undefined) return true; // never shown -> eligible now
    if (!Number.isFinite(o.cooldownMs)) return false; // once-only, already shown
    return now - last >= o.cooldownMs;
  });
  if (ready.length === 0) return null;
  const top = Math.max(...ready.map((o) => o.priority));
  const tied = ready.filter((o) => o.priority === top);
  return tied[Math.floor(Math.random() * tied.length)].id;
}

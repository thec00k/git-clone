/*
 * Achievement rules engine (Bible §12).
 * `evaluate` is a pure function of state, so grants are reproducible and
 * idempotent: completion is derived from the ledger (books, pins, guest book,
 * and recorded `progress` events), never from ad-hoc side effects. The store
 * merges the result and stamps a completion time for anything newly true.
 */
import type { AppState } from "../types/app";

type Rule = (s: AppState) => boolean;

const totalPhotos = (s: AppState) =>
  s.books.reduce(
    (n, b) => n + b.pages.reduce((m, p) => m + p.elements.filter((e) => e.type === "photo").length, 0),
    0,
  );

const totalCaptions = (s: AppState) =>
  s.books.reduce(
    (n, b) => n + b.pages.reduce((m, p) => m + p.elements.filter((e) => e.type === "caption").length, 0),
    0,
  );

const RULES: Record<string, Rule> = {
  "first-photo": (s) => totalPhotos(s) >= 1,
  "full-spread": (s) => s.books.some((b) => b.pages.some((p) => p.elements.filter((e) => e.type === "photo").length >= 3)),
  wordsmith: (s) => totalCaptions(s) >= 1,
  storyteller: (s) => totalCaptions(s) >= 3,
  decorator: (s) => s.books.some((b) => b.pages.some((p) => p.elements.some((e) => e.type === "sticker"))),
  collector: (s) => totalPhotos(s) >= 8,
  librarian: (s) => s.books.length > 1,
  cartographer: (s) => s.pins.length > 0,
  keeper: (s) => s.guestbook.length > 0,
  "night-owl": (s) => s.progress.visitedAtNight,
  host: (s) => s.progress.previewedAsVisitor,
};

/** All achievement ids that are currently satisfied by the state. */
export function evaluate(state: AppState): string[] {
  return Object.entries(RULES)
    .filter(([, rule]) => rule(state))
    .map(([id]) => id);
}

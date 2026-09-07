/*
 * Achievement rules engine (Bible §12).
 * `evaluate` is a pure function of state, so grants are reproducible and
 * idempotent: completion is derived from the ledger (books, pins, guest book,
 * and recorded `progress` events), never from ad-hoc side effects. The store
 * merges the result and stamps a completion time for anything newly true.
 */
import type { AppState } from "../types/app";
import {discoveryState,LETTERS} from './discoveries.ts';

type Rule = (s: AppState) => boolean;

const totalPhotos = (s: AppState) =>
  s.books.reduce(
    (n, b) => n + b.pages.reduce((m, p) => m + p.elements.filter((e) => e.type === "photo").length, 0),
    0,
  );

const totalCaptions = (s: AppState) =>
  s.books.reduce(
    (n, b) => n + b.pages.reduce((m, p) => m + p.elements.filter((e) => e.type === "caption"&&!e.id.startsWith('house_')).length, 0),
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
  const base=state.achievementBaseline;
  const earned=base?{...state,books:state.books.map(b=>({...b,pages:b.pages.map(p=>({...p,elements:p.elements.filter(e=>!base.elements.includes(e.id))}))})),pins:state.pins.filter(p=>!base.pins.includes(p.id)),guestbook:state.guestbook.filter(g=>!base.guests.includes(g.id))}:state;
  const result=Object.entries(RULES).filter(([id,rule])=>id==='librarian'&&base?state.books.some(b=>!base.books.includes(b.id)):rule(earned)).map(([id])=>id);
  const entries=discoveryState(state).entries;
  if(entries.some(e=>e.keptAt&&!e.reward))result.push('correspondence');
  if(entries.some(e=>e.location==='shelf'&&e.readAt&&!e.reward))result.push('between-lines');
  if([...new Set(LETTERS.map(l=>l.story).filter(Boolean))].some(story=>LETTERS.filter(l=>l.story===story).every(l=>entries.some(e=>e.id===l.id&&e.readAt))))result.push('story-kept');
  if(state.progress.printedToBook)result.push('printed-memory');
  return result;
}

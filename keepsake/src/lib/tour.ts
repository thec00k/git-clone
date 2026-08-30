/*
 * First-visit room tour copy. House voice, short, skippable — a guided look
 * around rather than a modal checklist. Inspired by messenger.abeto's
 * bottom-of-scene dialogue, written for Keepsake's "the house" narrator.
 */
import type { HotspotId } from "./hotspots";

export interface TourStep {
  id: string;
  speaker: string;
  text: string;
  focus?: HotspotId;
}

export const TOUR_SPEAKER = "THE HOUSE";

/** Session flags so the house does not welcome you again after wander-off. */
export const TOUR_DONE_KEY = "ks-tour-done";
export const CURATOR_SESSION_KEY = "ks-curator";

export function markTourFinished(): void {
  try {
    sessionStorage.setItem(TOUR_DONE_KEY, "1");
    sessionStorage.setItem(CURATOR_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function tourAlreadyFinished(completedTour = false): boolean {
  if (completedTour) return true;
  try {
    return sessionStorage.getItem(TOUR_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "hello",
    speaker: TOUR_SPEAKER,
    text: "Welcome in. This is your room — a quiet place for the days you want to keep. I'll show you around, or you can wander on your own.",
  },
  {
    id: "book",
    speaker: TOUR_SPEAKER,
    text: "The book on the desk is where pages live. Open it to place photographs, write in your own hand, add a sticker, and turn the paper.",
    focus: "book",
  },
  {
    id: "window",
    speaker: TOUR_SPEAKER,
    text: "The window keeps the light. Tap it to change the hour, the season, the weather — or leave it to the day.",
    focus: "window",
  },
  {
    id: "shelf",
    speaker: TOUR_SPEAKER,
    text: "The bookshelf holds every book you've started. You can keep more than one, each with its own cover and who may see it.",
    focus: "shelf",
  },
  {
    id: "archive",
    speaker: TOUR_SPEAKER,
    text: "The cabinet is the archive. Every photograph you bring in is kept here, so you can find it again and place it in a book.",
    focus: "archive",
  },
  {
    id: "timeline",
    speaker: TOUR_SPEAKER,
    text: "The little frame on the wall is the timeline — years, and the days that marked them.",
    focus: "timeline",
  },
  {
    id: "map",
    speaker: TOUR_SPEAKER,
    text: "The corkboard is a memory map. Pin a place the way you'd pin a postcard. No exact coordinates, just a mark.",
    focus: "map",
  },
  {
    id: "guestbook",
    speaker: TOUR_SPEAKER,
    text: "The small book on the desk is for visitors. They may leave a line; you decide what stays.",
    focus: "guestbook",
  },
  {
    id: "crt",
    speaker: TOUR_SPEAKER,
    text: "The CRT plays music — a quiet pad that lives here, or your own Spotify if you connect it.",
    focus: "crt",
  },
  {
    id: "hud",
    speaker: TOUR_SPEAKER,
    text: "Up here you can preview the room as a guest would see it, and find the keepsakes you've earned along the way.",
    focus: "hud",
  },
  {
    id: "close",
    speaker: TOUR_SPEAKER,
    text: "Everything saves itself. There's no rush. The room will be here when you come back.",
  },
];

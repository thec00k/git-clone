/*
 * Shared room-object positions. The diorama buttons and the first-visit
 * tour spotlight both read from here so a highlight always lands on the
 * thing it is talking about.
 */
export type HotspotId =
  | "window"
  | "shelf"
  | "timeline"
  | "map"
  | "archive"
  | "book"
  | "guestbook"
  | "crt"
  | "hud";

export type HotspotBox = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  width: string;
  height: string;
};

/** Original single-wall diorama (`?room=flat`). */
export const HOTSPOTS: Record<HotspotId, HotspotBox> = {
  window: { left: "8%", top: "12%", width: "26%", height: "42%" },
  shelf: { right: "6%", top: "10%", width: "30%", height: "34%" },
  timeline: { left: "40%", top: "14%", width: "20%", height: "16%" },
  map: { left: "38.5%", top: "33%", width: "23%", height: "20%" },
  archive: { left: "5%", bottom: "16%", width: "16%", height: "40%" },
  book: { left: "42%", bottom: "10%", width: "18%", height: "30%" },
  guestbook: { left: "64%", bottom: "12%", width: "12%", height: "16%" },
  crt: { right: "6%", bottom: "16%", width: "18%", height: "26%" },
  hud: { left: "1.5%", top: "1.5%", width: "97%", height: "11%" },
};

/**
 * Positions on the chamber's facing wall. Shelf and map live on the
 * right / left walls as large dressed pieces; the front wall keeps the
 * desk, window, archive, and a recentered timeline.
 */
export const CHAMBER_HOTSPOTS: Record<HotspotId, HotspotBox> = {
  window: { left: "7%", top: "10%", width: "28%", height: "44%" },
  timeline: { left: "42%", top: "16%", width: "22%", height: "18%" },
  archive: { left: "5%", bottom: "14%", width: "16%", height: "40%" },
  book: { left: "40%", bottom: "9%", width: "20%", height: "32%" },
  guestbook: { left: "64%", bottom: "12%", width: "13%", height: "16%" },
  crt: { right: "6%", bottom: "14%", width: "18%", height: "28%" },
  hud: HOTSPOTS.hud,
  map: { left: "6%", top: "7%", width: "88%", height: "86%" },
  shelf: { left: "7%", top: "6%", width: "86%", height: "88%" },
};

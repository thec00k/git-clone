import type { HotspotId } from "./hotspots";

export const ROOM_GLB = "/room/keepsake.glb";

export const HOTSPOT_OBJECT: Record<Exclude<HotspotId, "hud" | "timeline">, string> = {
  window: "ks_window",
  book: "ks_book",
  crt: "ks_crt",
  archive: "ks_archive",
  guestbook: "ks_guestbook",
  map: "ks_map",
  shelf: "ks_shelf",
};

export const HOTSPOT_LABEL: Record<string, string> = {
  window: "Window and room settings",
  book: "Open the scrapbook",
  crt: "CRT music",
  archive: "Filing cabinet",
  guestbook: "Guest book",
  map: "Corkboard map",
  shelf: "Bookshelf",
};

/** Parent object name → hotspot id. Child meshes inherit the nearest ks_* ancestor. */
export function hotspotFromObjectName(name: string): Exclude<HotspotId, "hud" | "timeline"> | null {
  if (name === "ks_window") return "window";
  if (name === "ks_book") return "book";
  if (name === "ks_crt") return "crt";
  if (name === "ks_archive" || name.startsWith("ks_archive_")) return "archive";
  if (name === "ks_guestbook") return "guestbook";
  if (name === "ks_map") return "map";
  if (name === "ks_shelf") return "shelf";
  return null;
}

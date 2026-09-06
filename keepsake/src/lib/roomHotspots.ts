import type { HotspotId } from "./hotspots";

export const ROOM_GLB = "/room/keepsake.glb";

/** Sit target in the GLB. The coded placeholder chair is gone. */
export const CHAIR_OBJECT = "ks_chair";

/** Optional ceiling fixture. Light toggle attaches to the empty. */
export const CEILING_FAN_OBJECT = "ks_ceiling_fan";
export const CEILING_FAN_BLADES = "ks_ceiling_fan_blades";
export const CEILING_FAN_LIGHT = "ks_ceiling_fan_light";
/** Retro desk clock. Digits live on `ks_clock_digits` when that face exists. */
export const CLOCK_OBJECT = "ks_clock";
export const CLOCK_DIGITS = "ks_clock_digits";
/** Desk lamp. Click it to turn the bulb on. Optional child `ks_lamp_bulb`. */
export const LAMP_OBJECT = "ks_lamp";
export const LAMP_BULB = "ks_lamp_bulb";
/** Plate to the left of the window. Toggles the ceiling light. */
export const CEILING_SWITCH = "ks_ceiling_switch";
/** Empty outside the glass. Day / dusk / night aim through the window. */
export const WINDOW_SUN_OBJECT = "ks_window_sun";
/** Exit on the wall opposite the window. */
export const DOOR_OBJECT = "ks_door";
/** Desk body. The drawer slides when `Desk_Drawer` is a child. */
export const DESK_OBJECT = "Desk";
export const DESK_DRAWER = "Desk_Drawer";

export const HOTSPOT_OBJECT: Record<Exclude<HotspotId, "hud">, string> = {
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
export function hotspotFromObjectName(name: string): Exclude<HotspotId, "hud"> | null {
  if (name === "ks_window") return "window";
  if (name === "ks_book") return "book";
  if (name === "ks_crt") return "crt";
  if (name === "ks_archive" || name.startsWith("ks_archive_")) return "archive";
  if (name === "ks_guestbook") return "guestbook";
  if (name === "ks_map") return "map";
  if (name === "ks_shelf") return "shelf";
  return null;
}

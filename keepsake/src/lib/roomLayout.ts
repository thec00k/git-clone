import type { HotspotId } from "./hotspots";

export type RoomFace = "front" | "left" | "right";

export type RoomLayout = "chamber" | "flat";

/** How long the chamber yaw transition runs (keep in sync with `.ks-yaw`). */
export const YAW_MS = 820;

export function roomLayoutFromSearch(search: string = typeof window === "undefined" ? "" : window.location.search): RoomLayout {
  return new URLSearchParams(search).get("room") === "flat" ? "flat" : "chamber";
}

/** Which wall the tour (and arrow keys) should face for a given object. */
export function faceForHotspot(id: HotspotId | null | undefined): RoomFace {
  if (id === "shelf") return "right";
  if (id === "map") return "left";
  return "front";
}

export function yawDegrees(face: RoomFace): number {
  if (face === "left") return -90;
  if (face === "right") return 90;
  return 0;
}

export function nextFace(face: RoomFace, dir: "left" | "right"): RoomFace {
  if (dir === "left") {
    if (face === "right") return "front";
    return "left";
  }
  if (face === "left") return "front";
  return "right";
}

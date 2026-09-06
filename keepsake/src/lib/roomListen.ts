/*
 * VoiceOver / TalkBack path for the room.
 * The 3D (and painted) room is a picture. This is the list they swipe:
 * one thing at a time, in the house voice.
 */
import type { RoomFace, RoomLayout } from "./roomLayout";

export type ListenId =
  | "book"
  | "window"
  | "shelf"
  | "archive"
  | "map"
  | "guestbook"
  | "crt"
  | "chair"
  | "drawer"
  | "stand"
  | "door"
  | "lamp"
  | "switch"
  | "clock";

export interface ListenThing {
  id: ListenId;
  name: string;
  hint: string;
  face: RoomFace;
}

export const LISTEN_PREVIEW_KEY = "ks-listen-preview";

export const LISTEN_INTRO =
  "I can speak the room. VoiceOver on iPhone and TalkBack on Android swipe this list — one thing at a time. The picture stays a picture.";

const THINGS: Record<ListenId, Omit<ListenThing, "id">> = {
  book: {
    name: "The scrapbook",
    hint: "The book on the desk. Open it to place photographs, write in your own hand, add a sticker, and turn the paper.",
    face: "front",
  },
  window: {
    name: "The window",
    hint: "The window keeps the light. Change the hour, the season, the weather — or leave it to the day.",
    face: "front",
  },
  shelf: {
    name: "The bookshelf",
    hint: "The bookshelf holds every book you've started. Each has its own cover, and who may see it.",
    face: "right",
  },
  archive: {
    name: "The archive",
    hint: "The cabinet is the archive. Every photograph you bring in is kept here, so you can find it again.",
    face: "front",
  },
  map: {
    name: "The corkboard",
    hint: "A memory map. Pin a place the way you'd pin a postcard. No exact coordinates, just a mark.",
    face: "left",
  },
  guestbook: {
    name: "The guest book",
    hint: "The small book on the desk is for visitors. They may leave a line; you decide what stays.",
    face: "front",
  },
  crt: {
    name: "The CRT",
    hint: "The CRT plays music — a quiet pad that lives here, or your own Spotify if you connect it.",
    face: "front",
  },
  chair: {
    name: "The chair",
    hint: "The chair at the desk. Sit down to work on the pages.",
    face: "front",
  },
  drawer: {
    name: "The drawer",
    hint: "The desk drawer. Inside is a shop of sticker packs, paid in stamps.",
    face: "front",
  },
  stand: {
    name: "Stand up",
    hint: "Leave the chair and look around the room again.",
    face: "front",
  },
  door: {
    name: "The door",
    hint: "The door opposite the window. Step out to visit friends, leave the room as it is, tidy up, or close the door.",
    face: "front",
  },
  lamp: {
    name: "The lamp",
    hint: "The desk lamp. Click it to turn the bulb on or off.",
    face: "front",
  },
  switch: {
    name: "The light switch",
    hint: "A small switch to the left of the window. It turns the ceiling light on or off.",
    face: "front",
  },
  clock: {
    name: "The desk clock",
    hint: "A small clock beside the lamp. It keeps the hour the window is keeping.",
    face: "front",
  },
};

const BASE_ORDER: ListenId[] = ["book", "window", "shelf", "archive", "map", "guestbook", "crt"];

export function listenThings(opts: {
  layout: RoomLayout;
  seated: boolean;
  shopOpen: boolean;
}): ListenThing[] {
  const ids: ListenId[] = [...BASE_ORDER];
  if (opts.layout === "glb") {
    if (opts.seated) {
      ids.push("stand");
      if (!opts.shopOpen) ids.push("drawer");
    } else {
      ids.push("chair");
      ids.push("lamp");
      ids.push("clock");
      ids.push("switch");
      ids.push("door");
    }
  }
  return ids.map((id) => ({ id, ...THINGS[id] }));
}

export function listenPreviewFromSearch(search: string = typeof window === "undefined" ? "" : window.location.search): boolean {
  return new URLSearchParams(search).get("listen") === "1";
}

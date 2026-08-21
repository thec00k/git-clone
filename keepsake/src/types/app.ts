/*
 * App-level state for the 2.5D prototype: the whole "room" and its systems.
 * All of this is local (IndexedDB) for the prototype. Anything that would be a
 * server concern in production (accounts, real storage, multi-user, privacy
 * enforcement) is simulated locally and clearly labelled in the UI/docs.
 */
import type { Scrapbook, Visibility } from "./scrapbook";

export interface Profile {
  displayName: string;
}

export interface ArchivePhoto {
  id: string;
  src: string;
  aspect: number;
  createdAt: number;
  categories: string[];
  favorite: boolean;
}

export type TimeMode = "auto" | "day" | "dusk" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain" | "snow";

export type MusicProvider = "ambient" | "spotify";

export interface Environment {
  timeMode: TimeMode;
  season: Season;
  weather: Weather;
  lampOn: boolean;
  musicOn: boolean;
  musicProvider: MusicProvider;
  volume: number; // 0..1
  ambienceVolume: number; // 0..1
}

export interface GuestEntry {
  id: string;
  author: string;
  message: string;
  createdAt: number;
}

export interface PageNote {
  id: string;
  bookId: string;
  pageId: string;
  author: string;
  message: string;
  approved: boolean;
  createdAt: number;
}

/** Whose eyes are we previewing the room through (local "View as"). */
export type ViewAs = "owner" | "close" | "friend" | "public";

export interface MemoryPin {
  id: string;
  label: string;
  /** normalized 0..100 position on the illustrated map */
  x: number;
  y: number;
  caption: string;
  photoSrc?: string;
  createdAt: number;
}

export interface TimelineEntry {
  id: string;
  year: number;
  title: string;
  bookId?: string;
}

export interface AppState {
  version: number;
  profile: Profile;
  books: Scrapbook[];
  activeBookId: string | null;
  archive: ArchivePhoto[];
  environment: Environment;
  guestbook: GuestEntry[];
  notes: PageNote[];
  pins: MemoryPin[];
  timeline: TimelineEntry[];
  achievements: string[]; // unlocked ids
}

export interface AchievementDef {
  id: string;
  title: string;
  hint: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-photo", title: "First Light", hint: "Place your first photograph." },
  { id: "full-spread", title: "A Full Page", hint: "Put several photos on one page." },
  { id: "wordsmith", title: "In Your Own Hand", hint: "Write a caption." },
  { id: "librarian", title: "The Librarian", hint: "Keep more than one book." },
  { id: "cartographer", title: "Cartographer", hint: "Pin a memory to the map." },
  { id: "night-owl", title: "Night Owl", hint: "Visit the room after dark." },
  { id: "host", title: "A Good Host", hint: "Preview your room as a visitor." },
  { id: "keeper", title: "Keeper of Days", hint: "Sign the guest book." },
];

export type { Visibility };

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

export interface ArchiveTab {
  id: string;
  name: string;
}

export interface ArchivePhoto {
  id: string;
  src: string;
  aspect: number;
  createdAt: number;
  /** archive tab ids this photo belongs to */
  categories: string[];
  favorite: boolean;
}

export type TimeMode = "auto" | "day" | "dusk" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain" | "snow";

export type MusicProvider = "ambient" | "spotify" | "lofi" | "soundcloud";

export interface Environment {
  roomTheme?: "woodland" | "beachfront";
  roomQuality?: "balanced" | "high";
  timeMode: TimeMode;
  season: Season;
  weather: Weather;
  lampOn: boolean;
  /** Ceiling fan light. On/off only — day, dusk, and night stay on the window. */
  ceilingOn: boolean;
  /** Warm LED strips under each bookshelf row. */
  shelfLit: boolean;
  musicOn: boolean;
  musicProvider: MusicProvider;
  soundCloudUrl?: string;
  entryMusic?: "off" | "mellow" | "spotify" | "soundcloud";
  crtColor?: "blue" | "green" | "purple" | "pink" | "orange" | "red" | "coastal";
  volume: number; // 0..1
  ambienceVolume: number; // 0..1
  /** When true, map pins cannot be dragged (click still opens edit). */
  pinsLocked: boolean;
}

/** Lights, weather, and hour the door's "tidy up" restores. Books and photos stay. */
export const TIDY_ROOM: Pick<
  Environment,
  "timeMode" | "season" | "weather" | "lampOn" | "ceilingOn" | "shelfLit" | "pinsLocked"
> = {
  timeMode: "auto",
  season: "autumn",
  weather: "clear",
  lampOn: true,
  ceilingOn: true,
  shelfLit: true,
  pinsLocked: false,
};

export interface GuestEntry {
  deskCopy?: boolean;
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
  bookId?: string;
  pageId?: string;
  id: string;
  label: string;
  /** normalized 0..100 position on the illustrated map */
  x: number;
  y: number;
  caption: string;
  photoSrc?: string;
  createdAt: number;
}

/** A short fridge sticky left on a map photo. */
export const PIN_NOTE_MAX = 20;

export interface PinNote {
  id: string;
  pinId: string;
  author: string;
  message: string;
  createdAt: number;
}

/** Notable one-off events that feed achievement rules (part of the ledger). */
export interface Progress {
  printedToBook?: boolean;
  visitedAtNight: boolean;
  previewedAsVisitor: boolean;
  completedTour: boolean;
}

export interface AppState {
  framePhotoId?: string;
  discoveries?: import('../lib/discoveries').DiscoveryState;
  achievementBaseline?: { elements: string[]; books: string[]; pins: string[]; guests: string[] };
  latestPrint?: { src: string; photoId?: string; printedAt: number };
  version: number;
  profile: Profile;
  books: Scrapbook[];
  activeBookId: string | null;
  archive: ArchivePhoto[];
  archiveTabs: ArchiveTab[];
  environment: Environment;
  ownedRoomThemes?: ("woodland" | "beachfront")[];
  roomDecor?: {owned:string[];sillItem?:string;posterItem?:string;layouts?:Partial<Record<"woodland"|"beachfront",{sillItem?:string;posterItem?:string;crtColor?:Environment['crtColor']}>>};
  guestbook: GuestEntry[];
  notes: PageNote[];
  pinNotes: PinNote[];
  pins: MemoryPin[];
  achievements: string[]; // unlocked ids (completed)
  achievementsAt: Record<string, number>; // id -> unlocked timestamp (ledger)
  achievementsSeen: string[]; // ids whose reward has been presented
  progress: Progress; // recorded events used by rules
  receipts: Record<string, number>; // curated-RNG opportunity id -> last shown at
  /** Local drawer-shop currency. No real money. */
  stamps: number;
  /** Sticker pack ids the drawer has already sold you. Always includes everyday. */
  ownedStickerPacks: string[];
}

export interface AchievementDef {
  id: string;
  title: string;
  hint: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "correspondence", title: "A Little Correspondence", hint: "Keep a discovered letter." },
  { id: "between-lines", title: "Between the Lines", hint: "Read a note tucked among the books." },
  { id: "story-kept", title: "A Story Kept", hint: "Read the three letters of a woodland story." },
  { id: "printed-memory", title: "From Here to There", hint: "Print a photograph and place it in a scrapbook." },
  { id: "first-photo", title: "First Light", hint: "Place your first photograph." },
  { id: "full-spread", title: "A Full Page", hint: "Put several photos on one page." },
  { id: "wordsmith", title: "In Your Own Hand", hint: "Write a caption." },
  { id: "storyteller", title: "Storyteller", hint: "Write a few captions." },
  { id: "decorator", title: "A Light Touch", hint: "Add a sticker to a page." },
  { id: "collector", title: "The Collector", hint: "Keep a good many photographs." },
  { id: "librarian", title: "The Librarian", hint: "Keep more than one book." },
  { id: "cartographer", title: "Cartographer", hint: "Pin a memory to the map." },
  { id: "night-owl", title: "Night Owl", hint: "Visit the room after dark." },
  { id: "host", title: "A Good Host", hint: "Preview your room as a visitor." },
  { id: "keeper", title: "Keeper of Days", hint: "Sign the guest book." },
];

export type { Visibility };

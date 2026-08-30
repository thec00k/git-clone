import type { AppState, ArchivePhoto } from "../types/app";
import type { Scrapbook } from "../types/scrapbook";
import { uid } from "../lib/id";

interface Sample {
  src: string;
  categories: string[];
  aspect: number;
}

const SAMPLES: Sample[] = [
  { src: "/samples/coffee.jpg", categories: ["home", "mornings"], aspect: 1.5 },
  { src: "/samples/flowers.jpg", categories: ["nature"], aspect: 1.5 },
  { src: "/samples/bread.jpg", categories: ["home", "food"], aspect: 1.5 },
  { src: "/samples/coast.jpg", categories: ["travel", "nature"], aspect: 1.5 },
  { src: "/samples/letters.jpg", categories: ["keepsakes"], aspect: 1.5 },
  { src: "/samples/forest.jpg", categories: ["travel", "nature"], aspect: 1.5 },
  { src: "/samples/books.jpg", categories: ["home"], aspect: 1.5 },
];

export function createSeed(): AppState {
  const now = Date.now();
  const tabNames = [...new Set(SAMPLES.flatMap((s) => s.categories))];
  const archiveTabs = tabNames.map((name) => ({ id: name, name }));
  const archive: ArchivePhoto[] = SAMPLES.map((s, i) => ({
    id: uid("ph"),
    src: s.src,
    aspect: s.aspect,
    createdAt: now - (SAMPLES.length - i) * 86400000,
    categories: s.categories,
    favorite: i === 0,
  }));

  const photo = (idx: number) => ({ src: archive[idx].src, photoId: archive[idx].id });

  const book: Scrapbook = {
    id: uid("book"),
    title: "Keepsake",
    subtitle: "small days",
    coverStyle: "cocoa",
    visibility: "private",
    createdAt: now,
    updatedAt: now,
    pages: [
      {
        id: uid("page"),
        titlePage: true,
        elements: [
          {
            id: uid("el"),
            type: "caption",
            text: "a book of small, ordinary, unforgettable days.",
            x: 50,
            y: 68,
            w: 66,
            rotation: -2,
            z: 1,
            fontSize: 6,
            color: "#5c4e3e",
          },
        ],
      },
      {
        id: uid("page"),
        elements: [
          { id: uid("el"), type: "photo", ...photo(0), x: 34, y: 31, w: 46, rotation: -5, z: 1, frame: "polaroid" },
          { id: uid("el"), type: "photo", ...photo(1), x: 64, y: 42, w: 46, rotation: 6, z: 2, frame: "polaroid" },
          {
            id: uid("el"),
            type: "caption",
            text: "sunday light, slow coffee",
            x: 42,
            y: 76,
            w: 64,
            rotation: -3,
            z: 3,
            fontSize: 7,
            color: "#2c2418",
          },
        ],
      },
      {
        id: uid("page"),
        elements: [
          { id: uid("el"), type: "photo", ...photo(2), x: 50, y: 40, w: 64, rotation: 3, z: 1, frame: "polaroid" },
          {
            id: uid("el"),
            type: "caption",
            text: "fresh from the oven",
            x: 50,
            y: 82,
            w: 58,
            rotation: -2,
            z: 2,
            fontSize: 7,
            color: "#9b2e2e",
          },
        ],
      },
      {
        id: uid("page"),
        elements: [
          { id: uid("el"), type: "photo", ...photo(3), x: 52, y: 36, w: 68, rotation: -4, z: 1, frame: "tape" },
          { id: uid("el"), type: "photo", ...photo(4), x: 32, y: 68, w: 40, rotation: 7, z: 2, frame: "polaroid" },
          {
            id: uid("el"),
            type: "caption",
            text: "salt air & old letters",
            x: 62,
            y: 82,
            w: 46,
            rotation: 4,
            z: 3,
            fontSize: 6,
            color: "#1e3a5f",
          },
        ],
      },
    ],
  };

  return {
    version: 1,
    profile: { displayName: "You" },
    books: [book],
    activeBookId: book.id,
    archive,
    archiveTabs,
    environment: {
      timeMode: "auto",
      season: "autumn",
      weather: "clear",
      lampOn: true,
      musicOn: false,
      musicProvider: "ambient",
      volume: 0.5,
      ambienceVolume: 0.4,
    },
    guestbook: [
      {
        id: uid("g"),
        author: "A friend",
        message: "what a cozy little room. thanks for having me.",
        createdAt: now - 3600000,
      },
    ],
    notes: [],
    pins: [
      {
        id: uid("pin"),
        label: "the coast",
        x: 62,
        y: 44,
        caption: "the week we chased the tide",
        photoSrc: "/samples/coast.jpg",
        createdAt: now - 200000000,
      },
    ],
    timeline: [
      { id: uid("t"), year: new Date().getFullYear(), title: "This year", bookId: book.id },
    ],
    achievements: [],
    achievementsAt: {},
    achievementsSeen: [],
    progress: { visitedAtNight: false, previewedAsVisitor: false, completedTour: false },
    receipts: {},
  };
}

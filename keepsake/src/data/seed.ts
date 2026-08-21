import type { Scrapbook } from "../types/scrapbook";
import { uid } from "../lib/id";

/**
 * A gentle starter book so a first-time visitor lands in a place that already
 * feels lived-in (per the Bible: "Every user begins with the same starter
 * room"). Sample photographs ship in /public/samples.
 */
export function createSeedScrapbook(): Scrapbook {
  return {
    id: uid("book"),
    title: "Keepsake",
    subtitle: "small days",
    updatedAt: Date.now(),
    pages: [
      // Spread 1 — left: title page
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
      // Spread 1 — right: first memories
      {
        id: uid("page"),
        elements: [
          {
            id: uid("el"),
            type: "photo",
            src: "/samples/coffee.jpg",
            x: 34,
            y: 31,
            w: 46,
            rotation: -5,
            z: 1,
            frame: "polaroid",
          },
          {
            id: uid("el"),
            type: "photo",
            src: "/samples/flowers.jpg",
            x: 64,
            y: 42,
            w: 46,
            rotation: 6,
            z: 2,
            frame: "polaroid",
          },
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
      // Spread 2 — left
      {
        id: uid("page"),
        elements: [
          {
            id: uid("el"),
            type: "photo",
            src: "/samples/bread.jpg",
            x: 50,
            y: 40,
            w: 64,
            rotation: 3,
            z: 1,
            frame: "polaroid",
          },
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
      // Spread 2 — right
      {
        id: uid("page"),
        elements: [
          {
            id: uid("el"),
            type: "photo",
            src: "/samples/coast.jpg",
            x: 52,
            y: 36,
            w: 68,
            rotation: -4,
            z: 1,
            frame: "tape",
          },
          {
            id: uid("el"),
            type: "photo",
            src: "/samples/letters.jpg",
            x: 32,
            y: 68,
            w: 40,
            rotation: 7,
            z: 2,
            frame: "polaroid",
          },
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
}

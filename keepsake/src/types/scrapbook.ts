/*
 * Keepsake book model.
 * Shapes follow the Design Bible v3 "First Production-Ready Data Shapes":
 * Scrapbook -> Page -> PageElement (photo | caption | sticker).
 * Positions are percentages of the page so a layout is preserved across
 * screen sizes (a stated Bible requirement).
 */

export type PhotoFrame = "polaroid" | "tape" | "flush";

export type ElementType = "photo" | "caption" | "sticker";

export type Visibility = "private" | "friends" | "public";

interface BaseElement {
  id: string;
  /** center X as a percentage (0-100) of the page width */
  x: number;
  /** center Y as a percentage (0-100) of the page height */
  y: number;
  /** width as a percentage (0-100) of the page width */
  w: number;
  /** rotation in degrees */
  rotation: number;
  /** stacking order within the page */
  z: number;
}

export interface PhotoElement extends BaseElement {
  type: "photo";
  /** image data URL or asset path (denormalised for simple rendering) */
  src: string;
  /** reference to an archive photo (so pages reference, not duplicate) */
  photoId?: string;
  frame: PhotoFrame;
}

export interface CaptionElement extends BaseElement {
  type: "caption";
  text: string;
  /** font size in container-query width units (cqw) so it scales with the page */
  fontSize: number;
  color: string;
}

export interface StickerElement extends BaseElement {
  type: "sticker";
  /** emoji glyph or SVG sticker id */
  glyph: string;
}

export type PageElement = PhotoElement | CaptionElement | StickerElement;

export interface Page {
  id: string;
  titlePage?: boolean;
  backgroundStyle?: string;
  elements: PageElement[];
}

export interface Scrapbook {
  id: string;
  title: string;
  subtitle: string;
  coverStyle: CoverStyle;
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
  pages: Page[];
  /** optional Spotify playlist link/URI associated with this book (Bible §13) */
  playlistUri?: string;
}

export type CoverStyle = "cocoa" | "forest" | "wine" | "midnight" | "ochre";

export const COVER_STYLES: Record<CoverStyle, { label: string; leather: string; ink: string }> = {
  cocoa: { label: "Cocoa", leather: "#4a3224", ink: "#f3e9d8" },
  forest: { label: "Forest", leather: "#2f4a3c", ink: "#eef0e6" },
  wine: { label: "Wine", leather: "#5b2733", ink: "#f4e6df" },
  midnight: { label: "Midnight", leather: "#20293f", ink: "#e6ebf4" },
  ochre: { label: "Ochre", leather: "#7a5320", ink: "#fbf1dc" },
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const MAX_PHOTOS_PER_PAGE = 6;

export const SHARPIE_COLORS = [
  "#2c2418", // ink
  "#9b2e2e", // red
  "#1e3a5f", // navy
  "#2f4a3c", // forest
  "#b55245", // terracotta
] as const;

export const STICKER_GLYPHS = [
  "★", "✿", "❤", "☀", "☁", "☾", "✈", "☕", "🎞", "📷",
  "🍂", "🌊", "⛰", "🎈", "🕯", "🔑", "✉", "🎵", "🌻", "🐚",
] as const;

/*
 * Keepsake data model.
 * Shapes follow the Design Bible v3 "First Production-Ready Data Shapes":
 * Scrapbook -> Page -> PageElement (photo | caption | ...).
 * Positions are stored as percentages of the page so a layout is preserved
 * across screen sizes (a stated Bible requirement).
 */

export type PhotoFrame = "polaroid" | "tape" | "flush";

export type ElementType = "photo" | "caption";

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
  /** image data URL (prototype persists images locally) */
  src: string;
  frame: PhotoFrame;
}

export interface CaptionElement extends BaseElement {
  type: "caption";
  text: string;
  /** font size in container-query width units (cqw) so it scales with the page */
  fontSize: number;
  color: string;
}

export type PageElement = PhotoElement | CaptionElement;

export interface Page {
  id: string;
  /** optional title page marker text (rendered centered) */
  titlePage?: boolean;
  elements: PageElement[];
}

export interface Scrapbook {
  id: string;
  title: string;
  subtitle: string;
  pages: Page[];
  updatedAt: number;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const MAX_PHOTOS_PER_PAGE = 6;

export const SHARPIE_COLORS = [
  "#2c2418", // ink
  "#9b2e2e", // red
  "#1e3a5f", // navy
  "#2f4a3c", // forest
  "#b55245", // terracotta
] as const;

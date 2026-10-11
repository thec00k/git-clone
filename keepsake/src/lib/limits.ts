import type {Scrapbook} from '../types/scrapbook';
/**
 * Owner decisions on sizes (October 2026). The server enforces the same numbers
 * (supabase/migrations/*_social_and_safety.sql and functions/_shared/moderation.ts); keep them in step.
 */
export const LIMITS = {
  photosPerPage: 4,
  pagesPerBook: 10, // content pages; the title page does not count
  photosPerBook: 40,
  minPhotosToShare: 5, // a book needs this many photos before it can be shared with friends
  books: 12,
  pins: 100,
  archivePhotos: 500,
  uploadBytes: 25 * 1024 * 1024,
  maxImageEdge: 2048,
} as const;

export const contentPages = (book: Scrapbook) => book.pages.filter(p => !p.titlePage).length;
export const bookPhotoCount = (book: Scrapbook) =>
  book.pages.reduce((n, p) => n + p.elements.filter(e => e.type === 'photo').length, 0);
export const canAddPage = (book: Scrapbook) => contentPages(book) < LIMITS.pagesPerBook;
export const canShareBook = (book: Scrapbook) => bookPhotoCount(book) >= LIMITS.minPhotosToShare;

/** Throws a friendly message when an import would take the archive past its limit. */
export function checkArchiveRoom(current: number, adding: number) {
  if (current + adding > LIMITS.archivePhotos)
    throw new Error(
      `Your archive holds up to ${LIMITS.archivePhotos} photos. You have room for ${Math.max(0, LIMITS.archivePhotos - current)} more.`,
    );
}
/** Keeps a batch insert inside the page and photo limits; returns how many photos fit. */
export function photosThatFit(book: Scrapbook, adding: number) {
  const byPhotos = LIMITS.photosPerBook - bookPhotoCount(book);
  const byPages = (LIMITS.pagesPerBook - contentPages(book) + 1) * LIMITS.photosPerPage; // +1: the target page may be reused
  return Math.max(0, Math.min(adding, byPhotos, byPages));
}

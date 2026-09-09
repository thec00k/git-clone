import type { Page, PhotoElement } from '../types/scrapbook';

/** Deliberate comparison, never automatic rearrangement of an existing story. */
export function thenNowPage(page: Page): Page | null {
  const photos = page.elements.filter((e): e is PhotoElement => e.type === 'photo');
  if (page.titlePage || photos.length !== 2) return null;
  const labelIds = photos.map(photo => `then-now:${photo.id}`);
  if (page.elements.some(e => e.type !== 'photo' && !labelIds.includes(e.id))) return null;
  return { ...page, elements: [
    ...photos.map((photo, i) => ({ ...photo, x: i ? 72 : 28, y: 43, w: 38, rotation: 0, cropAspect: 1 })),
    ...photos.map((photo, i) => {
      const existing = page.elements.find(e => e.id === labelIds[i] && e.type === 'caption');
      return { id: `then-now:${photo.id}`, type: 'caption' as const, x: i ? 72 : 28, y: 68, w: 38,
        rotation: 0, z: Math.max(...photos.map(p => p.z)) + 1, fontSize: 3.6, color: '#2c2418',
        text: existing?.type === 'caption' ? existing.text : i ? 'Now' : 'Then' };
    }),
  ] };
}

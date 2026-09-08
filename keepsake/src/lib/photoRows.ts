import type { Page, PhotoElement } from "../types/scrapbook";
import type { ArchivePhoto } from "../types/app";
export type Rect = { x: number; y: number; w: number; h: number };
export function fitPhotoRows(ratios: number[], obstacles: Rect[] = []): Rect[] | null {
  if (!ratios.length) return [];
  // Two columns, two generous rows for four photos or three rows for six.
  const rows = Math.ceil(ratios.length / 2);
  for (let w = ratios.length <= 4 ? 40 : 34; w >= 12; w -= 1) {
    const heights = Array.from({ length: rows }, (_, row) => Math.max(...ratios.slice(row * 2, row * 2 + 2)) * w);
    const total = heights.reduce((a, b) => a + b, 0) + (rows - 1) * 5;
    for (let top = 6; top + total <= 94; top += 2) {
      let y = top;
      const placed: Rect[] = [];
      heights.forEach((h, row) => {
        ratios.slice(row * 2, row * 2 + 2).forEach((ratio, col) => placed.push({
          x: ratios.length === 1 ? 50 : col === 0 ? 50 - (w + 5) / 2 : 50 + (w + 5) / 2,
          y: y + h / 2, w, h: ratio * w,
        }));
        y += h + 5;
      });
      if (placed.every(p => obstacles.every(o => Math.abs(p.x - o.x) >= (p.w + o.w) / 2 + 2 || Math.abs(p.y - o.y) >= (p.h + o.h) / 2 + 2))) return placed;
    }
  }
  return null;
}
export function photoRows(page: Page, archive: ArchivePhoto[]): Page | null {
  const photos = page.elements.filter((e): e is PhotoElement => e.type === "photo");
  const ratios = photos.map(p => {
    const aspect = p.cropAspect ?? archive.find(a => a.id === p.photoId || a.src === p.src)?.aspect ?? 1;
    // Page aspect is 3:4; allow for frame padding, including its deeper lower border.
    return .75 / Math.max(.1, aspect) + (p.frame === "polaroid" ? .22 : .06);
  });
  const obstacles: Rect[] = page.elements.filter(e => e.type !== "photo").map(e => ({
    x: e.x, y: e.y, w: e.w + 4,
    h: e.type === "caption" ? Math.max(10, Math.ceil(e.text.length * e.fontSize * .5 / e.w) * e.fontSize * .84) + 4 : e.type === "stroke" ? Math.max(4, ...e.points.map(p=>p.y)) - Math.min(...e.points.map(p=>p.y)) + 4 : e.w * .75 + 4,
  }));
  if (page.titlePage) obstacles.push({x:50,y:50,w:86,h:42});
  const positions = fitPhotoRows(ratios, obstacles);
  if (!positions) return null;
  let i=0;
  return {...page, elements:page.elements.map(e => e.type === "photo" ? {...e,...positions[i++],rotation:0} : e)};
}

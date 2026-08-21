import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clamp } from "../lib/clamp";

export interface ElementTransform {
  x: number;
  y: number;
  w: number;
  rotation: number;
}

/**
 * Pointer/touch gesture for a page element:
 *  - one pointer  -> drag to move (percent of the page)
 *  - two pointers -> pinch to resize + twist to rotate (and pan by the midpoint)
 * Works for mouse, pen, and multi-touch. Positions/size are percentages so
 * layouts stay consistent across screen sizes.
 */
export function useElementGesture(
  get: () => ElementTransform,
  onChange: (patch: Partial<ElementTransform>) => void,
) {
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const start = useRef<{
    rect: DOMRect;
    base: ElementTransform;
    px: number;
    py: number;
    dist: number;
    angle: number;
    mx: number;
    my: number;
  } | null>(null);

  function pageRect(node: HTMLElement): DOMRect | null {
    const page = node.closest(".ks-page") as HTMLElement | null;
    return page ? page.getBoundingClientRect() : null;
  }

  function begin(node: HTMLElement) {
    const rect = pageRect(node);
    if (!rect) return;
    const pts = [...pointers.current.values()];
    const base = get();
    if (pts.length === 1) {
      start.current = { rect, base, px: pts[0].x, py: pts[0].y, dist: 0, angle: 0, mx: 0, my: 0 };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      start.current = {
        rect,
        base,
        px: 0,
        py: 0,
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    begin(e.currentTarget as HTMLElement);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = start.current;
    if (!s) return;
    const pts = [...pointers.current.values()];

    if (pts.length === 1) {
      const dx = ((pts[0].x - s.px) / s.rect.width) * 100;
      const dy = ((pts[0].y - s.py) / s.rect.height) * 100;
      onChange({ x: clamp(s.base.x + dx, 2, 98), y: clamp(s.base.y + dy, 2, 98) });
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const scale = s.dist > 0 ? dist / s.dist : 1;
      const dmx = ((mx - s.mx) / s.rect.width) * 100;
      const dmy = ((my - s.my) / s.rect.height) * 100;
      onChange({
        w: clamp(s.base.w * scale, 6, 96),
        rotation: s.base.rotation + (angle - s.angle),
        x: clamp(s.base.x + dmx, 2, 98),
        y: clamp(s.base.y + dmy, 2, 98),
      });
    }
  };

  const end = (e: ReactPointerEvent<HTMLElement>) => {
    const node = e.currentTarget as HTMLElement;
    if (node.hasPointerCapture?.(e.pointerId)) node.releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    // Re-baseline so a lingering finger continues smoothly after one lifts.
    if (pointers.current.size > 0) begin(node);
    else start.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end };
}

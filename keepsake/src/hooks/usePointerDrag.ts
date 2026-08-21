import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clamp } from "../lib/clamp";

/**
 * Pointer-based dragging for an absolutely-positioned page element.
 * Movement is converted to a percentage of the page so layouts stay
 * consistent across screen sizes. Works for mouse, touch, and pen.
 */
export function usePointerDrag(
  getPos: () => { x: number; y: number },
  onMove: (x: number, y: number) => void,
) {
  const drag = useRef<{
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    rect: DOMRect;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    const page = (e.currentTarget as HTMLElement).closest(".ks-page") as HTMLElement | null;
    if (!page) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getPos();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: pos.x,
      oy: pos.y,
      rect: page.getBoundingClientRect(),
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = drag.current;
    if (!s) return;
    const dx = ((e.clientX - s.startX) / s.rect.width) * 100;
    const dy = ((e.clientY - s.startY) / s.rect.height) * 100;
    onMove(clamp(s.ox + dx, 2, 98), clamp(s.oy + dy, 2, 98));
  };

  const endDrag = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const node = e.currentTarget as HTMLElement;
    if (node.hasPointerCapture?.(e.pointerId)) node.releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag };
}

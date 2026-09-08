import {InkGlints} from './InkGlints';
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Page, PageElement, StrokeElement } from "../types/scrapbook";
import { ElementView } from "./ElementView";

interface Props {
  page: Page | null;
  active: boolean;
  bookTitle: string;
  bookSubtitle: string;
  selectedId: string | null;
  onActivate: (pageId: string) => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onTransform: (id: string, patch: Partial<PageElement>) => void;
  onEditText: (id: string, text: string) => void;
  drawColor?: string | null;
  drawWidth?: number;
  onDrawStroke?: (pageId: string, color: string, points: { x: number; y: number }[]) => void;
}

export function ScrapbookPage({
  page,
  active,
  bookTitle,
  bookSubtitle,
  selectedId,
  onActivate,
  onSelect,
  onDeselect,
  onMove,
  onTransform,
  onEditText,
  drawColor = null,
  drawWidth = 1.7,
  onDrawStroke,
}: Props) {
  if (!page) {
    // Empty right-hand leaf (odd page count) — a blank paper edge.
    return <div className="ks-page opacity-70" aria-hidden="true" />;
  }

  const ink = page.elements.filter((e): e is StrokeElement => e.type === "stroke");
  const sorted = [...page.elements].filter((e) => e.type !== "stroke").sort((a, b) => a.z - b.z);

  // Selecting an element also makes its page the active one, so "Add photo",
  // "Add caption", and "Arrange" all target the page the user is working on.
  const handleSelect = (id: string) => {
    onActivate(page.id);
    onSelect(id);
  };

  return (
    <div
      className="ks-page"
      data-active={active}
      onPointerDown={() => {
        onActivate(page.id);
        onDeselect();
      }}
    >
      {page.titlePage && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center">
          <p className="ks-caption text-ink-soft" style={{ fontSize: "5cqw" }}>
            a book of
          </p>
          <h2
            className="text-ink"
            style={{ fontFamily: "var(--font-display)", fontSize: "13cqw", fontWeight: 600, margin: "1cqw 0" }}
          >
            {bookTitle}
          </h2>
          <p className="ks-caption text-ink-soft" style={{ fontSize: "7cqw" }}>
            {bookSubtitle}
          </p>
          <span
            className="mt-[6cqw] inline-block"
            style={{ width: "22cqw", height: "2px", background: "var(--color-accent)", opacity: 0.6 }}
          />
        </div>
      )}

      {sorted.map((el) => (
        <ElementView
          key={el.id}
          element={el}
          selected={selectedId === el.id}
          onSelect={handleSelect}
          onMove={onMove}
          onTransform={onTransform}
          onEditText={onEditText}
        />
      ))}

      <PageInk strokes={ink} />
      {drawColor && onDrawStroke && (
        <DrawLayer
          color={drawColor}
          width={drawWidth}
          onActivate={() => onActivate(page.id)}
          onStroke={(points) => onDrawStroke(page.id, drawColor, points)}
        />
      )}

      {!page.titlePage && page.elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="ks-caption text-ink-soft/70" style={{ fontSize: "6cqw" }}>
            add a photograph…
          </p>
        </div>
      )}
    </div>
  );
}

export function PageInk({ strokes }: { strokes: StrokeElement[] }) {
  if (!strokes.length) return null;
  return (
    <svg className="ks-page-ink" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {strokes.map((s) => (
        <g key={s.id}><polyline
          key={s.id}
          points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        /><InkGlints color={s.color} points={s.points}/></g>
      ))}
    </svg>
  );
}

function DrawLayer({
  color,
  width,
  onActivate,
  onStroke,
}: {
  color: string;
  width: number;
  onActivate: () => void;
  onStroke: (points: { x: number; y: number }[]) => void;
}) {
  const pts = useRef<{ x: number; y: number }[]>([]);
  const [live, setLive] = useState<{ x: number; y: number }[]>([]);

  const point = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  return (
    <div
      className="ks-draw-layer"
      data-drawing
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        onActivate();
        pts.current = [point(e)];
        setLive(pts.current);
      }}
      onPointerMove={(e) => {
        if (!pts.current.length) return;
        pts.current = [...pts.current, point(e)];
        setLive(pts.current);
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        onStroke(pts.current);
        pts.current = [];
        setLive([]);
      }}
      onPointerCancel={() => {
        pts.current = [];
        setLive([]);
      }}
    >
      {live.length > 1 && (
        <svg className="ks-page-ink" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={live.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
          /><InkGlints color={color} points={live}/>
        </svg>
      )}
    </div>
  );
}

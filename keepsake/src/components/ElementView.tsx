import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { RotateCw } from "lucide-react";
import type { CaptionElement, PageElement, PhotoElement } from "../types/scrapbook";
import { clamp } from "../lib/clamp";
import {pagePixelPoint} from '../lib/pageCoordinates';
import { usePointerDrag } from "../hooks/usePointerDrag";
import { useElementGesture } from "../hooks/useElementGesture";

interface Props {
  element: PageElement;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onTransform: (id: string, patch: Partial<PageElement>) => void;
  onEditText: (id: string, text: string) => void;
}

/** Keep pointer previews local; persist one transform per completed gesture. */
export function ElementView(props: Props) {
  const [preview, setPreview] = useState<Partial<PageElement> | null>(null);
  const pending = useRef<Partial<PageElement> | null>(null);
  const pointers = useRef(new Set<number>());
  const transform = (_id: string, patch: Partial<PageElement>) => {
    pending.current = {...pending.current, ...patch};
    setPreview(pending.current);
  };
  const finish = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) return;
    if (pending.current) props.onTransform(props.element.id, pending.current);
    pending.current = null;
    setPreview(null);
  };
  return <div style={{display: 'contents'}}
    onPointerDownCapture={e => { if (!(e.target as HTMLElement).closest("textarea")) pointers.current.add(e.pointerId); }}
    onPointerUpCapture={finish} onPointerCancelCapture={finish}>
    <ElementContent {...props} element={{...props.element, ...preview} as PageElement}
      onTransform={transform} onMove={(id, x, y) => transform(id, {x, y})}/>
  </div>;
}

function ElementContent({ element, selected, onSelect, onMove, onTransform, onEditText }: Props) {
  const positionStyle: CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.w}cqw`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    zIndex: element.z,
    touchAction: "none",
    outline: selected ? "2px dashed var(--color-accent)" : "none",
    outlineOffset: "6px",
  };

  if (element.type === "stroke") return null;

  // Photos and stickers get full drag + pinch-to-resize + twist-to-rotate,
  // plus rotate and corner-resize handles when selected.
  if (element.type === "photo" || element.type === "sticker") {
    return (
      <TransformableElement
        element={element}
        selected={selected}
        positionStyle={positionStyle}
        onSelect={onSelect}
        onTransform={onTransform}
      />
    );
  }

  return (
    <CaptionView
      element={element}
      style={positionStyle}
      selected={selected}
      onSelect={onSelect}
      onMove={onMove}
      onTransform={onTransform}
      onEditText={onEditText}
    />
  );
}

function TransformableElement({
  element,
  selected,
  positionStyle,
  onSelect,
  onTransform,
}: {
  element: PhotoElement | Extract<PageElement, { type: "sticker" }>;
  selected: boolean;
  positionStyle: CSSProperties;
  onSelect: (id: string) => void;
  onTransform: (id: string, patch: Partial<PageElement>) => void;
}) {
  const gesture = useElementGesture(
    () => ({ x: element.x, y: element.y, w: element.w, rotation: element.rotation }),
    (patch) => onTransform(element.id, patch),
  );

  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    e.stopPropagation();
    onSelect(element.id);
    gesture.onPointerDown(e);
  };

  return (
    <div
      className="ks-el"
      style={positionStyle}
      onPointerDown={onDown}
      onPointerMove={gesture.onPointerMove}
      onPointerUp={gesture.onPointerUp}
      onPointerCancel={gesture.onPointerCancel}
      role="button"
      tabIndex={0}
      aria-label={element.type === "photo" ? "Photograph" : "Sticker"}
    >
      {element.type === "photo" ? (
        <PhotoInner element={element} />
      ) : (
        <div
          style={{
            fontSize: `${element.w}cqw`,
            lineHeight: 1,
            textAlign: "center",
            userSelect: "none",
            filter: "drop-shadow(0 4px 6px rgb(20 14 10 / 0.35))",
          }}
        >
          <KeepsakeGlyph glyph={element.glyph}/>
        </div>
      )}

      {selected && (
        <>
          <RotateHandle onRotate={(deg) => onTransform(element.id, { rotation: deg })} />
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <ResizeHandle
              key={corner}
              corner={corner}
              size={element.w}
              onResize={(w) => onTransform(element.id, { w })}
            />
          ))}
        </>
      )}
    </div>
  );
}

function RotateHandle({ onRotate }: { onRotate: (deg: number) => void }) {
  const active = useRef(false);
  const center = useRef({ x: 0, y: 0 });

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).closest(".ks-el") as HTMLElement | null;
    if (!el) return;
    center.current = {x:el.offsetLeft,y:el.offsetTop};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    active.current = true;
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!active.current) return;
    const p=pagePixelPoint(e.currentTarget,e.clientX,e.clientY);
    const dx = p.x - center.current.x;
    const dy = p.y - center.current.y;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (e.shiftKey) deg = Math.round(deg / 15) * 15;
    onRotate(deg);
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    active.current = false;
    const n = e.currentTarget as HTMLElement;
    if (n.hasPointerCapture?.(e.pointerId)) n.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      data-no-drag
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      title="Drag to rotate (hold Shift to snap to 15°)"
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        transform: "translate(-50%, -100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        touchAction: "none",
        cursor: "grab",
        zIndex: 5,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 22,
          width: 22,
          borderRadius: 999,
          background: "var(--color-accent)",
          color: "var(--color-accent-fg)",
          boxShadow: "0 2px 6px rgb(0 0 0 / 0.4)",
        }}
      >
        <RotateCw size={13} />
      </span>
      <span style={{ width: 2, height: 16, background: "var(--color-accent)" }} />
    </div>
  );
}

function ResizeHandle({
  corner,
  size,
  onResize,
}: {
  corner: "nw" | "ne" | "sw" | "se";
  size: number;
  onResize: (w: number) => void;
}) {
  const active = useRef(false);
  const start = useRef({ x: 0, y: 0, dist: 1, w: size });

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).closest(".ks-el") as HTMLElement | null;
    if (!el) return;
    const cx = el.offsetLeft;
    const cy = el.offsetTop;
    const p=pagePixelPoint(el,e.clientX,e.clientY);
    start.current = {
      x: cx,
      y: cy,
      dist: Math.max(8, Math.hypot(p.x - cx, p.y - cy)),
      w: size,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = true;
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!active.current) return;
    e.preventDefault();
    e.stopPropagation();
    const p=pagePixelPoint(e.currentTarget,e.clientX,e.clientY);
    const dist = Math.hypot(p.x - start.current.x, p.y - start.current.y);
    onResize(clamp((start.current.w * dist) / start.current.dist, 8, 92));
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    active.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      data-no-drag
      data-resize={corner}
      className={`ks-el-resize ks-el-resize--${corner}`}
      role="slider"
      aria-label={`Resize from the ${corner} corner`}
      aria-valuemin={8}
      aria-valuemax={92}
      aria-valuenow={Math.round(size)}
      title="Drag to resize"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    />
  );
}

function PhotoInner({ element }: { element: PhotoElement }) {
  const frameClass =
    element.frame === "polaroid"
      ? "ks-polaroid"
      : element.frame === "tape"
        ? "ks-tape"
        : "ks-flush";
  return (
    <div className={`relative ${frameClass}`} style={{ borderRadius: 2 }}>
      <img
        src={element.src}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          aspectRatio: element.cropAspect,
          objectFit: element.cropAspect ? "cover" : undefined,
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function CaptionView({
  element,
  style,
  selected,
  onSelect,
  onMove,
  onTransform,
  onEditText,
}: {
  element: CaptionElement;
  style: CSSProperties;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onTransform: (id: string, patch: Partial<PageElement>) => void;
  onEditText: (id: string, text: string) => void;
}) {
  const drag = usePointerDrag(
    () => ({ x: element.x, y: element.y }),
    (x, y) => onMove(element.id, x, y),
  );
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!selected) setEditing(false);
  }, [selected]);

  const captionStyle: CSSProperties = {
    fontFamily: "var(--font-script)",
    fontSize: `${element.fontSize}cqw`,
    color: element.color,
    lineHeight: 1.12,
    textAlign: "center",
    width: "100%",
  };

  const handleSelect = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("textarea")) return;
    e.preventDefault();
    e.stopPropagation();
    setEditing(false);
    onSelect(element.id);
    drag.onPointerDown(e);
  };

  return (
    <div
      className="ks-el"
      style={{...style, padding: 8, userSelect: "none", cursor: "move"}}
      onPointerDown={handleSelect}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onDoubleClick={e => { if (!(e.target as HTMLElement).closest("[data-no-drag]")) setEditing(true); }}
      onKeyDown={e => { if (e.target === e.currentTarget && e.key === "Enter") { onSelect(element.id); setEditing(true); } }}
      role="button"
      tabIndex={0}
      aria-label={`Caption: ${element.text}`}
    >
      {selected && <>
        <RotateHandle onRotate={rotation => onTransform(element.id, {rotation})}/>
        {(["nw", "ne", "sw", "se"] as const).map(corner => <ResizeHandle key={corner} corner={corner} size={element.w} onResize={w => onTransform(element.id, {w})}/>)}
      </>}
      {editing ? (
        <textarea
          ref={textareaRef}
          onPointerDown={e => e.stopPropagation()}
          data-no-drag
          value={element.text}
          maxLength={140}
          onChange={(e) => onEditText(element.id, e.target.value)}
          onBlur={() => setEditing(false)}
          rows={2}
          style={{
            ...captionStyle,
            userSelect: "text",
            cursor: "text",
            background: "rgba(255,255,255,0.5)",
            border: "1px solid var(--color-accent)",
            borderRadius: 6,
            resize: "none",
            outline: "none",
            padding: "2px 6px",
          }}
        />
      ) : (
        <div className="ks-caption" style={captionStyle}>
          {element.text || "…"}
        </div>
      )}
    </div>
  );
}
import {KeepsakeGlyph} from './KeepsakeGlyph';

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { RotateCw } from "lucide-react";
import type { CaptionElement, PageElement, PhotoElement } from "../types/scrapbook";
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

export function ElementView({ element, selected, onSelect, onMove, onTransform, onEditText }: Props) {
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

  // Photos and stickers get full drag + pinch-to-resize + twist-to-rotate,
  // plus a drag-to-rotate handle when selected.
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
          {element.glyph}
        </div>
      )}

      {selected && (
        <RotateHandle onRotate={(deg) => onTransform(element.id, { rotation: deg })} />
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
    const r = el.getBoundingClientRect();
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    active.current = true;
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!active.current) return;
    const dx = e.clientX - center.current.x;
    const dy = e.clientY - center.current.y;
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
  onEditText,
}: {
  element: CaptionElement;
  style: CSSProperties;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
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
    e.stopPropagation();
    onSelect(element.id);
    drag.onPointerDown(e);
  };

  return (
    <div
      style={style}
      onPointerDown={editing ? undefined : handleSelect}
      onPointerMove={editing ? undefined : drag.onPointerMove}
      onPointerUp={editing ? undefined : drag.onPointerUp}
      onPointerCancel={editing ? undefined : drag.onPointerCancel}
      onDoubleClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      aria-label={`Caption: ${element.text}`}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          data-no-drag
          value={element.text}
          maxLength={140}
          onChange={(e) => onEditText(element.id, e.target.value)}
          onBlur={() => setEditing(false)}
          rows={2}
          style={{
            ...captionStyle,
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

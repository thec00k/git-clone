import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CaptionElement, PageElement, PhotoElement } from "../types/scrapbook";
import { usePointerDrag } from "../hooks/usePointerDrag";

interface Props {
  element: PageElement;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onEditText: (id: string, text: string) => void;
}

export function ElementView({ element, selected, onSelect, onMove, onEditText }: Props) {
  const drag = usePointerDrag(
    () => ({ x: element.x, y: element.y }),
    (x, y) => onMove(element.id, x, y),
  );

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

  const handleSelect = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    onSelect(element.id);
    drag.onPointerDown(e);
  };

  if (element.type === "photo") {
    return (
      <div
        style={positionStyle}
        onPointerDown={handleSelect}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
        role="button"
        tabIndex={0}
        aria-label="Photograph"
      >
        <PhotoInner element={element} />
      </div>
    );
  }

  return (
    <CaptionView
      element={element}
      style={positionStyle}
      selected={selected}
      onSelect={handleSelect}
      drag={drag}
      onEditText={onEditText}
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
  drag,
  onEditText,
}: {
  element: CaptionElement;
  style: CSSProperties;
  selected: boolean;
  onSelect: (e: React.PointerEvent<HTMLElement>) => void;
  drag: ReturnType<typeof usePointerDrag>;
  onEditText: (id: string, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.select();
    }
  }, [editing]);

  // Enter edit mode automatically when a fresh, placeholder caption is selected.
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

  return (
    <div
      style={style}
      onPointerDown={editing ? undefined : onSelect}
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

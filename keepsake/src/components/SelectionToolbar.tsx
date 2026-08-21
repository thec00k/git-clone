import { useRef } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Frame,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import type { ElementLocation } from "../hooks/useScrapbook";
import { SHARPIE_COLORS } from "../types/scrapbook";

interface Props {
  selected: ElementLocation;
  onRotate: (id: string, deg: number) => void;
  onScale: (id: string, factor: number) => void;
  onReset: (id: string) => void;
  onForward: (id: string) => void;
  onBackward: (id: string) => void;
  onCycleFrame: (id: string) => void;
  onColor: (id: string, color: string) => void;
  onReplace: (id: string, file: File) => void;
  onDelete: (id: string) => void;
}

export function SelectionToolbar({
  selected,
  onRotate,
  onScale,
  onReset,
  onForward,
  onBackward,
  onCycleFrame,
  onColor,
  onReplace,
  onDelete,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { element } = selected;
  const id = element.id;
  const isPhoto = element.type === "photo";

  return (
    <div
      data-no-drag
      className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-[rgb(28_22_16/0.92)] px-2 py-1.5 shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button className="ks-chip" title="Rotate left" onClick={() => onRotate(id, -5)}>
        <RotateCcw size={16} />
      </button>
      <button className="ks-chip" title="Rotate right" onClick={() => onRotate(id, 5)}>
        <RotateCw size={16} />
      </button>
      <button
        className="ks-chip"
        title={isPhoto ? "Smaller" : "Smaller text"}
        onClick={() => onScale(id, 1 / 1.12)}
      >
        <Minus size={16} />
      </button>
      <button
        className="ks-chip"
        title={isPhoto ? "Bigger" : "Bigger text"}
        onClick={() => onScale(id, 1.12)}
      >
        <Plus size={16} />
      </button>
      <button className="ks-chip" title="Straighten" onClick={() => onReset(id)}>
        <RefreshCw size={16} />
      </button>

      <span className="mx-0.5 h-6 w-px bg-paper/15" />

      <button className="ks-chip" title="Bring forward" onClick={() => onForward(id)}>
        <ArrowUpToLine size={16} />
      </button>
      <button className="ks-chip" title="Send backward" onClick={() => onBackward(id)}>
        <ArrowDownToLine size={16} />
      </button>

      {isPhoto ? (
        <>
          <button className="ks-chip" title="Change frame" onClick={() => onCycleFrame(id)}>
            <Frame size={16} />
          </button>
          <button
            className="ks-chip"
            title="Replace photo"
            onClick={() => fileRef.current?.click()}
          >
            <RefreshCw size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(id, file);
              e.target.value = "";
            }}
          />
        </>
      ) : (
        <span className="mx-0.5 flex items-center gap-1">
          {SHARPIE_COLORS.map((c) => (
            <button
              key={c}
              title="Ink colour"
              onClick={() => onColor(id, c)}
              className="h-5 w-5 rounded-full border border-paper/25"
              style={{ background: c }}
            />
          ))}
        </span>
      )}

      <span className="mx-0.5 h-6 w-px bg-paper/15" />

      <button
        className="ks-chip hover:!bg-seal"
        title="Remove"
        onClick={() => onDelete(id)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

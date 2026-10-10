import { useRef } from "react";
import {StickerFinishControls} from './MaterialControls';
import type {StickerFinish} from '../lib/materials';
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
import { SHARPIE_COLORS, CAPTION_LOOKS, type CaptionLook } from "../types/scrapbook";

interface Props {
  selected: ElementLocation;
  onRotate: (id: string, deg: number) => void;
  onScale: (id: string, factor: number) => void;
  onReset: (id: string) => void;
  onForward: (id: string) => void;
  onBackward: (id: string) => void;
  onCycleFrame: (id: string) => void;
  onColor: (id: string, color: string) => void;
  onLook: (id: string, look: CaptionLook | undefined) => void;
  onReplace: (id: string, file: File) => void;
  onDelete: (id: string) => void;
  onFinish: (id:string,patch:{finish?:StickerFinish;finishStrength?:number})=>void;
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
  onLook,
  onReplace,
  onDelete,
  onFinish,
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
      <button className="ks-chip" aria-label="Rotate left" title="Rotate left" onClick={() => onRotate(id, -5)}>
        <RotateCcw size={16} />
      </button>
      <button className="ks-chip" aria-label="Rotate right" title="Rotate right" onClick={() => onRotate(id, 5)}>
        <RotateCw size={16} />
      </button>
      <button
        className="ks-chip"
        aria-label={element.type !== "caption" ? "Smaller" : "Narrower text box"}
        title={element.type !== "caption" ? "Smaller" : "Narrower text box"}
        onClick={() => onScale(id, 1 / 1.12)}
      >
        <Minus size={16} />
      </button>
      <button
        className="ks-chip"
        aria-label={element.type !== "caption" ? "Bigger" : "Wider text box"}
        title={element.type !== "caption" ? "Bigger" : "Wider text box"}
        onClick={() => onScale(id, 1.12)}
      >
        <Plus size={16} />
      </button>
      <button className="ks-chip" aria-label="Straighten" title="Straighten" onClick={() => onReset(id)}>
        <RefreshCw size={16} />
      </button>

      <span className="mx-0.5 h-6 w-px bg-paper/15" />

      {element.type==='sticker'&&<StickerFinishControls glyph={element.glyph} finish={element.finish} strength={element.finishStrength} onChange={patch=>onFinish(id,patch)}/>}

      <button className="ks-chip" aria-label="Bring forward" title="Bring forward" onClick={() => onForward(id)}>
        <ArrowUpToLine size={16} />
      </button>
      <button className="ks-chip" aria-label="Send backward" title="Send backward" onClick={() => onBackward(id)}>
        <ArrowDownToLine size={16} />
      </button>

      {isPhoto && (
        <>
          <button className="ks-chip" aria-label="Change frame" title="Change frame" onClick={() => onCycleFrame(id)}>
            <Frame size={16} />
          </button>
          <button
            className="ks-chip"
            aria-label="Replace photo"
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
            aria-label="Replace photograph"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(id, file);
              e.target.value = "";
            }}
          />
        </>
      )}
      {element.type === "caption" && (
        <span className="mx-0.5 flex items-center gap-1">
          {SHARPIE_COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Ink colour ${c}`}
              title="Ink colour"
              onClick={() => onColor(id, c)}
              className="h-5 w-5 rounded-full border border-paper/25"
              style={{ background: c }}
            />
          ))}
        </span>
      )}
      {element.type === "caption" && (
        <span className="mx-0.5 flex items-center gap-1" role="group" aria-label="Lettering style">
          <button className="ks-look-swatch" aria-pressed={!element.look} aria-label="Handwritten lettering" title="Handwritten" onClick={() => onLook(id, undefined)} style={{ fontFamily: "var(--font-script)", fontStyle: "normal", fontWeight: 600 }}>Aa</button>
          {CAPTION_LOOKS.map((l) => (
            <button key={l.id} className="ks-look-swatch" aria-pressed={element.look === l.id} aria-label={`${l.label} lettering`} title={l.label} onClick={() => onLook(id, l.id)}>
              <span className={`ks-look ks-look-${l.id}`}>{l.id === "ransom" ? "A\u200ba" : "Aa"}</span>
            </button>
          ))}
        </span>
      )}

      <span className="mx-0.5 h-6 w-px bg-paper/15" />

      <button
        className="ks-chip hover:!bg-seal"
        aria-label="Remove from the page"
        title="Remove"
        onClick={() => onDelete(id)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

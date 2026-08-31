import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { ImagePlus, Lock, MapPin, Pencil, Trash2, Unlock, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { loadImageFile } from "../../lib/image";
import { clamp } from "../../lib/clamp";
import { canLeavePinNote, VIEW_AS_LABEL } from "../../lib/permissions";
import { ViewShell } from "./ViewShell";
import type { MemoryPin, PinNote, ViewAs } from "../../types/app";
import { PIN_NOTE_MAX } from "../../types/app";

export function Atlas() {
  const { state, environment, setEnvironment, addPin, updatePin, removePin, addPinNote, updatePinNote, deletePinNote, recordProgress } =
    useApp();
  const { isVisitor, viewAs, setViewAs } = useNav();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [caption, setCaption] = useState("");
  const [photoSrc, setPhotoSrc] = useState<string | undefined>();
  const photoRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const locked = environment.pinsLocked || isVisitor;
  const editing = editingId ? state.pins.find((p) => p.id === editingId) : null;
  const peeking = peekId ? state.pins.find((p) => p.id === peekId) : null;
  const formOpen = !!(draft || editing);
  const canNote = canLeavePinNote(viewAs);
  const author = VIEW_AS_LABEL[viewAs];
  const peekNotes = peeking ? (state.pinNotes ?? []).filter((n) => n.pinId === peeking.id) : [];

  const beginNew = (x: number, y: number) => {
    if (isVisitor) return;
    setPeekId(null);
    setEditingId(null);
    setDraft({ x, y });
    setLabel("");
    setCaption("");
    setPhotoSrc(undefined);
  };

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVisitor || peeking || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    beginNew(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  const openEdit = (pin: MemoryPin) => {
    if (isVisitor) {
      if (pin.photoSrc) setPeekId(pin.id);
      return;
    }
    setPeekId(null);
    setDraft(null);
    setEditingId(pin.id);
    setLabel(pin.label);
    setCaption(pin.caption);
    setPhotoSrc(pin.photoSrc);
  };

  const openPeek = (pin: MemoryPin) => {
    if (!pin.photoSrc) {
      openEdit(pin);
      return;
    }
    setDraft(null);
    setEditingId(null);
    setPeekId(pin.id);
  };

  const commitNew = () => {
    if (!draft || !label.trim()) return;
    addPin({ x: draft.x, y: draft.y, label: label.trim(), caption: caption.trim(), photoSrc });
    setDraft(null);
    setPhotoSrc(undefined);
  };

  const commitEdit = () => {
    if (!editingId || !label.trim()) return;
    updatePin(editingId, { label: label.trim(), caption: caption.trim(), photoSrc });
    setEditingId(null);
    setPhotoSrc(undefined);
  };

  async function onPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const { src } = await loadImageFile(file);
      setPhotoSrc(src);
    } catch {
      /* ignore */
    }
  }

  const closeForm = () => {
    setDraft(null);
    setEditingId(null);
    setLabel("");
    setCaption("");
    setPhotoSrc(undefined);
  };

  useEffect(() => {
    if (!peeking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPeekId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peeking]);

  return (
    <ViewShell
      title="The map"
      subtitle="a corkboard of the world"
      fill
      scroll={false}
      actions={
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full bg-white/55 px-2 py-1 text-sm text-ink/80">
            <span className="hidden sm:inline text-paper/50">View as</span>
            <select
              name="viewAs"
              aria-label="View the room as"
              className="bg-transparent text-ink outline-none"
              value={viewAs}
              onChange={(e) => {
                const v = e.target.value as ViewAs;
                setViewAs(v);
                if (v !== "owner") recordProgress({ previewedAsVisitor: true });
              }}
            >
              {(["owner", "close", "friend", "public"] as ViewAs[]).map((v) => (
                <option key={v} value={v} className="text-ink">
                  {VIEW_AS_LABEL[v]}
                </option>
              ))}
            </select>
          </label>
          {!isVisitor && (
            <button
              type="button"
              className="ks-tool"
              aria-pressed={environment.pinsLocked}
              aria-label={environment.pinsLocked ? "Unlock pins so they can be moved" : "Lock pins so they cannot be moved"}
              onClick={() => setEnvironment({ pinsLocked: !environment.pinsLocked })}
            >
              {environment.pinsLocked ? <Lock size={15} /> : <Unlock size={15} />}
              {environment.pinsLocked ? "Pins locked" : "Pins unlocked"}
            </button>
          )}
        </div>
      }
    >
      <div className="ks-atlas">
        <div className="ks-atlas-board">
          <div className="ks-cork ks-atlas-cork">
            <div
              ref={mapRef}
              className="ks-cork-map ks-atlas-map"
              style={{ cursor: isVisitor || locked || peeking ? "default" : "crosshair" }}
              onClick={onMapClick}
              data-atlas-map
            >
              <img src="/maps/world.svg" alt="World map" className="ks-world-map pointer-events-none absolute inset-0 h-full w-full object-cover" />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: "url('/textures/grain.png')", opacity: 0.12 }}
              />
              {state.pins.map((p) => (
                <MapPinMarker
                  key={p.id}
                  pin={p}
                  locked={locked}
                  selected={editingId === p.id || peekId === p.id}
                  mapRef={mapRef}
                  onSelect={() => openEdit(p)}
                  onPeek={() => openPeek(p)}
                  onMove={(x, y) => updatePin(p.id, { x, y })}
                />
              ))}
              {draft && (
                <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}>
                  <MapPin size={26} className="text-paper drop-shadow" />
                </div>
              )}
              {peeking?.photoSrc && (
                <FridgePeek pin={peeking} notes={peekNotes} onClose={() => setPeekId(null)} />
              )}
            </div>
          </div>
        </div>

        <aside
          className="ks-atlas-editor"
          data-pin-editor={peeking ? "fridge" : editing ? "edit" : draft ? "new" : "idle"}
        >
          {peeking ? (
            <FridgeNotePanel
              pin={peeking}
              notes={peekNotes}
              author={author}
              canNote={canNote}
              isVisitor={isVisitor}
              onStick={(text) => addPinNote(peeking.id, author, text)}
              onSave={(id, text) => updatePinNote(id, text)}
              onRemove={deletePinNote}
              onEditPin={
                isVisitor
                  ? undefined
                  : () => {
                      openEdit(peeking);
                    }
              }
              onClose={() => setPeekId(null)}
            />
          ) : (
            <OwnerPinPanel
              isVisitor={isVisitor}
              locked={environment.pinsLocked}
              formOpen={formOpen}
              editing={!!editing}
              label={label}
              caption={caption}
              photoSrc={photoSrc}
              photoRef={photoRef}
              onLabel={setLabel}
              onCaption={setCaption}
              onPhoto={onPhoto}
              onClose={closeForm}
              onCommit={editing ? commitEdit : commitNew}
              onRemove={
                editing
                  ? () => {
                      removePin(editing.id);
                      closeForm();
                    }
                  : undefined
              }
            />
          )}
        </aside>
      </div>
    </ViewShell>
  );
}

function OwnerPinPanel({
  isVisitor,
  locked,
  formOpen,
  editing,
  label,
  caption,
  photoSrc,
  photoRef,
  onLabel,
  onCaption,
  onPhoto,
  onClose,
  onCommit,
  onRemove,
}: {
  isVisitor: boolean;
  locked: boolean;
  formOpen: boolean;
  editing: boolean;
  label: string;
  caption: string;
  photoSrc?: string;
  photoRef: RefObject<HTMLInputElement | null>;
  onLabel: (v: string) => void;
  onCaption: (v: string) => void;
  onPhoto: (files: FileList | null) => void;
  onClose: () => void;
  onCommit: () => void;
  onRemove?: () => void;
}) {
  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-paper">{editing ? "Edit this pin" : formOpen ? "Pin a memory" : "A place"}</p>
          <p className="mt-1 text-sm text-paper/55">
            {isVisitor
              ? "Click a photograph to hold it up, like a print on the fridge."
              : locked
                ? "Pins are locked. Click a pin to edit, or a photo to hold it up."
                : formOpen
                  ? "Name the place, write a caption, add a photo."
                  : "Click the map to drop a pin. Click a photo to hold it up."}
          </p>
        </div>
        {formOpen && !isVisitor && (
          <button className="ks-chip h-8 w-8 shrink-0" onClick={onClose} aria-label="Cancel">
            <X size={15} />
          </button>
        )}
      </div>

      {!isVisitor && (
        <>
          <label className="block text-sm text-paper/60" htmlFor="ks-pin-place">
            Place
            <input
              id="ks-pin-place"
              name="place"
              className="mt-1 block w-full rounded-lg bg-black/25 px-3 py-2 text-paper outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              placeholder="where…"
              value={label}
              onChange={(e) => onLabel(e.target.value)}
              disabled={!formOpen}
              autoFocus={formOpen}
            />
          </label>
          <label className="mt-3 block text-sm text-paper/60" htmlFor="ks-pin-note">
            Caption
            <textarea
              id="ks-pin-note"
              name="note"
              rows={4}
              className="mt-1 block w-full resize-none rounded-lg bg-black/25 px-3 py-2 text-paper outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              placeholder="a memory…"
              value={caption}
              onChange={(e) => onCaption(e.target.value)}
              disabled={!formOpen}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onCommit();
                }
              }}
            />
          </label>
          <div className="mt-3">
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              hidden
              aria-label="Photograph for this pin"
              onChange={(e) => {
                onPhoto(e.target.files);
                e.target.value = "";
              }}
            />
            <button type="button" className="ks-tool w-full justify-center" onClick={() => photoRef.current?.click()} disabled={!formOpen}>
              <ImagePlus size={15} />
              {photoSrc ? "Change photo" : "Add a photo"}
            </button>
            {photoSrc && <img src={photoSrc} alt="" className="mt-2 h-28 w-full rounded object-cover" />}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <button className="ks-tool ks-tool--accent w-full justify-center disabled:opacity-40" onClick={onCommit} disabled={!formOpen || !label.trim()}>
              {editing ? "Save" : "Pin it"}
            </button>
            {onRemove && (
              <button type="button" className="ks-tool w-full justify-center" onClick={onRemove}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

function FridgeNotePanel({
  pin,
  notes,
  author,
  canNote,
  isVisitor,
  onStick,
  onSave,
  onRemove,
  onEditPin,
  onClose,
}: {
  pin: MemoryPin;
  notes: PinNote[];
  author: string;
  canNote: boolean;
  isVisitor: boolean;
  onStick: (text: string) => void;
  onSave: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onEditPin?: () => void;
  onClose: () => void;
}) {
  const mine = notes.find((n) => n.author === author);
  const [draft, setDraft] = useState(mine?.message ?? "");

  useEffect(() => {
    setDraft(mine?.message ?? "");
  }, [mine?.id, mine?.message, pin.id]);

  const commit = () => {
    const text = draft.trim().slice(0, PIN_NOTE_MAX);
    if (!text) return;
    if (mine) onSave(mine.id, text);
    else onStick(text);
  };

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-paper">{pin.label}</p>
          <p className="mt-1 text-sm text-paper/55">
            {canNote ? "A short sticky, twenty characters or fewer — like a note on the fridge." : "A print on the fridge."}
          </p>
        </div>
        <button className="ks-chip h-8 w-8 shrink-0" onClick={onClose} aria-label="Close photograph">
          <X size={15} />
        </button>
      </div>
      {pin.caption && <p className="ks-caption mb-3 text-paper/70">{pin.caption}</p>}
      {canNote && (
        <label className="block text-sm text-paper/60" htmlFor="ks-fridge-note">
          {mine ? "Your sticky" : "Leave a sticky"}
          <input
            id="ks-fridge-note"
            name="fridge-note"
            className="mt-1 block w-full rounded-lg bg-black/25 px-3 py-2 text-paper outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            placeholder="missed this light"
            maxLength={PIN_NOTE_MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, PIN_NOTE_MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            autoFocus
          />
          <span className="mt-1 block text-xs text-paper/40">
            {draft.trim().length}/{PIN_NOTE_MAX}
          </span>
        </label>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {canNote && (
          <button type="button" data-stick-note className="ks-tool ks-tool--accent w-full justify-center disabled:opacity-40" onClick={commit} disabled={!draft.trim()}>
            {mine ? "Save sticky" : "Stick it"}
          </button>
        )}
        {mine && (
          <button type="button" className="ks-tool w-full justify-center" onClick={() => onRemove(mine.id)}>
            <Trash2 size={14} /> Take it down
          </button>
        )}
        {onEditPin && !isVisitor && (
          <button type="button" className="ks-tool w-full justify-center" onClick={onEditPin}>
            Edit this pin
          </button>
        )}
      </div>
    </>
  );
}

const STICKY_LOOKS = [
  { bg: "#f6e27a", rot: -4, side: "right" as const, top: "8%" },
  { bg: "#f4b4c4", rot: 3, side: "left" as const, top: "22%" },
  { bg: "#b8e0d2", rot: -3, side: "right" as const, top: "46%" },
  { bg: "#f3c27a", rot: 4, side: "left" as const, top: "58%" },
  { bg: "#d7c4f0", rot: -4, side: "right" as const, top: "74%" },
  { bg: "#c9e4a8", rot: 3, side: "left" as const, top: "78%" },
];

function FridgePeek({ pin, notes, onClose }: { pin: MemoryPin; notes: PinNote[]; onClose: () => void }) {
  return (
    <div className="ks-fridge" data-fridge role="dialog" aria-modal="true" aria-label={`Photograph: ${pin.label}`}>
      <button type="button" className="ks-fridge-dim" aria-label="Put the photograph back" onClick={onClose} />
      <div className="ks-fridge-door">
        <div className="ks-fridge-well">
          <div className="ks-fridge-polaroid">
            <div className="ks-fridge-print">
              <img src={pin.photoSrc} alt={pin.label} />
              <div className="ks-fridge-stickies">
                {notes.map((n, i) => {
                  const look = STICKY_LOOKS[i % STICKY_LOOKS.length];
                  return (
                    <div
                      key={n.id}
                      className="ks-sticky"
                      data-sticky-id={n.id}
                      data-side={look.side}
                      style={{
                        top: look.top,
                        background: look.bg,
                        transform: `rotate(${look.rot}deg)`,
                      }}
                    >
                      <p>{n.message}</p>
                      <cite>{n.author}</cite>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="ks-fridge-title">{pin.label}</p>
            {pin.caption ? <p className="ks-fridge-caption">{pin.caption}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapPinMarker({
  pin,
  locked,
  selected,
  mapRef,
  onSelect,
  onPeek,
  onMove,
}: {
  pin: MemoryPin;
  locked: boolean;
  selected: boolean;
  mapRef: RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onPeek: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ox: pin.x,
      oy: pin.y,
      moved: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = drag.current;
    const map = mapRef.current;
    if (!s || !map || s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) < 5) return;
    s.moved = true;
    if (locked) return;
    const r = map.getBoundingClientRect();
    onMove(clamp(s.ox + (dx / r.width) * 100, 2, 98), clamp(s.oy + (dy / r.height) * 100, 2, 98));
  };

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = drag.current;
    if (!s || s.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
    if (!s.moved) {
      if (pin.photoSrc && (e.target as HTMLElement).closest("[data-pin-photo]")) onPeek();
      else onSelect();
    }
  };

  return (
    <button
      type="button"
      className={`absolute z-10 -translate-x-1/2 -translate-y-[85%] border-0 bg-transparent p-0${selected ? " z-20" : ""}`}
      style={{ left: `${pin.x}%`, top: `${pin.y}%`, cursor: locked ? "pointer" : "grab" }}
      aria-label={pin.photoSrc ? `Open photograph: ${pin.label}` : `${selected ? "Editing" : "Edit"} pin: ${pin.label}`}
      data-pin-id={pin.id}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {pin.photoSrc ? (
        <img
          src={pin.photoSrc}
          alt=""
          data-pin-photo
          className="mb-0.5 h-10 w-10 rounded-[2px] border-2 border-[#fffef8] object-cover shadow-md"
          style={{ transform: "rotate(-4deg)" }}
        />
      ) : null}
      <MapPin size={26} className="mx-auto text-[#b55245] drop-shadow" fill={selected ? "#d46a5c" : "#b55245"} />
      <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[0.7rem] text-paper/80">
        <Pencil size={10} />
        {pin.label}
      </span>
    </button>
  );
}

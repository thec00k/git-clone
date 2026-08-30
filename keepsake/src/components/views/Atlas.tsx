import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { Lock, MapPin, Pencil, Trash2, Unlock, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { loadImageFile } from "../../lib/image";
import { clamp } from "../../lib/clamp";
import { ViewShell } from "./ViewShell";
import type { MemoryPin } from "../../types/app";

export function Atlas() {
  const { state, environment, setEnvironment, addPin, updatePin, removePin } = useApp();
  const { isVisitor } = useNav();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [caption, setCaption] = useState("");
  const [photoSrc, setPhotoSrc] = useState<string | undefined>();
  const photoRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const locked = environment.pinsLocked || isVisitor;
  const editing = editingId ? state.pins.find((p) => p.id === editingId) : null;

  const beginNew = (x: number, y: number) => {
    if (isVisitor) return;
    setEditingId(null);
    setDraft({ x, y });
    setLabel("");
    setCaption("");
    setPhotoSrc(undefined);
  };

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVisitor || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    beginNew(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  const openEdit = (pin: MemoryPin) => {
    if (isVisitor) return;
    setDraft(null);
    setEditingId(pin.id);
    setLabel(pin.label);
    setCaption(pin.caption);
    setPhotoSrc(pin.photoSrc);
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
    setPhotoSrc(undefined);
  };

  return (
    <ViewShell
      title="The map"
      subtitle="a corkboard of the world"
      scroll
      actions={
        !isVisitor && (
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
        )
      }
    >
      <p className="mt-2 text-sm text-paper/50">
        {isVisitor
          ? "Places shared on the map."
          : environment.pinsLocked
            ? "Pins are locked. Click a pin to edit its note. Unlock to drag a pin to a new place."
            : "Click the map to pin a memory. Drag a pin to move it, or click it to edit. Exact street addresses stay private (Bible §16)."}
      </p>
      <div className="ks-cork mt-3">
        <div
          ref={mapRef}
          className="ks-cork-map relative w-full overflow-hidden"
          style={{ aspectRatio: "2 / 1", cursor: isVisitor || locked ? "default" : "crosshair" }}
          onClick={onMapClick}
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
              selected={editingId === p.id}
              mapRef={mapRef}
              onSelect={() => openEdit(p)}
              onMove={(x, y) => updatePin(p.id, { x, y })}
            />
          ))}
          {draft && (
            <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}>
              <MapPin size={26} className="text-paper drop-shadow" />
            </div>
          )}
        </div>
      </div>

      {(draft || editing) && !isVisitor && (
        <div className="ks-panel mt-3 p-4" data-pin-editor={editing ? "edit" : "new"}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-paper">{editing ? "Edit this pin" : "Pin a memory"}</p>
            <button className="ks-chip h-8 w-8" onClick={closeForm} aria-label="Cancel">
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-paper/60" htmlFor="ks-pin-place">
              Place
              <input
                id="ks-pin-place"
                name="place"
                className="mt-1 block w-full rounded-lg bg-black/25 px-3 py-2 text-paper outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="where…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
              />
            </label>
            <label className="text-sm text-paper/60" htmlFor="ks-pin-note">
              Note
              <input
                id="ks-pin-note"
                name="note"
                className="mt-1 block w-full rounded-lg bg-black/25 px-3 py-2 text-paper outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="a memory…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (editing ? commitEdit() : commitNew())}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input ref={photoRef} type="file" accept="image/*" hidden aria-label="Photograph for this pin" onChange={(e) => { onPhoto(e.target.files); e.target.value = ""; }} />
            <button type="button" className="ks-tool" onClick={() => photoRef.current?.click()}>
              {photoSrc ? "Change photo" : "Add a photo"}
            </button>
            {photoSrc && <img src={photoSrc} alt="" className="h-12 w-12 rounded object-cover" />}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="ks-tool ks-tool--accent flex-1 justify-center disabled:opacity-40"
              onClick={editing ? commitEdit : commitNew}
              disabled={!label.trim()}
            >
              {editing ? "Save" : "Pin it"}
            </button>
            {editing && (
              <button
                type="button"
                className="ks-tool"
                onClick={() => {
                  removePin(editing.id);
                  closeForm();
                }}
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      )}
    </ViewShell>
  );
}

function MapPinMarker({
  pin,
  locked,
  selected,
  mapRef,
  onSelect,
  onMove,
}: {
  pin: MemoryPin;
  locked: boolean;
  selected: boolean;
  mapRef: RefObject<HTMLDivElement | null>;
  onSelect: () => void;
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
    if (!s.moved) onSelect();
  };

  return (
    <button
      type="button"
      className={`absolute z-10 -translate-x-1/2 -translate-y-[85%] border-0 bg-transparent p-0${selected ? " z-20" : ""}`}
      style={{ left: `${pin.x}%`, top: `${pin.y}%`, cursor: locked ? "pointer" : "grab" }}
      aria-label={`${selected ? "Editing" : "Edit"} pin: ${pin.label}`}
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

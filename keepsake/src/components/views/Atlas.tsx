import { useRef, useState } from "react";
import { MapPin, Trash2, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { loadImageFile } from "../../lib/image";
import { ViewShell } from "./ViewShell";

export function Atlas() {
  const { state, addPin, removePin } = useApp();
  const { isVisitor } = useNav();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState("");
  const [caption, setCaption] = useState("");
  const [photoSrc, setPhotoSrc] = useState<string | undefined>();
  const photoRef = useRef<HTMLInputElement>(null);

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVisitor) return;
    const r = e.currentTarget.getBoundingClientRect();
    setDraft({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    setLabel("");
    setCaption("");
    setPhotoSrc(undefined);
  };

  const commit = () => {
    if (!draft || !label.trim()) return;
    addPin({ x: draft.x, y: draft.y, label: label.trim(), caption: caption.trim(), photoSrc });
    setDraft(null);
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

  return (
    <ViewShell title="The map" subtitle="a corkboard of the world" scroll>
      <p className="mt-2 text-sm text-paper/50">
        {isVisitor
          ? "Places shared on the map."
          : "Click the map to pin a memory. You can attach a photograph. Exact street addresses stay private (Bible §16)."}
      </p>
      <div className="ks-cork mt-3">
        <div
          className="ks-cork-map relative w-full overflow-hidden"
          style={{ aspectRatio: "2 / 1", cursor: isVisitor ? "default" : "crosshair" }}
          onClick={onMapClick}
        >
          <img src="/maps/world.svg" alt="World map" className="ks-world-map pointer-events-none absolute inset-0 h-full w-full object-cover" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "url('/textures/grain.png')", opacity: 0.12 }}
          />
          {state.pins.map((p) => (
            <div
              key={p.id}
              className="group absolute z-10 -translate-x-1/2 -translate-y-[85%]"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              {p.photoSrc ? (
                <img
                  src={p.photoSrc}
                  alt=""
                  className="mb-0.5 h-10 w-10 rounded-[2px] border-2 border-[#fffef8] object-cover shadow-md"
                  style={{ transform: "rotate(-4deg)" }}
                />
              ) : null}
              <MapPin size={26} className="mx-auto text-[#b55245] drop-shadow" fill="#b55245" />
              <div className="absolute bottom-full left-1/2 mb-1 hidden w-44 -translate-x-1/2 group-hover:block group-focus-within:block">
                <div className="ks-panel p-2 text-center">
                  {p.photoSrc && <img src={p.photoSrc} alt="" className="mb-1.5 h-20 w-full rounded object-cover" />}
                  <p className="font-display text-sm text-paper">{p.label}</p>
                  {p.caption && <p className="ks-caption text-paper/70">{p.caption}</p>}
                  {!isVisitor && (
                    <button className="mt-1 text-xs text-paper/50 hover:text-accent" onClick={() => removePin(p.id)}>
                      <Trash2 size={12} className="inline" /> remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {draft && (
            <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}>
              <MapPin size={26} className="text-paper drop-shadow" />
            </div>
          )}
        </div>
      </div>

      {draft && (
        <div className="ks-panel mt-3 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-paper">Pin a memory</p>
            <button className="ks-chip h-8 w-8" onClick={() => { setDraft(null); setPhotoSrc(undefined); }} aria-label="Cancel">
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
                onKeyDown={(e) => e.key === "Enter" && commit()}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input ref={photoRef} type="file" accept="image/*" hidden aria-label="Photograph for this pin" onChange={(e) => { onPhoto(e.target.files); e.target.value = ""; }} />
            <button type="button" className="ks-tool" onClick={() => photoRef.current?.click()}>
              {photoSrc ? "Change photo" : "Add a photo"}
            </button>
            {photoSrc && (
              <img src={photoSrc} alt="" className="h-12 w-12 rounded object-cover" />
            )}
          </div>
          <button
            className="ks-tool ks-tool--accent mt-3 w-full justify-center disabled:opacity-40"
            onClick={commit}
            disabled={!label.trim()}
          >
            Pin it
          </button>
        </div>
      )}
    </ViewShell>
  );
}

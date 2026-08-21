import { useState } from "react";
import { MapPin, Trash2, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { ViewShell } from "./ViewShell";

export function Atlas() {
  const { state, addPin, removePin } = useApp();
  const { isVisitor } = useNav();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState("");
  const [caption, setCaption] = useState("");

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVisitor) return;
    const r = e.currentTarget.getBoundingClientRect();
    setDraft({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    setLabel("");
    setCaption("");
  };

  const commit = () => {
    if (!draft || !label.trim()) return;
    addPin({ x: draft.x, y: draft.y, label: label.trim(), caption: caption.trim() });
    setDraft(null);
  };

  return (
    <ViewShell title="The map" subtitle="one memory, meaningful places" scroll={false}>
      <p className="mt-2 text-sm text-paper/50">
        {isVisitor ? "Places shared on the map." : "Click anywhere on the map to pin a memory. Exact locations stay private (Bible §16)."}
      </p>
      <div
        className="relative mt-3 w-full overflow-hidden rounded-xl"
        style={{
          aspectRatio: "16 / 9",
          background:
            "radial-gradient(ellipse at 30% 30%, #6f8f6a 0 12%, transparent 13%), radial-gradient(ellipse at 68% 60%, #7a9a72 0 18%, transparent 19%), radial-gradient(ellipse at 50% 85%, #6b8a80 0 10%, transparent 11%), linear-gradient(180deg,#22405a,#2b5a6e)",
          boxShadow: "inset 0 0 60px rgb(0 0 0/.4)",
          cursor: isVisitor ? "default" : "crosshair",
        }}
        onClick={onMapClick}
      >
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "url('/textures/grain.png')", opacity: 0.06 }} />
        {state.pins.map((p) => (
          <div key={p.id} className="group absolute -translate-x-1/2 -translate-y-full" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <MapPin size={26} className="text-[#b55245] drop-shadow" fill="#b55245" />
            <div className="absolute bottom-full left-1/2 mb-1 hidden w-40 -translate-x-1/2 group-hover:block">
              <div className="ks-panel p-2 text-center">
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

      {draft && (
        <div className="ks-panel mt-3 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-paper">Pin a memory</p>
            <button className="ks-chip h-8 w-8" onClick={() => setDraft(null)} aria-label="Cancel">
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

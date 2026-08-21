import { useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { uid } from "../../lib/id";
import { ViewShell } from "./ViewShell";

export function Timeline() {
  const { state, update } = useApp();
  const { isVisitor } = useNav();
  const [year, setYear] = useState(new Date().getFullYear());
  const [title, setTitle] = useState("");

  const entries = [...state.timeline].sort((a, b) => a.year - b.year);

  const add = () => {
    if (!title.trim()) return;
    update((p) => ({ ...p, timeline: [...p.timeline, { id: uid("t"), year, title: title.trim() }] }));
    setTitle("");
  };

  return (
    <ViewShell title="The timeline" subtitle="your years, in a line">
      {!isVisitor && (
        <div className="ks-panel mt-3 flex flex-wrap items-end gap-2 p-3">
          <label className="text-sm text-paper/60">
            Year
            <input
              type="number"
              className="mt-1 block w-24 rounded bg-black/25 px-2 py-1 text-paper outline-none"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="flex-1 text-sm text-paper/60">
            Milestone
            <input
              className="mt-1 block w-full rounded bg-black/25 px-2 py-1 text-paper outline-none"
              placeholder="what happened…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
          <button className="ks-tool ks-tool--accent" onClick={add}>
            <Plus size={16} /> Add
          </button>
        </div>
      )}

      <div className="relative mt-6 pl-6">
        <div className="absolute bottom-0 left-2 top-0 w-0.5 bg-paper/20" />
        {entries.map((e) => (
          <div key={e.id} className="relative mb-6">
            <span className="absolute -left-[1.15rem] top-1 h-3 w-3 rounded-full bg-accent ring-4 ring-[var(--color-room)]" />
            <p className="font-display text-lg text-paper">{e.year}</p>
            <p className="ks-caption text-paper/80" style={{ fontSize: "1.25rem" }}>{e.title}</p>
          </div>
        ))}
        {entries.length === 0 && <p className="text-paper/50">Nothing on the wall yet.</p>}
      </div>
    </ViewShell>
  );
}

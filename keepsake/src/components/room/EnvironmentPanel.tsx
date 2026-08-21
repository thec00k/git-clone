import { useApp } from "../../store/appStore";
import type { Season, TimeMode, Weather } from "../../types/app";

const TIMES: TimeMode[] = ["auto", "day", "dusk", "night"];
const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
const WEATHERS: Weather[] = ["clear", "rain", "snow"];

export function EnvironmentPanel({ onClose }: { onClose: () => void }) {
  const { state, environment, setEnvironment, setProfile } = useApp();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="ks-panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl">The room</h2>

        <label className="mb-4 block">
          <span className="text-sm text-paper/60">Your name</span>
          <input
            className="mt-1 w-full rounded-lg bg-black/25 px-3 py-2 text-paper outline-none"
            value={state.profile.displayName}
            onChange={(e) => setProfile({ displayName: e.target.value })}
          />
        </label>

        <Segment label="Time" value={environment.timeMode} options={TIMES} onChange={(v) => setEnvironment({ timeMode: v as TimeMode })} />
        <Segment label="Season" value={environment.season} options={SEASONS} onChange={(v) => setEnvironment({ season: v as Season })} />
        <Segment label="Weather" value={environment.weather} options={WEATHERS} onChange={(v) => setEnvironment({ weather: v as Weather })} />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-paper/60">Lamp</span>
          <button
            className={`ks-tool ${environment.lampOn ? "ks-tool--accent" : ""}`}
            onClick={() => setEnvironment({ lampOn: !environment.lampOn })}
          >
            {environment.lampOn ? "On" : "Off"}
          </button>
        </div>

        <div className="mt-3">
          <span className="text-sm text-paper/60">Ambience volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={environment.ambienceVolume}
            onChange={(e) => setEnvironment({ ambienceVolume: Number(e.target.value) })}
            className="mt-1 w-full accent-[var(--color-accent)]"
          />
        </div>

        <button className="ks-tool ks-tool--accent mt-5 w-full justify-center" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function Segment({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <span className="text-sm text-paper/60">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            className={`ks-tool ${value === o ? "ks-tool--accent" : ""}`}
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

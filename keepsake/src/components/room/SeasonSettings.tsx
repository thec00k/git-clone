import { useApp } from "../../store/appStore";
import { useSeasonal } from "../../hooks/useSeasonal";
import { HOLIDAY_IDS, HOLIDAY_TITLE, SEASONS } from "../../lib/seasons";
import type { Hemisphere, HolidayId, Season } from "../../types/app";

const label = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Season controls for Room settings: follow the calendar, or freeze the room in one season. */
export function SeasonSettings() {
  const { environment, setEnvironment } = useApp();
  const today = useSeasonal();
  const fixed = environment.seasonMode === "fixed";
  const hemisphere = environment.hemisphere ?? "auto";
  const off = environment.holidaysOff ?? [];
  const toggleHoliday = (id: HolidayId) =>
    setEnvironment({ holidaysOff: off.includes(id) ? off.filter(h => h !== id) : [...off, id] });
  const choose = (value: "auto" | Season) =>
    setEnvironment(value === "auto" ? { seasonMode: "auto" } : { seasonMode: "fixed", season: value });
  const current = fixed ? environment.season : "auto";

  return (
    <div className="mb-3 ks-season-settings">
      <span className="text-sm text-paper/60" id="ks-seg-season">Season</span>
      <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-labelledby="ks-seg-season">
        {(["auto", ...SEASONS] as const).map(option => (
          <button key={option} className={`ks-tool ${current === option ? "ks-tool--accent" : ""}`} aria-pressed={current === option} onClick={() => choose(option)}>
            {label(option)}
          </button>
        ))}
      </div>
      <p className="text-sm my-2" role="status">
        {fixed
          ? `Your room stays in ${environment.season}, whatever the date. Holidays are paused.`
          : `Following the calendar: ${today.season}${today.holiday ? ` · ${HOLIDAY_TITLE[today.holiday]}` : ""}.`}
      </p>
      {!fixed && (
        <>
          <span className="text-sm text-paper/60" id="ks-seg-hemisphere">Hemisphere</span>
          <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-labelledby="ks-seg-hemisphere">
            {(["auto", "north", "south"] as const).map((option: "auto" | Hemisphere) => (
              <button key={option} className={`ks-tool ${hemisphere === option ? "ks-tool--accent" : ""}`} aria-pressed={hemisphere === option} onClick={() => setEnvironment({ hemisphere: option })}>
                {label(option)}
              </button>
            ))}
          </div>
          <p className="text-sm my-2">Auto uses your device's time zone. Keepsake never asks for your location.</p>
          <details className="my-2">
            <summary>Holidays</summary>
            {HOLIDAY_IDS.map(id => (
              <label key={id} className="block my-1">
                <input type="checkbox" checked={!off.includes(id)} onChange={() => toggleHoliday(id)} /> {HOLIDAY_TITLE[id]}
              </label>
            ))}
          </details>
        </>
      )}
    </div>
  );
}

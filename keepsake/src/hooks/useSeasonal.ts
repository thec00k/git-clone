import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/appStore";
import { dayKey, msUntilNextDay, resolveSeasonal, type SeasonalState } from "../lib/seasons";

/**
 * The season and holiday the room should show right now. Follows the calendar
 * unless the user froze the room, and refreshes itself at midnight and when the
 * tab becomes visible again, so a room left open overnight changes with the date.
 */
export function useSeasonal(): SeasonalState {
  const { environment } = useApp();
  const [day, setDay] = useState(() => dayKey());
  useEffect(() => {
    let timer = window.setTimeout(function tick() {
      setDay(dayKey());
      timer = window.setTimeout(tick, msUntilNextDay());
    }, msUntilNextDay());
    const visible = () => { if (document.visibilityState === "visible") setDay(dayKey()); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  const { season, seasonMode, hemisphere, holidaysOff } = environment;
  // `day` is not read inside, but a new day must produce a new answer.
  return useMemo(() => resolveSeasonal({ season, seasonMode, hemisphere, holidaysOff }, new Date()), [season, seasonMode, hemisphere, holidaysOff, day]);
}

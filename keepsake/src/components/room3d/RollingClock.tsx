import { useEffect, useState } from "react";
import type { TimeMode } from "../../types/app";
import { clockFromMode, clockLabel } from "../../lib/clockTime";

function RollingDigit({ value }: { value: number }) {
  const digit = ((value % 10) + 10) % 10;
  return (
    <span className="ks-clock-wheel" aria-hidden="true">
      <span className="ks-clock-reel" style={{ transform: `translateY(${-digit * 10}%)` }}>
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="ks-clock-num">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

export function RollingClock({ timeMode }: { timeMode: TimeMode }) {
  const [now, setNow] = useState(() => new Date());
  const { h, m, live } = clockFromMode(timeMode, now);
  const label = clockLabel(h, m);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  useEffect(() => {
    const host = document.querySelector(".ks-room3d");
    if (host instanceof HTMLElement) host.dataset.clock = label;
  }, [label]);

  const displayHour = h % 12 || 12;
  const tensH = Math.floor(displayHour / 10);
  const onesH = displayHour % 10;
  const tensM = Math.floor(m / 10);
  const onesM = m % 10;

  return (
    <div className="ks-clock-face" data-clock-face data-clock-live={live ? "1" : "0"} aria-hidden="true">
      <span className="sr-only">The hour is {label}</span>
      <RollingDigit value={tensH} />
      <RollingDigit value={onesH} />
      <span className={`ks-clock-colon${live ? " is-live" : ""}`}>:</span>
      <RollingDigit value={tensM} />
      <RollingDigit value={onesM} />
      <span className="ks-clock-period">{h >= 12 ? "PM" : "AM"}</span>
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { TOUR_STEPS } from "../../lib/tour";
import { DialogueBubble } from "./DialogueBubble";

export function RoomTour() {
  const { touring, endTour, setTourFocus } = useNav();
  const { recordProgress } = useApp();
  const [step, setStep] = useState(0);
  const [cutout, setCutout] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null,
  );

  const finish = useCallback(() => {
    recordProgress({ completedTour: true });
    setTourFocus(null);
    endTour();
  }, [endTour, recordProgress, setTourFocus]);

  const current = TOUR_STEPS[step];

  useEffect(() => {
    setTourFocus(current?.focus ?? null);
    return () => setTourFocus(null);
  }, [current, setTourFocus]);

  useLayoutEffect(() => {
    if (!touring || !current?.focus) {
      setCutout(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${current.focus}"]`);
    if (!(el instanceof HTMLElement)) {
      setCutout(null);
      return;
    }
    const apply = () => {
      const r = el.getBoundingClientRect();
      const pad = 8;
      setCutout({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [touring, current, step]);

  useEffect(() => {
    if (!touring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (step >= TOUR_STEPS.length - 1) finish();
        else setStep((s) => s + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring, step, finish]);

  if (!touring) return null;

  const last = step >= TOUR_STEPS.length - 1;

  const next = () => {
    if (last) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div className="ks-tour" aria-live="polite">
      <div
        className="ks-tour-veil"
        style={{ background: cutout ? "transparent" : "rgb(12 8 6 / 0.42)" }}
      />
      {cutout && (
        <button
          type="button"
          className="ks-tour-cutout"
          style={cutout}
          onClick={next}
          aria-label={`Continue — ${current.focus}`}
        />
      )}
      <div className="ks-tour-say">
        <DialogueBubble
          key={current.id}
          speaker={current.speaker}
          text={current.text}
          step={step}
          total={TOUR_STEPS.length}
          onNext={next}
          onSkip={finish}
          last={last}
        />
      </div>
    </div>
  );
}

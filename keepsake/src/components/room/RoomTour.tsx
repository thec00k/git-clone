import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { markTourFinished, TOUR_STEPS } from "../../lib/tour";
import { faceForHotspot, roomLayoutFromSearch, YAW_MS } from "../../lib/roomLayout";
import { DialogueBubble } from "./DialogueBubble";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RoomTour() {
  const { touring, endTour, setTourFocus, setRoomFace, roomFace } = useNav();
  const { recordProgress } = useApp();
  const [step, setStep] = useState(0);
  const [cutout, setCutout] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const faceRef = useRef(roomFace);

  const finish = useCallback(() => {
    markTourFinished();
    recordProgress({ completedTour: true });
    setTourFocus(null);
    endTour();
  }, [endTour, recordProgress, setTourFocus]);

  const current = TOUR_STEPS[step];
  const targetFace = faceForHotspot(current?.focus);

  useEffect(() => {
    setTourFocus(current?.focus ?? null);
    if (roomLayoutFromSearch() === "chamber") setRoomFace(targetFace);
    return () => setTourFocus(null);
  }, [current, setTourFocus, setRoomFace, targetFace]);

  useLayoutEffect(() => {
    if (!touring || !current?.focus) {
      setCutout(null);
      return;
    }

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const prevFace = faceRef.current;
    faceRef.current = targetFace;

    const apply = () => {
      const el = document.querySelector(`[data-tour="${current.focus}"]`);
      if (!(el instanceof HTMLElement) || cancelled) {
        if (!el && !cancelled) setCutout(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 8;
      setCutout({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
      if (!ro) {
        ro = new ResizeObserver(apply);
        ro.observe(el);
      }
    };

    const waitThenMeasure = async () => {
      setCutout(null);
      const yaw = document.querySelector(".ks-yaw");
      const needsTurn = yaw instanceof HTMLElement && prevFace !== targetFace && !prefersReducedMotion();
      if (needsTurn) {
        await new Promise<void>((resolve) => {
          let done = false;
          const finishWait = () => {
            if (done) return;
            done = true;
            yaw.removeEventListener("transitionend", onEnd);
            resolve();
          };
          const onEnd = (e: TransitionEvent) => {
            if (e.target === yaw && (e.propertyName === "transform" || e.propertyName === "--yaw")) finishWait();
          };
          yaw.addEventListener("transitionend", onEnd);
          window.setTimeout(finishWait, YAW_MS + 80);
        });
      }
      if (!cancelled) apply();
    };

    void waitThenMeasure();
    window.addEventListener("resize", apply);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [touring, current, step, targetFace]);

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
      <div className="ks-tour-veil" style={{ background: cutout ? "transparent" : "rgb(12 8 6 / 0.42)" }} />
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

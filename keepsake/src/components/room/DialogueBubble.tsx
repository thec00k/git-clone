import { useEffect, useState } from "react";

/*
 * Bottom-of-scene dialogue, laid out like messenger.abeto.co:
 * name plate overlapping the top-left, a thick-bordered paper box, and a
 * square "next" control overlapping the bottom-right. Materials are
 * Keepsake (cream paper, ink outline, offset block shadow) rather than
 * Messenger's cool cel-shade, so it sits in the room instead of on top of it.
 */
export function DialogueBubble({
  speaker,
  text,
  step,
  total,
  onNext,
  onSkip,
  last = false,
}: {
  speaker: string;
  text: string;
  step: number;
  total: number;
  onNext: () => void;
  onSkip?: () => void;
  last?: boolean;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(text);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [text]);

  const complete = shown.length >= text.length;

  return (
    <div className="ks-say" role="dialog" aria-modal="true" aria-label={`${speaker} says`}>
      <div className="ks-say-name">{speaker}</div>
      <div className="ks-say-box">
        <p className="ks-say-text">
          {shown}
          {!complete && <span className="ks-say-caret" aria-hidden="true" />}
        </p>
        <div className="ks-say-meta">
          <span>
            {step + 1} / {total}
          </span>
          {onSkip && !last && (
            <button type="button" className="ks-say-skip" onClick={onSkip}>
              wander off
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        className="ks-say-next"
        onClick={complete ? onNext : () => setShown(text)}
        aria-label={last ? "Finish the tour" : complete ? "Next" : "Show the rest"}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          {last ? (
            <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M8 5l10 7-10 7z" fill="currentColor" />
          )}
        </svg>
      </button>
    </div>
  );
}

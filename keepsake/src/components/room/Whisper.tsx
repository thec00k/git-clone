import { useEffect, useState } from "react";
import { useApp } from "../../store/appStore";

/*
 * A "whisper" (Bible §19): occasionally an approved page-note drifts into the
 * room. It never interrupts — it fades in near the window and can be dismissed.
 * Session-limited and only ever shows approved notes.
 */
export function Whisper() {
  const { state } = useApp();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("ks-whisper-shown")) return;
    const approved = state.notes.filter((n) => n.approved);
    if (approved.length === 0) return;
    const t = window.setTimeout(() => {
      const note = approved[Math.floor(Math.random() * approved.length)];
      setText(`“${note.message}” — ${note.author}`);
      sessionStorage.setItem("ks-whisper-shown", "1");
      window.setTimeout(() => setText(null), 9000);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [state.notes]);

  if (!text) return null;

  return (
    <button
      className="absolute left-[10%] top-[58%] z-20 max-w-[16rem] text-left"
      onClick={() => setText(null)}
      aria-label="A whisper"
    >
      <p
        className="ks-caption text-paper"
        style={{ fontSize: "1.5rem", textShadow: "0 2px 10px rgb(0 0 0 / 0.7)", opacity: 0.92 }}
      >
        {text}
      </p>
    </button>
  );
}

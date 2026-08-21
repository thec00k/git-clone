import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";

/*
 * A minimal "curated RNG" opportunity (Bible §20): occasionally a letter is
 * waiting on the desk. It never interrupts — it just sits there until opened,
 * and only appears at most once per session (a stand-in for the eligibility /
 * cooldown queue the Bible describes).
 */
const LETTERS = [
  "The room kept the kettle warm for you. — the house",
  "You left a page half-finished on Tuesday. It's still here, waiting kindly.",
  "Someone dog-eared a corner of an old book. Curious?",
  "The window liked today's light. It saved you a little of it.",
];

export function CuratedLetter() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("ks-letter-shown")) return;
    const t = window.setTimeout(() => {
      if (Math.random() < 0.6) {
        setText(LETTERS[Math.floor(Math.random() * LETTERS.length)]);
        setShow(true);
        sessionStorage.setItem("ks-letter-shown", "1");
      }
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <>
      <button
        className="ks-obj"
        style={{ left: "58%", bottom: "20%", width: "8%", height: "9%" }}
        onClick={() => setOpen(true)}
        aria-label="A letter on the desk"
      >
        <div
          className="flex h-full w-full items-center justify-center rounded-sm bg-[#efe3cf] text-[#7a3d3a]"
          style={{ boxShadow: "0 6px 14px rgb(0 0 0/.4)", transform: "rotate(-6deg)" }}
        >
          <Mail size={18} />
        </div>
        <span className="ks-obj-label">a letter…</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => { setOpen(false); setShow(false); }}>
          <div className="ks-panel relative max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 text-paper/50" onClick={() => { setOpen(false); setShow(false); }}>
              <X size={16} />
            </button>
            <Mail size={22} className="mb-3 text-accent" />
            <p className="ks-caption text-paper" style={{ fontSize: "1.5rem", lineHeight: 1.3 }}>
              {text}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

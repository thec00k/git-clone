import { useEffect, useRef, useState } from "react";
import { BookOpen, Mail, Sparkles, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { pickOpportunity, type OpportunityKind } from "../../lib/opportunities";
import { ACHIEVEMENTS } from "../../types/app";

const LETTERS = [
  "The room kept the kettle warm for you. — the house",
  "You left a page half-finished on Tuesday. It's still here, waiting kindly.",
  "The window liked today's light. It saved you a little of it.",
];

/*
 * The room's "curator": on a quiet moment it asks the opportunity queue for at
 * most one ambient event and presents it non-intrusively (a letter that waits
 * on the desk, a drifting whisper, a gentle first-visit tour, a book left ajar,
 * or the delivery of an unseen achievement). One per session; cooldowns persist
 * via receipts. Bible §20/§21. Welcome is a Messenger-style room tour.
 */
export function RoomCurator() {
  const { state, newlyUnlocked, recordReceipt, markAchievementsSeen } = useApp();
  const { go, startTour, touring } = useNav();
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Keep latest state without resetting the one-shot timer below.
  const stateRef = useRef(state);
  stateRef.current = state;
  const newlyRef = useRef(newlyUnlocked);
  newlyRef.current = newlyUnlocked;

  useEffect(() => {
    if (sessionStorage.getItem("ks-curator")) return;
    if (new URLSearchParams(window.location.search).get("tour") === "1") return;
    const delay = stateRef.current.progress.completedTour ? 2600 : 900;
    const t = window.setTimeout(() => {
      const s = stateRef.current;
      const pendingReward =
        s.achievements.find(
          (id) => !s.achievementsSeen.includes(id) && !newlyRef.current.includes(id),
        ) ?? null;
      const choice = pickOpportunity({ state: s, pendingReward }, s.receipts);
      sessionStorage.setItem("ks-curator", "1");
      if (!choice) return;
      if (choice === "welcome") {
        recordReceipt(choice);
        startTour();
        return;
      }
      setKind(choice);
      if (choice === "reward") setRewardId(pendingReward);
      recordReceipt(choice);
    }, delay);
    return () => window.clearTimeout(t);
    // one-shot on mount; latest state read via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-dismiss the drifting whisper
  useEffect(() => {
    if (kind === "whisper") {
      const t = window.setTimeout(() => setKind(null), 9000);
      return () => window.clearTimeout(t);
    }
  }, [kind]);

  if (touring || !kind) return null;

  if (kind === "welcome") return null;

  if (kind === "reward" && rewardId) {
    const a = ACHIEVEMENTS.find((x) => x.id === rewardId);
    return (
      <Banner
        onClose={() => {
          markAchievementsSeen([rewardId]);
          setKind(null);
        }}
        icon={<Sparkles size={16} className="text-accent" />}
      >
        A keepsake was tucked away for you: <strong>{a?.title ?? "a keepsake"}</strong>.
      </Banner>
    );
  }

  if (kind === "ajar-book") {
    return (
      <button
        className="ks-obj"
        style={{ right: "18%", top: "40%", width: "8%", height: "9%" }}
        onClick={() => go("shelf")}
        aria-label="A book left slightly open"
      >
        <div className="flex h-full w-full items-center justify-center rounded-sm bg-[#5b2733] text-paper" style={{ transform: "rotate(-8deg)", boxShadow: "0 6px 14px rgb(0 0 0/.4)" }}>
          <BookOpen size={16} />
        </div>
        <span className="ks-obj-label">left slightly open…</span>
      </button>
    );
  }

  if (kind === "whisper") {
    const approved = state.notes.filter((n) => n.approved);
    const note = approved[Math.floor(Math.random() * approved.length)];
    if (!note) return null;
    return (
      <button
        className="absolute left-[10%] top-[58%] z-20 max-w-[16rem] text-left"
        onClick={() => setKind(null)}
        aria-label="A whisper"
      >
        <p className="ks-caption text-paper" style={{ fontSize: "1.5rem", textShadow: "0 2px 10px rgb(0 0 0 / 0.7)", opacity: 0.92 }}>
          “{note.message}” — {note.author}
        </p>
      </button>
    );
  }

  // letter — waits on the desk until opened (never interrupts)
  const text = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return (
    <>
      <button
        className="ks-obj"
        style={{ left: "58%", bottom: "20%", width: "8%", height: "9%" }}
        onClick={() => setOpen(true)}
        aria-label="A letter on the desk"
      >
        <div className="flex h-full w-full items-center justify-center rounded-sm bg-[#efe3cf] text-[#7a3d3a]" style={{ boxShadow: "0 6px 14px rgb(0 0 0/.4)", transform: "rotate(-6deg)" }}>
          <Mail size={18} />
        </div>
        <span className="ks-obj-label">a letter…</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="A letter" onClick={() => { setOpen(false); setKind(null); }}>
          <div className="ks-panel relative max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 text-paper/50" onClick={() => { setOpen(false); setKind(null); }} aria-label="Close">
              <X size={16} />
            </button>
            <Mail size={22} className="mb-3 text-accent" />
            <p className="ks-caption text-paper" style={{ fontSize: "1.5rem", lineHeight: 1.3 }}>{text}</p>
          </div>
        </div>
      )}
    </>
  );
}

function Banner({ children, icon, onClose }: { children: React.ReactNode; icon: React.ReactNode; onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute bottom-16 left-1/2 z-30 -translate-x-1/2">
      <div className="ks-panel flex max-w-md items-center gap-3 px-4 py-3">
        {icon}
        <p className="text-sm text-paper/90">{children}</p>
        <button className="ml-1 text-paper/50 hover:text-paper" onClick={onClose} aria-label="Dismiss">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

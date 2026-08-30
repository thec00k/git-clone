import { useEffect, useRef, useState } from "react";
import { BookOpen, Flower2, Mail, Map as MapIcon, Sparkles, X } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { isOpportunityKind, pickOpportunity, type OpportunityKind } from "../../lib/opportunities";
import { CURATOR_SESSION_KEY, tourAlreadyFinished } from "../../lib/tour";
import { ACHIEVEMENTS } from "../../types/app";

const LETTERS = [
  "The room kept the kettle warm for you. — the house",
  "You left a page half-finished on Tuesday. It's still here, waiting kindly.",
  "The window liked today's light. It saved you a little of it.",
];

const SEASON_NOTE: Record<string, string> = {
  spring: "Something green is trying the window-ledge again.",
  summer: "The room is holding the long light for you.",
  autumn: "A dry leaf found its way onto the desk. It belongs here.",
  winter: "The glass has a quiet frost. The lamp will wait.",
};

/*
 * The room's curator: at most one ambient event per session from the
 * opportunity queue (Bible §20/§21). Welcome is the Messenger-style tour.
 */
export function RoomCurator({ visible = true }: { visible?: boolean }) {
  const { state, newlyUnlocked, recordReceipt, markAchievementsSeen } = useApp();
  const { go, startTour, touring, setRoomFace } = useNav();
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const newlyRef = useRef(newlyUnlocked);
  newlyRef.current = newlyUnlocked;

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("event");
    if (forced && isOpportunityKind(forced)) {
      setKind(forced);
      return;
    }
    if (tourAlreadyFinished(stateRef.current.progress.completedTour)) {
      sessionStorage.setItem(CURATOR_SESSION_KEY, "1");
    }
    if (sessionStorage.getItem(CURATOR_SESSION_KEY)) return;
    if (new URLSearchParams(window.location.search).get("tour") === "1") return;
    const delay = stateRef.current.progress.completedTour ? 2600 : 900;
    const t = window.setTimeout(() => {
      const s = stateRef.current;
      if (tourAlreadyFinished(s.progress.completedTour)) {
        sessionStorage.setItem(CURATOR_SESSION_KEY, "1");
        return;
      }
      const pendingReward =
        s.achievements.find(
          (id) => !s.achievementsSeen.includes(id) && !newlyRef.current.includes(id),
        ) ?? null;
      const choice = pickOpportunity({ state: s, pendingReward }, s.receipts);
      sessionStorage.setItem(CURATOR_SESSION_KEY, "1");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (kind === "whisper" || kind === "window-draft" || kind === "night-moth" || kind === "season-note") {
      const t = window.setTimeout(() => setKind(null), 9000);
      return () => window.clearTimeout(t);
    }
  }, [kind]);

  if (!visible || touring || !kind || kind === "welcome") return null;

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

  if (kind === "season-note") {
    return (
      <Banner onClose={() => setKind(null)} icon={<Flower2 size={16} className="text-accent" />}>
        {SEASON_NOTE[state.environment.season] ?? SEASON_NOTE.autumn}
      </Banner>
    );
  }

  if (kind === "empty-page") {
    return (
      <Banner onClose={() => setKind(null)} icon={<BookOpen size={16} className="text-accent" />}>
        A page is still blank.{" "}
        <button className="underline decoration-paper/40 underline-offset-2" onClick={() => go("book")}>
          Open the book
        </button>{" "}
        when you have a photograph.
      </Banner>
    );
  }

  if (kind === "ajar-book") {
    return (
      <Hotspot label="A book left slightly open" style={{ right: "18%", top: "40%", width: "8%", height: "9%" }} onClick={() => { setRoomFace("right"); go("shelf"); }}>
        <div className="flex h-full w-full items-center justify-center rounded-sm bg-[#5b2733] text-paper" style={{ transform: "rotate(-8deg)", boxShadow: "0 6px 14px rgb(0 0 0/.4)" }}>
          <BookOpen size={16} />
        </div>
        <span className="ks-obj-label">left slightly open…</span>
      </Hotspot>
    );
  }

  if (kind === "bookmark") {
    return (
      <Hotspot label="A ribbon marking a page" style={{ left: "46%", bottom: "28%", width: "5%", height: "14%" }} onClick={() => go("book")}>
        <div className="h-full w-[38%] mx-auto rounded-b-sm bg-[#b55245]" style={{ boxShadow: "0 8px 12px rgb(0 0 0/.35)" }} />
        <span className="ks-obj-label">a ribbon…</span>
      </Hotspot>
    );
  }

  if (kind === "photo-out") {
    const photo = state.archive[0];
    return (
      <Hotspot label="A photograph left on the desk" style={{ left: "28%", bottom: "14%", width: "10%", height: "16%" }} onClick={() => go("archive")}>
        <div
          className="h-full w-full bg-[#fffef8] p-1"
          style={{ transform: "rotate(-7deg)", boxShadow: "0 8px 16px rgb(0 0 0/.4)" }}
        >
          {photo ? (
            <img src={photo.src} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[#e4d4bc]" />
          )}
        </div>
        <span className="ks-obj-label">left out…</span>
      </Hotspot>
    );
  }

  if (kind === "guest-wave") {
    return (
      <Hotspot label="Someone signed the guest book" style={{ left: "64%", bottom: "28%", width: "12%", height: "8%" }} onClick={() => go("guestbook")}>
        <p className="ks-caption text-paper" style={{ fontSize: "1.15rem", textShadow: "0 2px 8px rgb(0 0 0/.6)" }}>
          a line waiting…
        </p>
      </Hotspot>
    );
  }

  if (kind === "map-glint") {
    return (
      <Hotspot label="A pin catching the light" style={{ left: "46%", top: "38%", width: "8%", height: "8%" }} onClick={() => { setRoomFace("left"); go("atlas"); }}>
        <MapIcon size={18} className="text-[#f3e9d8] drop-shadow" />
        <span className="ks-obj-label">a place you marked</span>
      </Hotspot>
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
        aria-label={`A whisper from ${note.author}`}
      >
        <p className="ks-caption text-paper" style={{ fontSize: "1.5rem", textShadow: "0 2px 10px rgb(0 0 0 / 0.7)", opacity: 0.92 }}>
          “{note.message}” — {note.author}
        </p>
      </button>
    );
  }

  if (kind === "kettle") {
    return (
      <div className="pointer-events-none absolute left-[22%] bottom-[22%] z-20" aria-hidden="true">
        <span className="ks-steam" />
        <span className="ks-steam" style={{ animationDelay: "0.7s", left: 8 }} />
        <span className="ks-steam" style={{ animationDelay: "1.3s", left: 16 }} />
      </div>
    );
  }

  if (kind === "pressed-flower") {
    return (
      <Hotspot label="A pressed flower on the desk" style={{ left: "34%", bottom: "12%", width: "7%", height: "10%" }} onClick={() => setKind(null)}>
        <div className="flex h-full w-full items-center justify-center" style={{ transform: "rotate(12deg)" }}>
          <Flower2 size={22} className="text-[#c45b6a]" />
        </div>
        <span className="ks-obj-label">pressed, still</span>
      </Hotspot>
    );
  }

  if (kind === "tea-ring") {
    return (
      <div
        className="pointer-events-none absolute z-10"
        style={{ left: "56%", bottom: "18%", width: 54, height: 54 }}
        aria-hidden="true"
      >
        <span className="ks-tea-ring" />
      </div>
    );
  }

  if (kind === "window-draft") {
    return (
      <div className="pointer-events-none absolute left-[8%] top-[12%] z-20 h-[42%] w-[26%] overflow-hidden" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="ks-mote" style={{ left: `${(i * 13) % 100}%`, animationDuration: "3.2s", animationDelay: `${-i * 0.4}s` }} />
        ))}
      </div>
    );
  }

  if (kind === "night-moth") {
    return (
      <div className="ks-moth pointer-events-none absolute z-20" aria-hidden="true" />
    );
  }

  const text = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return (
    <>
      <Hotspot label="A letter on the desk" style={{ left: "58%", bottom: "20%", width: "8%", height: "9%" }} onClick={() => setOpen(true)}>
        <div className="flex h-full w-full items-center justify-center rounded-sm bg-[#efe3cf] text-[#7a3d3a]" style={{ boxShadow: "0 6px 14px rgb(0 0 0/.4)", transform: "rotate(-6deg)" }}>
          <Mail size={18} />
        </div>
        <span className="ks-obj-label">a letter…</span>
      </Hotspot>
      {open && (
        <LetterDialog
          text={text}
          onClose={() => {
            setOpen(false);
            setKind(null);
          }}
        />
      )}
    </>
  );
}

function Hotspot({
  label,
  style,
  onClick,
  children,
}: {
  label: string;
  style: React.CSSProperties;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className="ks-obj" style={style} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}

function LetterDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        className="ks-panel relative max-w-sm p-6"
        role="dialog"
        aria-modal="true"
        aria-label="A letter"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute right-3 top-3 text-paper/50" onClick={onClose} aria-label="Close letter">
          <X size={16} />
        </button>
        <Mail size={22} className="mb-3 text-accent" />
        <p className="ks-caption text-paper" style={{ fontSize: "1.5rem", lineHeight: 1.3 }}>
          {text}
        </p>
      </div>
    </div>
  );
}

function Banner({ children, icon, onClose }: { children: React.ReactNode; icon: React.ReactNode; onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute bottom-16 left-1/2 z-30 -translate-x-1/2" role="status">
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

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { ACHIEVEMENTS } from "../../types/app";

/**
 * A quiet, non-blocking toast for newly found keepsakes — environmental
 * storytelling over a modal (Bible §21). Auto-dismisses.
 */
export function AchievementsToast({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  useEffect(() => {
    if (ids.length === 0) return;
    const t = window.setTimeout(onDone, 3600);
    return () => window.clearTimeout(t);
  }, [ids, onDone]);

  if (ids.length === 0) return null;
  const latest = ACHIEVEMENTS.find((a) => a.id === ids[ids.length - 1]);
  if (!latest) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="ks-panel flex items-center gap-3 px-4 py-3">
        <Sparkles size={18} className="text-accent" />
        <div>
          <p className="text-sm text-paper/60">a keepsake found</p>
          <p className="font-display text-paper">{latest.title}</p>
        </div>
      </div>
    </div>
  );
}

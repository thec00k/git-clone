import { Check, CloudOff, Loader2 } from "lucide-react";
import type { SaveStatus } from "../types/scrapbook";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-paper/60">
        <Loader2 size={14} className="animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-accent">
        <CloudOff size={14} /> Not saved
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-paper/60">
        <Check size={14} /> Saved
      </span>
    );
  }
  return null;
}

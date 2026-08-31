import type { ViewAs } from "../types/app";
import type { Visibility } from "../types/scrapbook";

/**
 * Local, UI-level privacy preview. The owner sees everything; visitors see a
 * book only if its visibility allows their relationship. NOTE: this is a
 * client-side preview only — real enforcement must happen server-side once a
 * backend exists (Bible §17). Documented in the work log.
 */
export function canSee(visibility: Visibility, viewAs: ViewAs): boolean {
  if (viewAs === "owner") return true;
  if (visibility === "public") return true;
  if (visibility === "friends") return viewAs === "friend" || viewAs === "close";
  return false;
}

export const VIEW_AS_LABEL: Record<ViewAs, string> = {
  owner: "You",
  close: "Close friend",
  friend: "Friend",
  public: "Public",
};

/** Friends and close friends (and the owner) may leave a fridge sticky. */
export function canLeavePinNote(viewAs: ViewAs): boolean {
  return viewAs === "owner" || viewAs === "friend" || viewAs === "close";
}

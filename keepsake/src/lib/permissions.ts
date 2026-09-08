import type { ViewAs } from "../types/app";
import type { Visibility } from "../types/scrapbook";

/**
 * Local, UI-level privacy preview. The owner sees everything; visitors see a
 * book only if its visibility allows their relationship. NOTE: this is a
 * client-side preview only — real enforcement must happen server-side once a
 * backend exists (Bible §17). Documented in the work log.
 */
export function canSee(visibility: Visibility, viewAs: ViewAs, allowFriendScrapbooks = true): boolean {
  if (viewAs === "owner") return true;
  if ((viewAs === "friend" || viewAs === "close") && !allowFriendScrapbooks) return false;
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

export function canLeaveBookNote(visibility: Visibility, viewAs: ViewAs, allowed: boolean): boolean {
  return allowed && (viewAs === "friend" || viewAs === "close") && canSee(visibility,viewAs,allowed);
}

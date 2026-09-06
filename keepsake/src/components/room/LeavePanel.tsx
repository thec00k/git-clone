import { useRef, useState } from "react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { logout as spotifyLogout } from "../../lib/spotify";

/** The door: leave the room as it is, tidy it, preview as a visitor, or close up. */
export function LeavePanel({ onClose }: { onClose: () => void }) {
  const { flushSave, tidyRoom, saveStatus, recordProgress } = useApp();
  const { setViewAs } = useNav();
  const panelRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);
  useFocusTrap(panelRef, onClose);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        className="ks-panel w-full max-w-md p-5"
        role="dialog"
        aria-modal="true"
        aria-label="The door"
        data-leave-panel
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-display text-xl">The door</h2>
        <p className="mb-4 text-sm text-paper/60">
          Opposite the window. You can step out, leave the room as it is, or tidy it before you go.
        </p>

        <button
          type="button"
          className="ks-tool mt-1 w-full justify-center"
          data-leave-friends
          onClick={() => {
            setViewAs("friend");
            recordProgress({ previewedAsVisitor: true });
            setNote("Friends' rooms are not through this door yet. You are previewing your own room as a friend would see it.");
          }}
        >
          Visit friends
        </button>
        <button
          type="button"
          className="ks-tool mt-2 w-full justify-center"
          data-leave-save
          onClick={() => {
            void flushSave().then(() => {
              setNote("The room will wait. Clutter, books, and light are kept as they are.");
            });
          }}
        >
          Leave it as it is
        </button>
        <button
          type="button"
          className="ks-tool mt-2 w-full justify-center"
          data-leave-tidy
          onClick={() => {
            tidyRoom();
            void flushSave();
            setNote("Tidied. Hour, weather, lamp, fan, and shelf lights are back to their usual quiet. Your books and photographs stayed.");
          }}
        >
          Tidy up
        </button>
        <button
          type="button"
          className="ks-tool mt-2 w-full justify-center"
          data-leave-logout
          onClick={() => {
            spotifyLogout();
            setViewAs("owner");
            void flushSave();
            setNote("There is no account on this door yet. Spotify is closed if it was open. The room stays on this machine.");
          }}
        >
          Log out
        </button>

        {note && (
          <p className="mt-4 text-sm text-paper/75" data-leave-note>
            {note}
            {saveStatus === "saving" ? " Saving…" : saveStatus === "saved" ? " Saved." : ""}
          </p>
        )}

        <button type="button" className="ks-tool ks-tool--accent mt-4 w-full justify-center" onClick={onClose}>
          Stay in the room
        </button>
      </div>
    </div>
  );
}

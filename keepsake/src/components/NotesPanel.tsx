import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { useApp } from "../store/appStore";
import { useNav } from "../store/nav";
import { VIEW_AS_LABEL } from "../lib/permissions";

/*
 * Page-linked notes (Bible §19): trusted visitors may leave a short note on a
 * page; the owner approves before it can surface as a "whisper" in the room.
 * Flat and physically limited — no threads or counters.
 */
export function NotesPanel({
  bookId,
  pageIds,
  onClose,
}: {
  bookId: string;
  pageIds: string[];
  onClose: () => void;
}) {
  const { state, addNote, approveNote, deleteNote } = useApp();
  const { viewAs, isVisitor } = useNav();
  const [message, setMessage] = useState("");

  const notes = state.notes.filter((n) => n.bookId === bookId && pageIds.includes(n.pageId));
  const visible = isVisitor ? notes.filter((n) => n.approved) : notes;

  const leave = () => {
    if (!message.trim() || pageIds.length === 0) return;
    addNote(bookId, pageIds[0], VIEW_AS_LABEL[viewAs], message.trim());
    setMessage("");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="ks-panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">Notes on this spread</h2>
          <button className="text-paper/50" onClick={onClose}><X size={18} /></button>
        </div>

        {isVisitor && (
          <div className="mb-4 flex gap-2">
            <input
              className="flex-1 rounded bg-black/25 px-3 py-2 text-paper outline-none"
              placeholder="leave a kind note…"
              maxLength={140}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && leave()}
            />
            <button className="ks-tool ks-tool--accent" onClick={leave}>Leave</button>
          </div>
        )}

        <ul className="space-y-2">
          {visible.length === 0 && <p className="text-paper/50">No notes here yet.</p>}
          {visible.map((n) => (
            <li key={n.id} className="rounded-lg bg-black/20 p-3">
              <p className="ks-caption text-paper" style={{ fontSize: "1.25rem" }}>{n.message}</p>
              <div className="mt-1 flex items-center justify-between text-sm text-paper/50">
                <span>
                  — {n.author}
                  {!n.approved && <span className="ml-2 text-accent">· awaiting approval</span>}
                </span>
                {!isVisitor && (
                  <span className="flex gap-1">
                    {!n.approved && (
                      <button className="ks-chip h-7 w-7" title="Approve" onClick={() => approveNote(n.id)}>
                        <Check size={14} />
                      </button>
                    )}
                    <button className="ks-chip h-7 w-7 hover:!bg-seal" title="Remove" onClick={() => deleteNote(n.id)}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {isVisitor && (
          <p className="mt-3 text-xs text-paper/40">
            Your note waits for {state.profile.displayName} to approve it before it can be seen.
          </p>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { useApp } from "../store/appStore";
import { useNav } from "../store/nav";
import {STICKY_NOTE_MAX} from "../types/app";
import { canLeaveBookNote, VIEW_AS_LABEL } from "../lib/permissions";

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

  const book=state.books.find(b=>b.id===bookId);
  const canLeave=!!book&&canLeaveBookNote(book.visibility,viewAs,state.profile.allowFriendScrapbooks===true);
  const notes = state.notes.filter((n) => n.bookId === bookId && pageIds.includes(n.pageId));
  // Visitors see approved notes, plus their own (so a pending note doesn't seem to vanish).
  const visible = isVisitor
    ? notes.filter((n) => n.approved || n.author === VIEW_AS_LABEL[viewAs])
    : notes;

  const leave = () => {
    if (!canLeave || !message.trim() || Array.from(message.trim()).length>STICKY_NOTE_MAX || pageIds.length === 0) return;
    addNote(bookId, pageIds[0], VIEW_AS_LABEL[viewAs], message.trim(), viewAs);
    setMessage("");
  };

  return (
    <aside id="ks-spread-notes" className="ks-spread-notes" aria-label="Sticky notes on this spread">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">Sticky notes</h2>
          <button className="text-paper/50" onClick={onClose} aria-label="Hide sticky notes"><X size={18} /></button>
        </div>

        {canLeave && (
          <div className="mb-4 flex gap-2">
            <input
              name="note"
              aria-label="Leave a note"
              className="flex-1 rounded bg-black/25 px-3 py-2 text-paper outline-none"
              placeholder="leave a kind note…"
              aria-describedby="ks-note-limit"
              value={message}
              onChange={(e) => setMessage(Array.from(e.target.value).slice(0,STICKY_NOTE_MAX).join(""))}
              onKeyDown={(e) => e.key === "Enter" && leave()}
            />
            <button className="ks-tool ks-tool--accent" disabled={!message.trim()} onClick={leave}>Leave</button>
          </div>
        )}

        {canLeave&&<p id="ks-note-limit" className="text-xs mb-3" aria-live="polite">{Array.from(message).length}/{STICKY_NOTE_MAX} characters</p>}
        <ul className="space-y-2">
          {visible.length === 0 && <p className="text-paper/50">No notes here yet.</p>}
          {visible.map((n) => (
            <li key={n.id} className="ks-friend-sticky"><span className="ks-sticky-page">{pageIds.indexOf(n.pageId)===0?'Left page':'Right page'}</span>
              <p className="ks-caption" style={{ fontSize: "1.25rem" }}>{n.message}</p>
              <div className="mt-1 flex items-center justify-between text-sm text-paper/50">
                <span>
                  — {n.author}
                  {!n.approved && <span className="ml-2 text-accent">· awaiting approval</span>}
                </span>
                {!isVisitor && (
                  <span className="flex gap-1">
                    {!n.approved && (
                      <button className="ks-chip h-7 w-7" title="Approve" aria-label={`Approve note from ${n.author}`} onClick={() => approveNote(n.id)}>
                        <Check size={14} />
                      </button>
                    )}
                    <button className="ks-chip h-7 w-7 hover:!bg-seal" title="Remove" aria-label={`Remove note from ${n.author}`} onClick={() => deleteNote(n.id)}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {canLeave && (
          <p className="mt-3 text-xs text-paper/40">
            Your note waits for {state.profile.displayName} to approve it before it can be seen.
          </p>
        )}
    </aside>
  );
}

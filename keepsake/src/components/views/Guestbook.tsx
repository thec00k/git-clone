import { useState } from "react";
import { PenLine } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { VIEW_AS_LABEL } from "../../lib/permissions";
import { ViewShell } from "./ViewShell";

export function Guestbook() {
  const { state, addGuestEntry } = useApp();
  const { viewAs } = useNav();
  const [author, setAuthor] = useState(viewAs === "owner" ? state.profile.displayName : VIEW_AS_LABEL[viewAs]);
  const [message, setMessage] = useState("");
  const [deskCopy,setDeskCopy]=useState(false);const [signed,setSigned]=useState(false);

  const sign = () => {
    if (!message.trim()) return;
    addGuestEntry(author.trim() || "A friend", message.trim(),deskCopy);
    setSigned(true);
    setMessage("");
  };

  return (
    <ViewShell title="The guest book" subtitle="a quiet hello, no comment threads">
      <div className="ks-panel mt-3 p-3">
        <div className="flex flex-wrap gap-2">
          <input
            name="author"
            aria-label="Your name"
            className="w-40 rounded bg-black/25 px-3 py-2 text-paper outline-none"
            placeholder="your name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <input
            name="message"
            aria-label="Guest book note"
            className="min-w-[12rem] flex-1 rounded bg-black/25 px-3 py-2 text-paper outline-none"
            placeholder="leave a note…"
            value={message}
            maxLength={160}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sign()}
          />
          <button className="ks-tool ks-tool--accent" onClick={sign}>
            <PenLine size={16} /> Sign
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={deskCopy} onChange={e=>setDeskCopy(e.target.checked)}/> Leave a copy on the desk</label>
        <p className="mt-2 text-sm opacity-60">A little surprise for a later visit, if the room owner allows desk notes.</p>
        {signed&&<p role="status" className="mt-2 text-sm">Your message is in the guestbook{deskCopy?' and a desk copy has been requested':''}.</p>}
      </div>

      <ul className="mt-5 space-y-3">
        {state.guestbook.map((g) => (
          <li key={g.id} className="ks-panel p-4">
            <p className="ks-caption text-paper" style={{ fontSize: "1.4rem" }}>{g.message}</p>
            <p className="mt-1 text-sm text-paper/50">
              — {g.author} · {new Date(g.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
        {state.guestbook.length === 0 && <p className="text-paper/50">No one has signed yet.</p>}
      </ul>
    </ViewShell>
  );
}

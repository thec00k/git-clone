import { useState } from "react";
import { Eye, Globe, Lock, Plus, Trash2, Users } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useNav } from "../../store/nav";
import { canSee } from "../../lib/permissions";
import { COVER_STYLES } from "../../types/scrapbook";
import type { Visibility } from "../../types/scrapbook";
import { ViewShell } from "./ViewShell";
import { BookIdentityEditor } from "../BookIdentityEditor";

const VIS: { key: Visibility; icon: typeof Lock; label: string }[] = [
  { key: "private", icon: Lock, label: "Private" },
  { key: "friends", icon: Users, label: "Friends" },
  { key: "public", icon: Globe, label: "Public" },
];

export function Shelf() {
  const { state, setActiveBook, addBook, renameBook, deleteBook, setBookCover, setBookVisibility } = useApp();
  const { go, viewAs, isVisitor } = useNav();
  const [editing, setEditing] = useState<string | null>(null);

  const books = state.books.filter((b) => canSee(b.visibility, viewAs));

  return (
    <ViewShell
      title="The bookshelf"
      subtitle={isVisitor ? "books shared with you" : "your library"}
      actions={
        !isVisitor && (
          <button className="ks-tool ks-tool--accent" onClick={() => { addBook(); }}>
            <Plus size={16} /> New book
          </button>
        )
      }
    >
      {books.length === 0 && (
        <p className="mt-10 text-center text-paper/60">No books to show here.</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {books.map((b) => {
          const cover = COVER_STYLES[b.coverStyle];
          const photos = b.pages.reduce((n, p) => n + p.elements.filter((e) => e.type === "photo").length, 0);
          return (
            <div key={b.id} className="ks-panel overflow-hidden">
              <button
                className="block w-full text-left"
                onClick={() => {
                  setActiveBook(b.id);
                  go("book");
                }}
              >
                <div
                  className="flex aspect-[3/4] flex-col items-center justify-center p-3 text-center"
                  style={{
                    background: `linear-gradient(90deg, rgb(0 0 0 /.35), transparent 14%), url('/textures/leather.jpg') center/cover`,
                    backgroundColor: cover.leather,
                    color: cover.ink,
                  }}
                >
                  <span className="text-[0.55rem] uppercase tracking-[0.2em] opacity-70">a book of</span>
                  <span className="font-display text-lg font-semibold leading-tight">{b.title}</span>
                  <span className="ks-caption" style={{ fontSize: "1rem" }}>{b.subtitle}</span>
                </div>
              </button>
              <div className="flex items-center justify-between px-3 py-2 text-sm text-paper/60">
                <span>{photos} photos</span>
                <span className="flex items-center gap-1">
                  {(() => {
                    const V = VIS.find((v) => v.key === b.visibility)!;
                    return <><V.icon size={13} /> {V.label}</>;
                  })()}
                </span>
              </div>

              {!isVisitor && (
                <div className="border-t border-white/5 px-3 py-2">
                  <button
                    className="mb-2 flex items-center gap-1 text-sm text-paper/60 hover:text-paper"
                    onClick={() => setEditing(editing === b.id ? null : b.id)}
                  >
                    <Eye size={13} /> Edit
                  </button>
                  {editing === b.id && (
                    <div className="space-y-2">
                      <BookIdentityEditor
                        title={b.title}
                        subtitle={b.subtitle}
                        coverStyle={b.coverStyle}
                        onTitle={(t) => renameBook(b.id, t, b.subtitle)}
                        onSubtitle={(s) => renameBook(b.id, b.title, s)}
                        onCover={(c) => setBookCover(b.id, c)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {VIS.map((v) => (
                          <button
                            key={v.key}
                            className={`ks-tool ${b.visibility === v.key ? "ks-tool--accent" : ""}`}
                            onClick={() => setBookVisibility(b.id, v.key)}
                          >
                            <v.icon size={13} /> {v.label}
                          </button>
                        ))}
                      </div>
                      {state.books.length > 1 && (
                        <button
                          className="ks-tool hover:!bg-seal"
                          onClick={() => deleteBook(b.id)}
                        >
                          <Trash2 size={14} /> Delete book
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ViewShell>
  );
}

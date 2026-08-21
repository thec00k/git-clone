import { BookOpen, PencilLine } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  onOpenAlbum: () => void;
  onCraft: () => void;
}

/**
 * The cover screen: a closed leather book resting on the desk. This is the
 * scrapbook-first entry point — the book is the hero, matching the Bible's
 * "opening a real scrapbook" north star.
 */
export function BookCover({ title, subtitle, onOpenAlbum, onCraft }: Props) {
  return (
    <div className="ks-desk relative flex flex-1 flex-col items-center justify-center gap-10 p-6">
      <button className="ks-book" onClick={onOpenAlbum} aria-label={`Open ${title}`}>
        <div className="ks-book-cover">
          <p
            className="uppercase text-paper/60"
            style={{ fontSize: "0.75rem", letterSpacing: "0.28em" }}
          >
            a book of
          </p>
          <h1
            className="my-2"
            style={{ fontFamily: "var(--font-display)", fontSize: "2.6rem", fontWeight: 600 }}
          >
            {title}
          </h1>
          <p className="ks-caption text-paper/80" style={{ fontSize: "1.6rem" }}>
            {subtitle}
          </p>
        </div>
        <span className="ks-book-edge" />
      </button>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button className="ks-tool ks-tool--accent" onClick={onOpenAlbum}>
          <BookOpen size={18} /> Open album
        </button>
        <button className="ks-tool" onClick={onCraft}>
          <PencilLine size={18} /> Craft a page
        </button>
      </div>
    </div>
  );
}

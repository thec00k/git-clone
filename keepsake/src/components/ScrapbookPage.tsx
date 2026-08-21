import type { Page } from "../types/scrapbook";
import { ElementView } from "./ElementView";

interface Props {
  page: Page | null;
  active: boolean;
  bookTitle: string;
  bookSubtitle: string;
  selectedId: string | null;
  onActivate: (pageId: string) => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onEditText: (id: string, text: string) => void;
}

export function ScrapbookPage({
  page,
  active,
  bookTitle,
  bookSubtitle,
  selectedId,
  onActivate,
  onSelect,
  onDeselect,
  onMove,
  onEditText,
}: Props) {
  if (!page) {
    // Empty right-hand leaf (odd page count) — a blank paper edge.
    return <div className="ks-page opacity-70" aria-hidden="true" />;
  }

  const sorted = [...page.elements].sort((a, b) => a.z - b.z);

  // Selecting an element also makes its page the active one, so "Add photo",
  // "Add caption", and "Arrange" all target the page the user is working on.
  const handleSelect = (id: string) => {
    onActivate(page.id);
    onSelect(id);
  };

  return (
    <div
      className="ks-page"
      data-active={active}
      onPointerDown={() => {
        onActivate(page.id);
        onDeselect();
      }}
    >
      {page.titlePage && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center">
          <p className="ks-caption text-ink-soft" style={{ fontSize: "5cqw" }}>
            a book of
          </p>
          <h2
            className="text-ink"
            style={{ fontFamily: "var(--font-display)", fontSize: "13cqw", fontWeight: 600, margin: "1cqw 0" }}
          >
            {bookTitle}
          </h2>
          <p className="ks-caption text-ink-soft" style={{ fontSize: "7cqw" }}>
            {bookSubtitle}
          </p>
          <span
            className="mt-[6cqw] inline-block"
            style={{ width: "22cqw", height: "2px", background: "var(--color-accent)", opacity: 0.6 }}
          />
        </div>
      )}

      {sorted.map((el) => (
        <ElementView
          key={el.id}
          element={el}
          selected={selectedId === el.id}
          onSelect={handleSelect}
          onMove={onMove}
          onEditText={onEditText}
        />
      ))}

      {!page.titlePage && page.elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="ks-caption text-ink-soft/70" style={{ fontSize: "6cqw" }}>
            add a photograph…
          </p>
        </div>
      )}
    </div>
  );
}

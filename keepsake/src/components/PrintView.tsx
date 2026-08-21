import { Printer, X } from "lucide-react";
import type { Scrapbook } from "../types/scrapbook";
import { ScrapbookPage } from "./ScrapbookPage";
import { useEscapeClose } from "../hooks/useEscapeClose";

const noop = () => {};

/**
 * A print-ready export of a book (Bible §25, software half). Each page prints
 * on its own sheet; "Save as PDF" in the browser's print dialog produces a
 * shareable/printable keepsake. A real print-on-demand pipeline (bleed, trim,
 * resolution checks) is a later, vendor-dependent step — noted in the docs.
 */
export function PrintView({ book, onClose }: { book: Scrapbook; onClose: () => void }) {
  useEscapeClose(onClose);
  return (
    <div className="ks-print fixed inset-0 z-50 overflow-y-auto bg-[#1a1510]/95 p-4" role="dialog" aria-modal="true" aria-label={`Export ${book.title}`}>
      <div className="ks-no-print sticky top-0 z-10 mx-auto mb-4 flex max-w-[520px] items-center justify-between rounded-full bg-[rgb(28_22_16/0.95)] px-3 py-2">
        <span className="px-2 font-display text-paper">Export &ldquo;{book.title}&rdquo;</span>
        <div className="flex gap-2">
          <button className="ks-tool ks-tool--accent" onClick={() => window.print()}>
            <Printer size={16} /> Print / Save as PDF
          </button>
          <button className="ks-chip" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-6">
        {book.pages.map((page) => (
          <div key={page.id} className="ks-print-page w-full" style={{ maxWidth: 480 }}>
            <ScrapbookPage
              page={page}
              active={false}
              bookTitle={book.title}
              bookSubtitle={book.subtitle}
              selectedId={null}
              onActivate={noop}
              onSelect={noop}
              onDeselect={noop}
              onMove={noop}
              onTransform={noop}
              onEditText={noop}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

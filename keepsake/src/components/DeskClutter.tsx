import { MARKER_INKS } from "../types/scrapbook";

/** Desk props around the open scrapbook. Printer, camera, and markers are usable. */
export function DeskClutter({
  onPrint,
  onSnap,
  ink,
  onPickInk,
}: {
  onPrint: () => void;
  onSnap: () => void;
  ink?: string | null;
  onPickInk?: (color: string | null) => void;
}) {
  return (
    <div className="ks-clutter" aria-hidden={false}>
      <div className="ks-clutter-markers" role="group" aria-label="Markers">
        {(Object.entries(MARKER_INKS) as [keyof typeof MARKER_INKS, string][]).map(([name, color]) => {
          const selected = ink === color;
          return (
            <button
              key={name}
              type="button"
              className={`ks-marker${selected ? " is-selected" : ""}`}
              data-ink={name}
              data-desk-marker
              aria-label={`${selected ? "Put down" : "Draw with"} the ${name} marker`}
              aria-pressed={selected}
              onClick={() => onPickInk?.(selected ? null : color)}
            />
          );
        })}
      </div>

      <button
        type="button"
        className="ks-mini-printer"
        data-desk-printer
        aria-label="Print this book from the mini photo printer"
        title="Print this book"
        onClick={onPrint}
      >
        <span className="ks-mini-printer-body">
          <span className="ks-mini-printer-slot" />
          <span className="ks-mini-printer-print" />
          <span className="ks-mini-printer-lens" />
        </span>
        <span className="ks-clutter-label">mini printer</span>
      </button>

      <button
        type="button"
        className="ks-disposable"
        data-desk-camera
        aria-label="Add a photo with the disposable camera"
        title="Add a photo"
        onClick={onSnap}
      >
        <span className="ks-disposable-body">
          <span className="ks-disposable-flash" />
          <span className="ks-disposable-lens" />
          <span className="ks-disposable-wheel" />
        </span>
        <span className="ks-clutter-label">disposable</span>
      </button>
    </div>
  );
}

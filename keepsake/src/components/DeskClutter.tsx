/** Decorative desk props around the open scrapbook. Printer and camera are usable. */
export function DeskClutter({
  onPrint,
  onSnap,
}: {
  onPrint: () => void;
  onSnap: () => void;
}) {
  return (
    <div className="ks-clutter" aria-hidden={false}>
      <div className="ks-clutter-markers" aria-hidden="true">
        <span className="ks-marker" data-ink="terracotta" />
        <span className="ks-marker" data-ink="ink" />
        <span className="ks-marker" data-ink="moss" />
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

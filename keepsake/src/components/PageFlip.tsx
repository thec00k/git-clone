import { useEffect } from "react";
import type { Page } from "../types/scrapbook";
import { ScrapbookPage } from "./ScrapbookPage";

const noop = () => {};

function StaticPage({
  page,
  bookTitle,
  bookSubtitle,
}: {
  page: Page | null;
  bookTitle: string;
  bookSubtitle: string;
}) {
  return (
    <ScrapbookPage
      page={page}
      active={false}
      bookTitle={bookTitle}
      bookSubtitle={bookSubtitle}
      selectedId={null}
      onActivate={noop}
      onSelect={noop}
      onDeselect={noop}
      onMove={noop}
      onTransform={noop}
      onEditText={noop}
    />
  );
}

interface Props {
  dir: "next" | "prev";
  curL: Page | null;
  curR: Page | null;
  otherL: Page | null;
  otherR: Page | null;
  bookTitle: string;
  bookSubtitle: string;
  onDone: () => void;
}

/**
 * A tactile directional page turn (Bible §7). One leaf rotates around the
 * spine, revealing the next/previous spread. Idle editing uses the normal
 * <Spread>; this overlay is only mounted while a turn is in progress.
 */
export function PageFlip({
  dir,
  curL,
  curR,
  otherL,
  otherR,
  bookTitle,
  bookSubtitle,
  onDone,
}: Props) {
  useEffect(() => {
    // Fallback in case animationend does not fire.
    const timer = window.setTimeout(onDone, 1000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const underL = dir === "next" ? curL : otherL;
  const underR = dir === "next" ? otherR : curR;
  const frontPage = dir === "next" ? curR : curL;
  const backPage = dir === "next" ? otherL : otherR;

  const shared = { bookTitle, bookSubtitle };

  return (
    <div className="ks-stage">
      <div className="ks-spread ks-spread--flipping">
        <StaticPage page={underL} {...shared} />
        <StaticPage page={underR} {...shared} />

        <div className={`ks-flip-leaf ${dir}`}>
          <div
            className={`ks-flip-inner ${dir}`}
            onAnimationEnd={onDone}
          >
            <div className="ks-flip-face front">
              <StaticPage page={frontPage} {...shared} />
            </div>
            <div className="ks-flip-face back">
              <StaticPage page={backPage} {...shared} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

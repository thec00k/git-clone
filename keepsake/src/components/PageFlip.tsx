import {useEffect, useMemo, useRef, useState} from 'react';
import {usePhysicalPageTurn} from '../store/pageTurn';
import {peekSnapshot, rememberSnapshot, snapshotPage} from '../lib/pageSnapshot';
import type {Page} from '../types/scrapbook';
import {ScrapbookPage} from './ScrapbookPage';

const noop = () => {};
const snapshotKey = (bookTitle: string, bookSubtitle: string) => `${bookTitle}\n${bookSubtitle}`;
/** How long the book must sit unchanged before its neighbouring pages are photographed in the background. */
const PREFETCH_DELAY_MS = 1500;

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
  dir: 'next' | 'prev';
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
export function PageFlip({dir, curL, curR, otherL, otherR, bookTitle, bookSubtitle, onDone}: Props) {
  const physical = usePhysicalPageTurn();
  const frontRef = useRef<HTMLDivElement>(null),
    backRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const frontPage = dir === 'next' ? curR : curL;
  const backPage = dir === 'next' ? otherL : otherR;
  // Pictures taken ahead of time (see SnapshotPrefetch) let the turn start at once.
  const key = snapshotKey(bookTitle, bookSubtitle);
  const prepared = useMemo(
    () => (frontPage && backPage ? [peekSnapshot(frontPage, key), peekSnapshot(backPage, key)] : null),
    [frontPage, backPage, key],
  );
  const [ready, setReady] = useState(() => !!prepared?.[0] && !!prepared[1]);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    if (physical && !fallback) return;
    // Fallback in case animationend does not fire.
    const timer = window.setTimeout(onDone, 1000);
    return () => window.clearTimeout(timer);
  }, [onDone, physical, fallback]);
  useEffect(() => {
    if (!physical) return;
    if (prepared?.[0] && prepared[1]) {
      physical.start({direction: dir, front: prepared[0], back: prepared[1], done: () => done.current()});
      return () => physical.cancel();
    }
    if (!frontRef.current || !backRef.current) return;
    let live = true;
    const controller = new AbortController();
    Promise.all([
      snapshotPage(frontRef.current.firstElementChild as HTMLElement, controller.signal),
      snapshotPage(backRef.current.firstElementChild as HTMLElement, controller.signal),
    ])
      .then(([front, back]) => {
        if (live) {
          if (frontPage) rememberSnapshot(frontPage, key, front);
          if (backPage) rememberSnapshot(backPage, key, back);
          physical.start({direction: dir, front, back, done: () => done.current()});
          setReady(true);
        }
      })
      .catch(error => {
        if (live) {
          console.warn('Physical page snapshot unavailable:', error);
          setFallback(true);
        }
      });
    return () => {
      live = false;
      controller.abort();
      physical.cancel();
    };
  }, [physical, dir, prepared, frontPage, backPage, key]);

  // While the pictures are being taken nothing is turning yet, so the spread on screen must stay the current one.
  const waiting = !!physical && !fallback && !ready;
  const underL = dir === 'next' ? curL : waiting ? curL : otherL;
  const underR = dir === 'next' ? (waiting ? curR : otherR) : curR;

  const shared = {bookTitle, bookSubtitle};

  return (
    <div
      className="ks-stage"
      data-page-animation={physical ? (fallback ? 'fallback' : ready ? 'physical' : 'preparing') : 'flat'}
    >
      <div className="ks-spread ks-spread--flipping">
        <StaticPage page={underL} {...shared} />
        <StaticPage page={underR} {...shared} />

        {(!physical || fallback) && (
          <div className={`ks-flip-leaf ${dir}`}>
            <div className={`ks-flip-inner ${dir}`} onAnimationEnd={onDone}>
              <div className="ks-flip-face front">
                <StaticPage page={frontPage} {...shared} />
              </div>
              <div className="ks-flip-face back">
                <StaticPage page={backPage} {...shared} />
              </div>
            </div>
          </div>
        )}
        {physical && !fallback && (
          <>
            {!ready && (
              <div className={`ks-page-waiting ${dir}`}>
                <StaticPage page={frontPage} {...shared} />
              </div>
            )}
            <div className="ks-page-capture" aria-hidden="true" inert>
              <div ref={frontRef}>
                <StaticPage page={frontPage} {...shared} />
              </div>
              <div ref={backRef}>
                <StaticPage page={backPage} {...shared} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Photographs the pages the next and previous turns will need while the reader is not touching the book, so a turn
 * starts at once instead of waiting for two fresh pictures (clone, paint, encode) on every click. Any change to the
 * book, or starting a turn, cancels the work in progress.
 */
export function SnapshotPrefetch({
  nextFront,
  nextBack,
  prevFront,
  prevBack,
  bookTitle,
  bookSubtitle,
}: {
  nextFront: Page | null;
  nextBack: Page | null;
  prevFront: Page | null;
  prevBack: Page | null;
  bookTitle: string;
  bookSubtitle: string;
}) {
  const physical = usePhysicalPageTurn();
  const host = useRef<HTMLDivElement>(null);
  const key = snapshotKey(bookTitle, bookSubtitle);
  // Next turn first; a page shared by both turns is photographed once.
  const wanted = useMemo(
    () =>
      [nextFront, nextBack, prevFront, prevBack].filter(
        (page, i, all): page is Page => !!page && all.indexOf(page) === i,
      ),
    [nextFront, nextBack, prevFront, prevBack],
  );
  useEffect(() => {
    if (!physical) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      for (const [index, page] of wanted.entries()) {
        if (controller.signal.aborted) return;
        if (peekSnapshot(page, key)) continue;
        const node = host.current?.children[index]?.firstElementChild;
        if (!(node instanceof HTMLElement)) continue;
        try {
          const canvas = await snapshotPage(node, controller.signal);
          rememberSnapshot(page, key, canvas);
          physical.prepare?.(canvas);
        } catch {
          // Too slow this time (the first paper texture can take seconds): try the next page, not nothing.
          if (controller.signal.aborted) return;
        }
      }
    }, PREFETCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [physical, key, wanted]);
  if (!physical) return null;
  return (
    <div ref={host} className="ks-page-capture" aria-hidden="true" inert data-snapshot-prefetch="">
      {wanted.map(page => (
        <div key={page.id}>
          <StaticPage page={page} bookTitle={bookTitle} bookSubtitle={bookSubtitle} />
        </div>
      ))}
    </div>
  );
}

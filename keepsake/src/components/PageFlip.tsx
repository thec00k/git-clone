import { useEffect, useRef, useState } from "react";
import {usePhysicalPageTurn} from '../store/pageTurn';
import {snapshotPage} from '../lib/pageSnapshot';
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
  const physical=usePhysicalPageTurn();
  const frontRef=useRef<HTMLDivElement>(null),backRef=useRef<HTMLDivElement>(null);
  const done=useRef(onDone);done.current=onDone;
  const [ready,setReady]=useState(false);
  const [fallback,setFallback]=useState(false);
  useEffect(() => {
    if(physical&&!fallback)return;
    // Fallback in case animationend does not fire.
    const timer = window.setTimeout(onDone, 1000);
    return () => window.clearTimeout(timer);
  }, [onDone,physical,fallback]);
  useEffect(()=>{
    if(!physical||!frontRef.current||!backRef.current)return;
    let live=true;
    const controller=new AbortController();
    Promise.all([snapshotPage(frontRef.current.firstElementChild as HTMLElement,controller.signal),snapshotPage(backRef.current.firstElementChild as HTMLElement,controller.signal)])
      .then(([front,back])=>{if(live){physical.start({direction:dir,front,back,done:()=>done.current()});setReady(true);}})
      .catch(error=>{if(live){console.warn('Physical page snapshot unavailable:',error);setFallback(true);}});
    return()=>{live=false;controller.abort();physical.cancel();};
  },[physical,dir]);

  const underL = dir === "next" ? curL : otherL;
  const underR = dir === "next" ? otherR : curR;
  const frontPage = dir === "next" ? curR : curL;
  const backPage = dir === "next" ? otherL : otherR;

  const shared = { bookTitle, bookSubtitle };

  return (
    <div className="ks-stage" data-page-animation={physical?(fallback?'fallback':ready?'physical':'preparing'):'flat'}>
      <div className="ks-spread ks-spread--flipping">
        <StaticPage page={underL} {...shared} />
        <StaticPage page={underR} {...shared} />

        {(!physical||fallback)&&<div className={`ks-flip-leaf ${dir}`}>
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
        </div>}
        {physical&&!fallback&&<>
          {!ready&&<div className={`ks-page-waiting ${dir}`}><StaticPage page={frontPage} {...shared}/></div>}
          <div className="ks-page-capture" aria-hidden="true" inert><div ref={frontRef}><StaticPage page={frontPage} {...shared}/></div><div ref={backRef}><StaticPage page={backPage} {...shared}/></div></div>
        </>}
      </div>
    </div>
  );
}

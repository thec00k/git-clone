import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CaptionElement,
  PageElement,
  PhotoElement,
  PhotoFrame,
  Scrapbook,
  StickerElement,
} from "../types/scrapbook";
import { MAX_PHOTOS_PER_PAGE } from "../types/scrapbook";
import { uid } from "../lib/id";
import { clamp } from "../lib/clamp";
import { computeLayout, type LayoutPreset } from "../lib/layout";
import { useApp } from "../store/appStore";

export interface ElementLocation {
  pageId: string;
  element: PageElement;
}

/**
 * Editor hook for the active book. Book data lives in the app store; this hook
 * owns the transient editor UI state (current spread, selection, active page)
 * and exposes the mutation API the scrapbook editor uses.
 */
export function useScrapbook() {
  const { activeBook, updateActiveBook, saveStatus } = useApp();
  const book = activeBook;

  const [spread, setSpread] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const pages = book?.pages ?? [];
  const spreadCount = Math.max(1, Math.ceil(pages.length / 2));
  const currentSpread = clamp(spread, 0, spreadCount - 1);
  const leftPage = pages[currentSpread * 2] ?? null;
  const rightPage = pages[currentSpread * 2 + 1] ?? null;

  // Preload photos so page turns don't flash empty frames.
  useEffect(() => {
    if (!book) return;
    for (const page of book.pages) {
      for (const el of page.elements) {
        if (el.type === "photo") {
          const img = new Image();
          img.src = el.src;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  const locate = useCallback(
    (elementId: string): ElementLocation | null => {
      for (const page of pages) {
        const element = page.elements.find((e) => e.id === elementId);
        if (element) return { pageId: page.id, element };
      }
      return null;
    },
    [pages],
  );

  const mutatePageElements = useCallback(
    (pageId: string, fn: (els: PageElement[]) => PageElement[]) => {
      updateActiveBook((b) => ({
        ...b,
        pages: b.pages.map((p) => (p.id === pageId ? { ...p, elements: fn(p.elements) } : p)),
      }));
    },
    [updateActiveBook],
  );

  const nextZ = (els: PageElement[]) => els.reduce((max, e) => Math.max(max, e.z), 0) + 1;

  const updateElement = useCallback(
    (elementId: string, patch: Partial<PageElement>) => {
      const loc = locate(elementId);
      if (!loc) return;
      mutatePageElements(loc.pageId, (els) =>
        els.map((e) => (e.id === elementId ? ({ ...e, ...patch } as PageElement) : e)),
      );
    },
    [locate, mutatePageElements],
  );

  const addPhoto = useCallback(
    (pageId: string, src: string, photoId?: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const photoCount = page.elements.filter((e) => e.type === "photo").length;
      if (photoCount >= MAX_PHOTOS_PER_PAGE) return;
      const jitter = (photoCount % 3) * 6 - 6;
      const el: PhotoElement = {
        id: uid("el"),
        type: "photo",
        src,
        photoId,
        x: clamp(48 + jitter, 20, 80),
        y: clamp(42 + jitter, 20, 70),
        w: 46,
        rotation: (photoCount % 2 === 0 ? -1 : 1) * (3 + photoCount),
        z: nextZ(page.elements),
        frame: "polaroid",
      };
      mutatePageElements(pageId, (els) => [...els, el]);
      setSelectedId(el.id);
    },
    [pages, mutatePageElements],
  );

  const addCaption = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const el: CaptionElement = {
        id: uid("el"),
        type: "caption",
        text: "write something…",
        x: 50,
        y: 55,
        w: 60,
        rotation: -2,
        z: nextZ(page.elements),
        fontSize: 7,
        color: "#2c2418",
      };
      mutatePageElements(pageId, (els) => [...els, el]);
      setSelectedId(el.id);
    },
    [pages, mutatePageElements],
  );

  const addSticker = useCallback(
    (pageId: string, glyph: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const el: StickerElement = {
        id: uid("el"),
        type: "sticker",
        glyph,
        x: 50,
        y: 50,
        w: 22,
        rotation: (Math.random() * 20 - 10) | 0,
        z: nextZ(page.elements),
      };
      mutatePageElements(pageId, (els) => [...els, el]);
      setSelectedId(el.id);
    },
    [pages, mutatePageElements],
  );

  const removeElement = useCallback(
    (elementId: string) => {
      const loc = locate(elementId);
      if (!loc) return;
      mutatePageElements(loc.pageId, (els) => els.filter((e) => e.id !== elementId));
      setSelectedId((cur) => (cur === elementId ? null : cur));
    },
    [locate, mutatePageElements],
  );

  const bringForward = useCallback(
    (elementId: string) => {
      const loc = locate(elementId);
      if (!loc) return;
      const page = pages.find((p) => p.id === loc.pageId)!;
      updateElement(elementId, { z: nextZ(page.elements) });
    },
    [locate, pages, updateElement],
  );

  const sendBackward = useCallback(
    (elementId: string) => {
      const loc = locate(elementId);
      if (!loc) return;
      const page = pages.find((p) => p.id === loc.pageId)!;
      const minZ = page.elements.reduce((m, e) => Math.min(m, e.z), Infinity);
      updateElement(elementId, { z: (Number.isFinite(minZ) ? minZ : 1) - 1 });
    },
    [locate, pages, updateElement],
  );

  const rotateBy = useCallback(
    (elementId: string, deg: number) => {
      const loc = locate(elementId);
      if (loc) updateElement(elementId, { rotation: loc.element.rotation + deg });
    },
    [locate, updateElement],
  );

  const scaleBy = useCallback(
    (elementId: string, factor: number) => {
      const loc = locate(elementId);
      if (loc) updateElement(elementId, { w: clamp(loc.element.w * factor, 6, 96) });
    },
    [locate, updateElement],
  );

  const resetTransform = useCallback(
    (elementId: string) => updateElement(elementId, { rotation: 0 }),
    [updateElement],
  );

  const setFrame = useCallback(
    (elementId: string, frame: PhotoFrame) => updateElement(elementId, { frame }),
    [updateElement],
  );

  const cycleFrame = useCallback(
    (elementId: string) => {
      const loc = locate(elementId);
      if (!loc || loc.element.type !== "photo") return;
      const order: PhotoFrame[] = ["polaroid", "tape", "flush"];
      const idx = order.indexOf(loc.element.frame);
      setFrame(elementId, order[(idx + 1) % order.length]);
    },
    [locate, setFrame],
  );

  const arrangePage = useCallback(
    (pageId: string, preset: LayoutPreset) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const photoCount = page.elements.filter((e) => e.type === "photo").length;
      const placements = computeLayout(preset, photoCount);
      mutatePageElements(pageId, (els) => {
        let i = 0;
        return els.map((e) => {
          if (e.type !== "photo") return e;
          const p = placements[i++];
          return p ? { ...e, x: p.x, y: p.y, w: p.w, rotation: p.rot } : e;
        });
      });
    },
    [pages, mutatePageElements],
  );

  const addSpread = useCallback(() => {
    updateActiveBook((b) => ({
      ...b,
      pages: [...b.pages, { id: uid("page"), elements: [] }, { id: uid("page"), elements: [] }],
    }));
    setSpread(spreadCount);
    setSelectedId(null);
  }, [updateActiveBook, spreadCount]);

  const deleteCurrentSpread = useCallback(() => {
    if (spreadCount <= 1) return;
    const start = currentSpread * 2;
    updateActiveBook((b) => ({
      ...b,
      pages: b.pages.filter((_, i) => i !== start && i !== start + 1),
    }));
    setSpread((s) => Math.max(0, s - 1));
    setSelectedId(null);
  }, [updateActiveBook, spreadCount, currentSpread]);

  const goPrev = useCallback(() => {
    setSelectedId(null);
    setSpread((s) => Math.max(0, s - 1));
  }, []);

  const goNext = useCallback(() => {
    setSelectedId(null);
    setSpread((s) => Math.min(spreadCount - 1, s + 1));
  }, [spreadCount]);

  useEffect(() => {
    const ids = [leftPage?.id, rightPage?.id].filter(Boolean) as string[];
    if (ids.length && (!activePageId || !ids.includes(activePageId))) {
      setActivePageId(ids[0]);
    }
  }, [leftPage?.id, rightPage?.id, activePageId]);

  // Reset editor UI when the active book changes.
  useEffect(() => {
    setSpread(0);
    setSelectedId(null);
  }, [book?.id]);

  const selected = useMemo(
    () => (selectedId ? locate(selectedId) : null),
    [selectedId, locate],
  );

  return {
    book: book as Scrapbook | null,
    pages,
    spread: currentSpread,
    spreadCount,
    leftPage,
    rightPage,
    selectedId,
    selected,
    activePageId,
    saveStatus,
    setSelectedId,
    setActivePageId,
    updateElement,
    addPhoto,
    addCaption,
    addSticker,
    removeElement,
    bringForward,
    sendBackward,
    rotateBy,
    scaleBy,
    resetTransform,
    cycleFrame,
    setFrame,
    arrangePage,
    addSpread,
    deleteCurrentSpread,
    goPrev,
    goNext,
  };
}

import type { Page, PageElement } from "../types/scrapbook";
import { ScrapbookPage } from "./ScrapbookPage";

interface Props {
  leftPage: Page | null;
  rightPage: Page | null;
  activePageId: string | null;
  bookTitle: string;
  bookSubtitle: string;
  selectedId: string | null;
  onActivate: (pageId: string) => void;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onTransform: (id: string, patch: Partial<PageElement>) => void;
  onEditText: (id: string, text: string) => void;
  drawColor?: string | null;
  drawWidth?: number;
  onDrawStroke?: (pageId: string, color: string, points: { x: number; y: number }[]) => void;
}

export function Spread({
  leftPage,
  rightPage,
  activePageId,
  bookTitle,
  bookSubtitle,
  selectedId,
  onActivate,
  onSelect,
  onDeselect,
  onMove,
  onTransform,
  onEditText,
  drawColor = null,
  drawWidth = 1.7,
  onDrawStroke,
}: Props) {
  const shared = {
    bookTitle,
    bookSubtitle,
    selectedId,
    onActivate,
    onSelect,
    onDeselect,
    onMove,
    onTransform,
    onEditText,
    drawColor,
    drawWidth,
    onDrawStroke,
  };
  return (
    <div className="ks-stage">
      <div className="ks-spread">
        <ScrapbookPage
          page={leftPage}
          active={!!leftPage && activePageId === leftPage.id}
          {...shared}
        />
        <ScrapbookPage
          page={rightPage}
          active={!!rightPage && activePageId === rightPage.id}
          {...shared}
        />
      </div>
    </div>
  );
}

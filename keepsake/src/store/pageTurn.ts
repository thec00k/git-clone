import {createContext, useContext} from 'react';
export interface PhysicalTurn {
  direction: 'next' | 'prev';
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  done: () => void;
}
export const PageTurnContext = createContext<{
  start: (turn: PhysicalTurn) => void;
  cancel: () => void;
  /** Uploads a page picture taken ahead of time, so the turn that uses it does not stall on the upload. */
  prepare?: (canvas: HTMLCanvasElement) => void;
} | null>(null);
export const usePhysicalPageTurn = () => useContext(PageTurnContext);

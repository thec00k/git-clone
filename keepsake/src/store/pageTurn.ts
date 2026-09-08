import {createContext,useContext} from 'react';
export interface PhysicalTurn {
  direction:'next'|'prev';
  front:HTMLCanvasElement;
  back:HTMLCanvasElement;
  done:()=>void;
}
export const PageTurnContext=createContext<{start:(turn:PhysicalTurn)=>void;cancel:()=>void}|null>(null);
export const usePhysicalPageTurn=()=>useContext(PageTurnContext);

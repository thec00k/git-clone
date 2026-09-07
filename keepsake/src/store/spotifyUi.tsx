import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";

export type NowPlaying={title:string;artist:string;paused:boolean};
interface CrtPlayerSlot {
  controls:{toggle:()=>void}|null;
  setControls:Dispatch<SetStateAction<{toggle:()=>void}|null>>;
  nowPlaying:NowPlaying|null;
  setNowPlaying:Dispatch<SetStateAction<NowPlaying|null>>;
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
}

const CrtPlayerSlotContext = createContext<CrtPlayerSlot>({
  controls:null,setControls:()=>{},
  nowPlaying:null, setNowPlaying:()=>{},
  slot: null,
  setSlot: () => {},
});

export function CrtPlayerSlotProvider({ children }: { children: ReactNode }) {
  const [controls,setControls]=useState<{toggle:()=>void}|null>(null);
  const [nowPlaying,setNowPlaying]=useState<NowPlaying|null>(null);
  const [slot, setSlotState] = useState<HTMLElement | null>(null);
  const setSlot = useCallback((el: HTMLElement | null) => setSlotState(el), []);
  const value = useMemo(() => ({ slot, setSlot, nowPlaying, setNowPlaying,controls,setControls }), [slot, setSlot, nowPlaying,controls]);
  return <CrtPlayerSlotContext.Provider value={value}>{children}</CrtPlayerSlotContext.Provider>;
}

export function useCrtPlayerSlot() {
  return useContext(CrtPlayerSlotContext);
}

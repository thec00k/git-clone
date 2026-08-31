import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface CrtPlayerSlot {
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
}

const CrtPlayerSlotContext = createContext<CrtPlayerSlot>({
  slot: null,
  setSlot: () => {},
});

export function CrtPlayerSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlotState] = useState<HTMLElement | null>(null);
  const setSlot = useCallback((el: HTMLElement | null) => setSlotState(el), []);
  const value = useMemo(() => ({ slot, setSlot }), [slot, setSlot]);
  return <CrtPlayerSlotContext.Provider value={value}>{children}</CrtPlayerSlotContext.Provider>;
}

export function useCrtPlayerSlot() {
  return useContext(CrtPlayerSlotContext);
}

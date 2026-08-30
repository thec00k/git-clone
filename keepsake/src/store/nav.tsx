import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ViewAs } from "../types/app";
import type { HotspotId } from "../lib/hotspots";

export type View =
  | "room"
  | "book"
  | "shelf"
  | "archive"
  | "timeline"
  | "atlas"
  | "guestbook";

interface NavContextValue {
  view: View;
  go: (v: View) => void;
  back: () => void;
  viewAs: ViewAs;
  setViewAs: (v: ViewAs) => void;
  isVisitor: boolean;
  touring: boolean;
  tourFocus: HotspotId | null;
  startTour: () => void;
  endTour: () => void;
  setTourFocus: (id: HotspotId | null) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<View[]>(["room"]);
  const [viewAs, setViewAs] = useState<ViewAs>("owner");
  const [touring, setTouring] = useState(false);
  const [tourFocus, setTourFocus] = useState<HotspotId | null>(null);

  const go = useCallback((v: View) => setStack((s) => [...s, v]), []);
  const back = useCallback(
    () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    [],
  );
  const startTour = useCallback(() => {
    setStack(["room"]);
    setTouring(true);
  }, []);
  const endTour = useCallback(() => {
    setTouring(false);
    setTourFocus(null);
  }, []);

  const value = useMemo<NavContextValue>(
    () => ({
      view: stack[stack.length - 1],
      go,
      back,
      viewAs,
      setViewAs,
      isVisitor: viewAs !== "owner",
      touring,
      tourFocus,
      startTour,
      endTour,
      setTourFocus,
    }),
    [stack, go, back, viewAs, touring, tourFocus, startTour, endTour],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}

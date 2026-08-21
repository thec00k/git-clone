import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ViewAs } from "../types/app";

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
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<View[]>(["room"]);
  const [viewAs, setViewAs] = useState<ViewAs>("owner");

  const go = useCallback((v: View) => setStack((s) => [...s, v]), []);
  const back = useCallback(
    () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    [],
  );

  const value = useMemo<NavContextValue>(
    () => ({
      view: stack[stack.length - 1],
      go,
      back,
      viewAs,
      setViewAs,
      isVisitor: viewAs !== "owner",
    }),
    [stack, go, back, viewAs],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}

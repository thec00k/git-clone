import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ViewAs } from "../types/app";
import type { HotspotId } from "../lib/hotspots";
import type { RoomFace } from "../lib/roomLayout";

export type { RoomFace };

export type ArchiveFolderKey = "all" | "favorites" | string;

export type View =
  | "room"
  | "book"
  | "shelf"
  | "archive"
  | "archiveFolder"
  | "atlas"
  | "guestbook";

interface NavContextValue {
  printerOpen: boolean;
  setPrinterOpen: (open: boolean) => void;
  pendingPrint: { src: string; photoId?: string } | null;
  setPendingPrint: (photo: { src: string; photoId?: string } | null) => void;
  bookPageId: string | null;
  setBookPageId: (id: string | null) => void;
  view: View;
  go: (v: View) => void;
  back: () => void;
  archiveFolder: ArchiveFolderKey;
  openArchiveFolder: (tab: ArchiveFolderKey) => void;
  goDesk: () => void;
  goWall: (face: RoomFace) => void;
  viewAs: ViewAs;
  setViewAs: (v: ViewAs) => void;
  isVisitor: boolean;
  touring: boolean;
  tourFocus: HotspotId | null;
  startTour: () => void;
  endTour: () => void;
  setTourFocus: (id: HotspotId | null) => void;
  roomFace: RoomFace;
  setRoomFace: (face: RoomFace) => void;
  backAria: string;
  backLabel: string;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [printerOpen, setPrinterOpen] = useState(false);
  const [pendingPrint, setPendingPrint] = useState<{ src: string; photoId?: string } | null>(null);
  const [bookPageId, setBookPageId] = useState<string | null>(null);
  const [stack, setStack] = useState<View[]>(["room"]);
  const [viewAs, setViewAs] = useState<ViewAs>("owner");
  const [touring, setTouring] = useState(false);
  const [tourFocus, setTourFocus] = useState<HotspotId | null>(null);
  const [roomFace, setRoomFace] = useState<RoomFace>("front");
  const [archiveFolder, setArchiveFolder] = useState<ArchiveFolderKey>("all");

  const go = useCallback((v: View) => setStack((s) => [...s, v]), []);
  const openArchiveFolder = useCallback((tab: ArchiveFolderKey) => {
    setArchiveFolder(tab);
    setStack((s) => [...s, "archiveFolder"]);
  }, []);
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);
  const goDesk = useCallback(() => {
    setStack(["room"]);
    setRoomFace("front");
  }, []);
  const goWall = useCallback((face: RoomFace) => {
    setStack(["room"]);
    setRoomFace(face);
  }, []);
  const startTour = useCallback(() => {
    setStack(["room"]);
    setRoomFace("front");
    setTouring(true);
  }, []);
  const endTour = useCallback(() => {
    setTouring(false);
    setTourFocus(null);
    setRoomFace("front");
  }, []);

  const view = stack[stack.length - 1];
  const backAria = "Return to the desk";
  const backLabel = "return to desk";

  const value = useMemo<NavContextValue>(
    () => ({
      printerOpen, setPrinterOpen, pendingPrint, setPendingPrint, bookPageId, setBookPageId,
      view,
      go,
      back,
      archiveFolder,
      openArchiveFolder,
      goDesk,
      goWall,
      viewAs,
      setViewAs,
      isVisitor: viewAs !== "owner",
      touring,
      tourFocus,
      startTour,
      endTour,
      setTourFocus,
      roomFace,
      setRoomFace,
      backAria,
      backLabel,
    }),
    [view, go, back, archiveFolder, openArchiveFolder, goDesk, goWall, viewAs, touring, tourFocus, startTour, endTour, roomFace, printerOpen, pendingPrint, bookPageId],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function returnLabel(_view?: View, _face?: RoomFace): { aria: string; label: string } {
  return { aria: "Return to the desk", label: "return to desk" };
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}

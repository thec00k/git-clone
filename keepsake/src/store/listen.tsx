import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LISTEN_PREVIEW_KEY, listenPreviewFromSearch } from "../lib/roomListen";

export interface SceneHandle {
  sit: () => void;
  stand: () => void;
  openDrawer: () => void;
  openDoor: () => void;
  toggleLamp: () => void;
  toggleCeiling: () => void;
  seated: boolean;
  shopOpen: boolean;
}

interface ListenContextValue {
  preview: boolean;
  setPreview: (v: boolean) => void;
  announcement: string;
  announce: (text: string) => void;
  scene: SceneHandle | null;
  bindScene: (api: SceneHandle | null) => void;
}

const ListenContext = createContext<ListenContextValue | null>(null);

function readPreview(): boolean {
  if (typeof window === "undefined") return false;
  if (listenPreviewFromSearch()) {
    try {
      sessionStorage.setItem(LISTEN_PREVIEW_KEY, "1");
    } catch {
      /* private mode */
    }
    return true;
  }
  try {
    return sessionStorage.getItem(LISTEN_PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function ListenProvider({ children }: { children: ReactNode }) {
  const [preview, setPreviewState] = useState(readPreview);
  const [announcement, setAnnouncement] = useState("");
  const [scene, setScene] = useState<SceneHandle | null>(null);

  const setPreview = useCallback((v: boolean) => {
    setPreviewState(v);
    try {
      sessionStorage.setItem(LISTEN_PREVIEW_KEY, v ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, []);

  const announce = useCallback((text: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(text), 20);
  }, []);

  const bindScene = useCallback((api: SceneHandle | null) => {
    setScene(api);
  }, []);

  const value = useMemo<ListenContextValue>(
    () => ({ preview, setPreview, announcement, announce, scene, bindScene }),
    [preview, setPreview, announcement, announce, scene, bindScene],
  );

  return <ListenContext.Provider value={value}>{children}</ListenContext.Provider>;
}

export function useListen(): ListenContextValue {
  const ctx = useContext(ListenContext);
  if (!ctx) throw new Error("useListen must be used within ListenProvider");
  return ctx;
}

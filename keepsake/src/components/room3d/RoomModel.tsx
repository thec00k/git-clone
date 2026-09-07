import {useNav} from '../../store/nav';
import { MemoryObjects } from './MemoryObjects';
import { Suspense, useMemo } from "react";
import { RoomWorldMap } from "./RoomWorldMap";
import type { HotspotId } from "../../lib/hotspots";
import type { Environment } from "../../types/app";
import type { Phase } from "../room/RoomFurniture";
import { collectHotspotRoots, HotspotAnchor, type HotspotAction } from "./RoomInteractions";
import { RoomLights } from "./RoomLighting";
import { DeskDrawer, ArchiveCabinet, DeskAssembly, LampFixture, DeskClock, CeilingSwitch, ChairSit, RoomDoor, DrawerPrompt } from "./RoomProps";
import { useRoomAsset } from "./useRoomAsset";
export function RoomModel({
  phase,
  environment,
  tourFocus,
  seated,
  drawerOpen,
  cabinetOpen,
  onActivate,
  onOpenArchive,
  onOpenDrawer,
  onSit,
  onOpenDoor,
  onToggleLamp,
  onToggleCeiling,
}: {
  phase: Phase;
  environment: Environment;
  tourFocus: HotspotId | null;
  seated: boolean;
  drawerOpen: boolean;
  cabinetOpen: boolean;
  onActivate: (id: HotspotAction) => void;
  onOpenArchive: () => void;
  onOpenDrawer: () => void;
  onSit: () => void;
  onOpenDoor: () => void;
  onToggleLamp: () => void;
  onToggleCeiling: () => void;
}) {
  const {isVisitor}=useNav();
  const cloned = useRoomAsset(phase, environment);
  const roots = useMemo(() => collectHotspotRoots(cloned), [cloned]);

  return (
    <group>
      <primitive object={cloned} />
      <MemoryObjects scene={cloned} onBook={() => onActivate("book")} />
      <Suspense fallback={null}><RoomWorldMap scene={cloned} onOpen={() => onActivate("map")} /></Suspense>
      <DeskDrawer scene={cloned} open={drawerOpen} />
      <ArchiveCabinet
        scene={cloned}
        open={cabinetOpen}
        active={tourFocus === "archive"}
        onOpen={onOpenArchive}
      />
      <DeskAssembly scene={cloned} timeMode={environment.timeMode} />
      <LampFixture scene={cloned} on={environment.lampOn} onToggle={onToggleLamp} />
      <DeskClock scene={cloned} timeMode={environment.timeMode} />
      <CeilingSwitch scene={cloned} on={environment.ceilingOn !== false} onToggle={onToggleCeiling} />
      <ChairSit scene={cloned} seated={seated} onSit={onSit} />
      <RoomDoor scene={cloned} onOpen={onOpenDoor} />
      <RoomLights phase={phase} environment={environment} scene={cloned} />
      {!isVisitor && !drawerOpen && <DrawerPrompt scene={cloned} onOpen={onOpenDrawer} />}
      {roots
        .filter(({ id }) => id !== "archive" && id !== "shelf")
        .map(({ id, object }) => (
        <HotspotAnchor
          key={id}
          id={id}
          object={object}
          active={tourFocus === id}
          onActivate={() => onActivate(id)}
          prompt={seated && !drawerOpen && id === "book" ? "Open the scrapbook" : undefined}
        />
      ))}
    </group>
  );
}

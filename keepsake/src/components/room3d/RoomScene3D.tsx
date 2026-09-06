import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { HotspotId } from "../../lib/hotspots";
import {
  CEILING_FAN_BLADES,
  CEILING_FAN_LIGHT,
  CEILING_FAN_OBJECT,
  CHAIR_OBJECT,
  DESK_DRAWER,
  DESK_OBJECT,
  DOOR_OBJECT,
  CEILING_SWITCH,
  HOTSPOT_LABEL,
  LAMP_BULB,
  LAMP_OBJECT,
  ROOM_GLB,
  WINDOW_SUN_OBJECT,
  hotspotFromObjectName,
} from "../../lib/roomHotspots";
import type { RoomFace } from "../../lib/roomLayout";
import type { Environment } from "../../types/app";
import type { Phase } from "../room/RoomFurniture";
import { StickerStore } from "../StickerStore";
import { useApp } from "../../store/appStore";
import { useListen } from "../../store/listen";

const EYE_Y = 1.32;

/** Start in the larger plaster box (walls x±2.56, z±2.19, ceiling y=3.18). */
const FACE_VIEW: Record<RoomFace, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  front: {
    position: new THREE.Vector3(0.05, EYE_Y, 0.62),
    target: new THREE.Vector3(-0.15, 0.88, -1.62),
  },
  left: {
    position: new THREE.Vector3(0.18, EYE_Y, 0.22),
    target: new THREE.Vector3(-2.22, 1.42, 0.05),
  },
  right: {
    position: new THREE.Vector3(-0.18, EYE_Y, 0.22),
    target: new THREE.Vector3(2.22, 1.2, -0.12),
  },
};

/** Sit at `ks_chair` (−0.34, 0, −0.90) looking at the book on the desk. */
const SEATED_VIEW = {
  position: new THREE.Vector3(-0.34, 1.26, -0.58),
  target: new THREE.Vector3(-0.15, 0.82, -1.68),
};

type HotspotAction = Exclude<HotspotId, "hud">;

export function RoomScene3D({
  roomFace,
  setRoomFace,
  phase,
  environment,
  tourFocus,
  touring,
  onOpenWindow,
  onOpenMusic,
  onOpenDoor,
  onGo,
}: {
  roomFace: RoomFace;
  setRoomFace: (face: RoomFace) => void;
  phase: Phase;
  environment: Environment;
  tourFocus: HotspotId | null;
  touring: boolean;
  onOpenWindow: () => void;
  onOpenMusic: () => void;
  onOpenDoor: () => void;
  onGo: (view: "shelf" | "atlas" | "archive" | "book" | "guestbook") => void;
}) {
  const [seated, setSeated] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const { bindScene } = useListen();
  const { setEnvironment } = useApp();

  const stand = () => {
    setShopOpen(false);
    setSeated(false);
  };

  const sit = () => {
    setRoomFace("front");
    setSeated(true);
  };

  const toggleLamp = () => setEnvironment({ lampOn: !environment.lampOn });
  const toggleCeiling = () => setEnvironment({ ceilingOn: environment.ceilingOn === false });

  useEffect(() => {
    bindScene({
      sit,
      stand,
      openDrawer: () => setShopOpen(true),
      openDoor: onOpenDoor,
      toggleLamp,
      toggleCeiling,
      seated,
      shopOpen,
    });
    return () => bindScene(null);
  }, [bindScene, seated, shopOpen, setRoomFace, onOpenDoor, environment.lampOn, environment.ceilingOn, setEnvironment]);

  const activate = (id: HotspotAction) => {
    if (id === "window") onOpenWindow();
    else if (id === "crt") onOpenMusic();
    else if (id === "book") onGo("book");
    else if (id === "archive") onGo("archive");
    else if (id === "guestbook") onGo("guestbook");
    else if (id === "map") onGo("atlas");
    else if (id === "shelf") onGo("shelf");
  };

  useEffect(() => {
    if (touring) stand();
  }, [touring]);

  useEffect(() => {
    if (touring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (e.key === "Escape" && shopOpen) {
        e.preventDefault();
        setShopOpen(false);
        return;
      }
      if (e.key === "Escape" && seated) {
        e.preventDefault();
        stand();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring, seated, shopOpen]);

  return (
    <div
      className="ks-room3d"
      data-room-face={roomFace}
      data-seated={seated ? "1" : "0"}
      data-ceiling={environment.ceilingOn !== false ? "1" : "0"}
      data-lamp={environment.lampOn ? "1" : "0"}
      aria-label="The scrapbook room"
    >
      <div className="ks-room3d-picture" aria-hidden="true">
      <Canvas
        camera={{ fov: seated ? 38 : 42, near: 0.08, far: 40, position: FACE_VIEW.front.position.toArray() }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.62,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "default",
        }}
      >
        <color attach="background" args={[phase === "night" ? "#12161c" : phase === "dusk" ? "#2a1c14" : "#5a6570"]} />
        <Suspense fallback={null}>
          <RoomModel
            phase={phase}
            environment={environment}
            tourFocus={tourFocus}
            seated={seated}
            drawerOpen={shopOpen}
            onActivate={activate}
            onOpenDrawer={() => setShopOpen(true)}
            onSit={sit}
            onOpenDoor={onOpenDoor}
            onToggleLamp={toggleLamp}
            onToggleCeiling={toggleCeiling}
          />
        </Suspense>
        <EyeCamera face={roomFace} seated={seated} touring={touring} />
      </Canvas>
      </div>
      {seated && (
        <button type="button" className="ks-stand-up" aria-hidden="true" tabIndex={-1} onClick={stand}>
          Stand up
        </button>
      )}
      {shopOpen && <StickerStore onClose={() => setShopOpen(false)} />}
    </div>
  );
}

function RoomModel({
  phase,
  environment,
  tourFocus,
  seated,
  drawerOpen,
  onActivate,
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
  onActivate: (id: HotspotAction) => void;
  onOpenDrawer: () => void;
  onSit: () => void;
  onOpenDoor: () => void;
  onToggleLamp: () => void;
  onToggleCeiling: () => void;
}) {
  const { scene } = useGLTF(ROOM_GLB);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const roots = useMemo(() => collectHotspotRoots(cloned), [cloned]);

  useEffect(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mat = mesh.material;
      if (!mat || Array.isArray(mat)) return;
      if (mesh.name === "Outside_View") {
        const sky =
          phase === "night" ? "#1a2230" : phase === "dusk" ? "#5a4034" : "#5c666e";
        mesh.material = new THREE.MeshBasicMaterial({ color: sky });
        return;
      }
      if (mesh.name === "Win_Glass") {
        mesh.material = new THREE.MeshBasicMaterial({
          color: phase === "night" ? "#243040" : "#6e7a82",
          transparent: true,
          opacity: phase === "night" ? 0.55 : 0.32,
          depthWrite: false,
        });
        return;
      }
      const std = mat as THREE.MeshStandardMaterial;
      if (!mesh.userData.ksTuned) {
        mesh.material = std.clone();
        mesh.userData.ksTuned = true;
      }
      const local = mesh.material as THREE.MeshStandardMaterial;
      if (mesh.name === "CRT_Screen") {
        local.emissive = new THREE.Color(environment.musicOn ? "#3ec8c8" : "#102428");
        local.emissiveIntensity = environment.musicOn ? 1.4 : 0.15;
      }
      if (mesh.name === LAMP_BULB || /lamp.*bulb/i.test(mesh.name)) {
        local.emissive = new THREE.Color(environment.lampOn ? "#ffe6b0" : "#3a3228");
        local.emissiveIntensity = environment.lampOn ? 2.4 : 0.08;
      }
      if (windowAncestor(mesh)) {
        local.roughness = Math.max(local.roughness ?? 0, 0.88);
        local.metalness = 0;
        local.envMapIntensity = 0.08;
        const physical = local as THREE.MeshPhysicalMaterial;
        if ("clearcoat" in physical) physical.clearcoat = 0;
        if ("transmission" in physical) physical.transmission = 0;
      }
    });
  }, [cloned, environment.musicOn, environment.lampOn, phase]);

  return (
    <group>
      <primitive object={cloned} />
      <DeskDrawer scene={cloned} open={drawerOpen} />
      <DeskStandIn scene={cloned} />
      <DeskProps scene={cloned} />
      <LampFixture scene={cloned} on={environment.lampOn} onToggle={onToggleLamp} />
      <CeilingSwitch scene={cloned} on={environment.ceilingOn !== false} onToggle={onToggleCeiling} />
      <ChairSit scene={cloned} seated={seated} onSit={onSit} />
      <RoomDoor scene={cloned} onOpen={onOpenDoor} />
      <RoomLights phase={phase} environment={environment} scene={cloned} />
      {seated && !drawerOpen && <DrawerPrompt scene={cloned} onOpen={onOpenDrawer} />}
      {roots.map(({ id, object }) => (
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

const DRAWER_OPEN_Z = 0.26;

function DeskDrawer({ scene, open }: { scene: THREE.Object3D; open: boolean }) {
  const drawer = useMemo(() => scene.getObjectByName(DESK_DRAWER), [scene]);
  const restZ = useRef<number | null>(null);
  if (drawer && restZ.current == null) restZ.current = drawer.position.z;

  useFrame((_, dt) => {
    if (!drawer || restZ.current == null) return;
    const target = restZ.current + (open ? DRAWER_OPEN_Z : 0);
    drawer.position.z = THREE.MathUtils.damp(drawer.position.z, target, 8, dt);
  });
  return null;
}

function DrawerPrompt({ scene, onOpen }: { scene: THREE.Object3D; onOpen: () => void }) {
  const at = useMemo(() => {
    const desk = measureDesk(scene);
    return new THREE.Vector3((desk.minX + desk.maxX) / 2, desk.y - 0.28, desk.maxZ + 0.04);
  }, [scene]);
  return (
    <group position={at.toArray()}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[0.42, 0.16, 0.12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <FacedHtml point={at}>
        <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" data-open-drawer aria-hidden="true" tabIndex={-1} onClick={onOpen}>
          Open the drawer
        </button>
      </FacedHtml>
    </group>
  );
}

function windowAncestor(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.name === "ks_window" || cur.name.startsWith("Win_")) return true;
    cur = cur.parent;
  }
  return false;
}

function collectHotspotRoots(root: THREE.Object3D): { id: HotspotAction; object: THREE.Object3D }[] {
  const found: { id: HotspotAction; object: THREE.Object3D }[] = [];
  root.traverse((obj) => {
    const id = hotspotFromObjectName(obj.name);
    if (!id) return;
    if (obj.name.startsWith("ks_archive_")) return;
    found.push({ id, object: obj });
    obj.traverse((child) => {
      child.userData.hotspot = id;
    });
  });
  return found;
}

function HotspotAnchor({
  id,
  object,
  active,
  prompt,
  onActivate,
}: {
  id: HotspotAction;
  object: THREE.Object3D;
  active: boolean;
  prompt?: string;
  onActivate: () => void;
}) {
  const box = useMemo(() => objectAnchor(object, 0.88), [object]);

  return (
    <group position={box}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <FacedHtml point={box}>
        <button
          type="button"
          className={`ks-hot3d${active ? " is-tour" : ""}${prompt ? " ks-hot3d--label" : ""}`}
          data-tour={id}
          aria-hidden="true"
          tabIndex={-1}
          aria-label={HOTSPOT_LABEL[id] ?? id}
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
        >
          {prompt}
        </button>
      </FacedHtml>
    </group>
  );
}

const CEILING_FALLBACK = new THREE.Vector3(0, 3.02, 0);
const WINDOW_SUN_FALLBACK = new THREE.Vector3(-0.15, 2.28, -2.63);
const SHELF_LIGHT_FALLBACK = new THREE.Vector3(2.15, 1.45, -0.12);

function worldPos(scene: THREE.Object3D, names: string | string[], fallback: THREE.Vector3) {
  for (const name of Array.isArray(names) ? names : [names]) {
    const obj = scene.getObjectByName(name);
    if (!obj) continue;
    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    return p;
  }
  return fallback.clone();
}

function hasGeometry(object: THREE.Object3D | undefined) {
  if (!object) return false;
  let found = false;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) found = true;
  });
  return found;
}

type DeskMeasure = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
};

const STAND_IN_DESK: DeskMeasure = {
  minX: -1.04,
  maxX: 0.74,
  minZ: -2.115,
  maxZ: -1.415,
  y: 0.765,
};

function measureDesk(scene: THREE.Object3D): DeskMeasure {
  const desk = scene.getObjectByName(DESK_OBJECT);
  if (desk && hasGeometry(desk)) {
    const box = new THREE.Box3().setFromObject(desk);
    return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, y: box.max.y };
  }
  return STAND_IN_DESK;
}

/** Left-back corner of the desktop — where the lamp belongs. */
function deskLampCorner(desk: DeskMeasure) {
  return new THREE.Vector3(desk.minX + 0.14, desk.y + 0.28, desk.minZ + 0.12);
}

function lampShadePos(scene: THREE.Object3D) {
  const lamp = scene.getObjectByName(LAMP_OBJECT);
  if (lamp && hasGeometry(lamp)) {
    const box = new THREE.Box3().setFromObject(lamp);
    const p = new THREE.Vector3();
    box.getCenter(p);
    p.y = box.max.y - 0.03;
    return p;
  }
  const empty = worldPos(scene, LAMP_OBJECT, new THREE.Vector3(Number.NaN, 0, 0));
  if (Number.isFinite(empty.x) && empty.x < 0) {
    if (empty.y < 0.5) empty.y = 1.1;
    return empty;
  }
  return deskLampCorner(measureDesk(scene));
}

/** Locators with no mesh have an empty box — use the empty's world point, lifted off the floor. */
function objectAnchor(object: THREE.Object3D, emptyLift: number) {
  const box = new THREE.Box3().setFromObject(object);
  const c = new THREE.Vector3();
  if (box.isEmpty()) {
    object.getWorldPosition(c);
    if (c.y < 0.4) c.y += emptyLift;
    return c;
  }
  box.getCenter(c);
  return c;
}

const _faceDir = new THREE.Vector3();
const _faceLook = new THREE.Vector3();

/** Drei Html behind the camera paints over the window. Keep prompts only when faced. */
function useFaced(point: THREE.Vector3, minDot = 0.18) {
  const { camera } = useThree();
  const [on, setOn] = useState(false);
  useFrame(() => {
    _faceDir.copy(point).sub(camera.position);
    const dist = _faceDir.length();
    camera.getWorldDirection(_faceLook);
    const faced = dist > 0.08 && _faceDir.normalize().dot(_faceLook) > minDot;
    setOn((prev) => (prev === faced ? prev : faced));
  });
  return on;
}

function FacedHtml({
  point,
  children,
  position,
}: {
  point: THREE.Vector3;
  children: ReactNode;
  position?: [number, number, number];
}) {
  const faced = useFaced(point);
  if (!faced) return null;
  return (
    <Html position={position} center occlude={false} style={{ pointerEvents: "auto" }}>
      {children}
    </Html>
  );
}

/** Window carries day / dusk / night. The ceiling fan is a plain on/off, like the lamp. */
function RoomLights({
  phase,
  environment,
  scene,
}: {
  phase: Phase;
  environment: Environment;
  scene?: THREE.Object3D;
}) {
  const night = phase === "night";
  const dusk = phase === "dusk";
  const ceiling = useMemo(() => {
    if (!scene) return CEILING_FALLBACK.clone();
    const p = worldPos(scene, [CEILING_FAN_LIGHT, CEILING_FAN_OBJECT], CEILING_FALLBACK);
    if (p.y > 2.6) p.y -= 0.12;
    return p;
  }, [scene]);
  const windowSun = useMemo(
    () => (scene ? worldPos(scene, WINDOW_SUN_OBJECT, WINDOW_SUN_FALLBACK) : WINDOW_SUN_FALLBACK.clone()),
    [scene],
  );
  const lampRef = useRef<THREE.PointLight>(null);
  const shelfLit = useMemo(() => {
    if (!scene) return SHELF_LIGHT_FALLBACK.clone();
    const p = worldPos(scene, "ks_shelf", SHELF_LIGHT_FALLBACK);
    if (p.y < 0.5) {
      p.x -= 0.35;
      p.y = 1.45;
    }
    return p;
  }, [scene]);

  useFrame((_, dt) => {
    const blades =
      scene?.getObjectByName(CEILING_FAN_BLADES) ??
      scene?.getObjectByName(CEILING_FAN_OBJECT)?.children.find((child) => /blade/i.test(child.name));
    if (blades && environment.ceilingOn !== false) blades.rotation.y += dt * 1.35;
    if (scene && lampRef.current) {
      const p = lampShadePos(scene);
      lampRef.current.position.copy(p);
    }
  });

  const windowColor = night ? "#c8d4f0" : dusk ? "#ffb070" : "#ffe6b8";
  const windowGain = night ? 0.55 : dusk ? 1.35 : 2.1;

  return (
    <>
      <ambientLight intensity={night ? 0.16 : dusk ? 0.24 : 0.34} color={night ? "#8a9bb8" : "#fff4e6"} />
      <directionalLight position={windowSun.toArray()} intensity={windowGain} color={windowColor} />
      {environment.ceilingOn !== false && (
        <pointLight position={ceiling.toArray()} intensity={3.2} color="#fff6ea" distance={9} />
      )}
      {environment.lampOn && (
        <pointLight
          ref={lampRef}
          position={(scene ? lampShadePos(scene) : deskLampCorner(STAND_IN_DESK)).toArray()}
          intensity={night ? 3.8 : dusk ? 2.8 : 1.6}
          color="#ffb56a"
          distance={1.85}
        />
      )}
      {environment.shelfLit && <pointLight position={shelfLit.toArray()} intensity={2.4} color="#ffd89a" distance={3} />}
    </>
  );
}

/** Temporary oak top while `Desk` is still an empty locator. */
function DeskStandIn({ scene }: { scene: THREE.Object3D }) {
  const desk = useMemo(() => scene.getObjectByName(DESK_OBJECT), [scene]);
  if (hasGeometry(desk)) return null;
  return (
    <group position={[-0.15, 0, -1.765]}>
      <mesh position={[0, 0.742, 0]}>
        <boxGeometry args={[1.78, 0.045, 0.7]} />
        <meshStandardMaterial color="#8d5a36" roughness={0.66} />
      </mesh>
      {(
        [
          [-0.78, -0.28],
          [0.78, -0.28],
          [-0.78, 0.28],
          [0.78, 0.28],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.36, z]}>
          <boxGeometry args={[0.07, 0.72, 0.07]} />
          <meshStandardMaterial color="#7a4c2e" roughness={0.74} />
        </mesh>
      ))}
    </group>
  );
}

function DeskProps({ scene }: { scene: THREE.Object3D }) {
  const desk = useMemo(() => measureDesk(scene), [scene]);
  const y = desk.y + 0.004;
  const along = (t: number) => desk.minX + (desk.maxX - desk.minX) * t;
  const depth = (t: number) => desk.minZ + (desk.maxZ - desk.minZ) * t;
  return (
    <group>
      <group position={[along(0.68), y, depth(0.56)]} rotation={[0, 0.45, 0]}>
        {[
          { z: 0, color: "#c45c3e", yaw: -0.08 },
          { z: 0.016, color: "#2c221c", yaw: 0.04 },
          { z: 0.032, color: "#4a7c59", yaw: 0.12 },
        ].map((m) => (
          <mesh key={m.color} position={[0, 0.006, m.z]} rotation={[0, 0, Math.PI / 2 + m.yaw]}>
            <cylinderGeometry args={[0.006, 0.006, 0.13, 8]} />
            <meshStandardMaterial color={m.color} roughness={0.42} />
          </mesh>
        ))}
      </group>
      <group position={[along(0.42), y + 0.002, depth(0.52)]} rotation={[0, 0.22, 0]}>
        <mesh>
          <boxGeometry args={[0.14, 0.04, 0.1]} />
          <meshStandardMaterial color="#f3ebe0" roughness={0.55} />
        </mesh>
        <mesh position={[-0.01, 0.036, 0]}>
          <boxGeometry args={[0.055, 0.006, 0.07]} />
          <meshStandardMaterial color="#fffef8" roughness={0.68} />
        </mesh>
        <mesh position={[-0.01, 0.05, 0]}>
          <boxGeometry args={[0.04, 0.022, 0.05]} />
          <meshStandardMaterial color="#c4a078" roughness={0.7} />
        </mesh>
        <mesh position={[0.048, 0.006, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.008, 10]} />
          <meshStandardMaterial color="#1a3a3a" roughness={0.35} metalness={0.2} />
        </mesh>
      </group>
      <group position={[along(0.28), y + 0.002, depth(0.5)]} rotation={[0, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[0.12, 0.05, 0.064]} />
          <meshStandardMaterial color="#f2d04a" roughness={0.48} />
        </mesh>
        <mesh position={[0, -0.008, 0]}>
          <boxGeometry args={[0.122, 0.028, 0.066]} />
          <meshStandardMaterial color="#2c221c" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.002, 0.034]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.012, 12]} />
          <meshStandardMaterial color="#1a2430" roughness={0.28} />
        </mesh>
        <mesh position={[-0.04, 0.018, 0.02]}>
          <boxGeometry args={[0.018, 0.01, 0.014]} />
          <meshStandardMaterial color="#f6efe4" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function ClickHit({
  size,
  onClick,
}: {
  size: [number, number, number];
  onClick: () => void;
}) {
  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function LampFixture({
  scene,
  on,
  onToggle,
}: {
  scene: THREE.Object3D;
  on: boolean;
  onToggle: () => void;
}) {
  const lamp = useMemo(() => scene.getObjectByName(LAMP_OBJECT), [scene]);
  const solid = hasGeometry(lamp);
  const shade = useMemo(() => lampShadePos(scene), [scene]);
  const base = useMemo(() => {
    const desk = measureDesk(scene);
    return new THREE.Vector3(shade.x, desk.y, shade.z);
  }, [scene, shade]);

  return (
    <group>
      {!solid && (
        <group position={base.toArray()}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 0.02, 12]} />
            <meshStandardMaterial color="#5c3a24" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.01, 0.012, 0.28, 8]} />
            <meshStandardMaterial color="#c4a078" roughness={0.45} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.055, 0.1, 0.09, 12]} />
            <meshStandardMaterial color="#3a2a20" roughness={0.62} />
          </mesh>
        </group>
      )}
      <mesh position={shade.toArray()}>
        <sphereGeometry args={[0.022, 12, 10]} />
        <meshStandardMaterial
          color={on ? "#fff4d2" : "#d8c4a0"}
          emissive={on ? "#ffe6b0" : "#2a241c"}
          emissiveIntensity={on ? 2.8 : 0.06}
          roughness={0.35}
        />
      </mesh>
      <group position={shade.toArray()}>
        <ClickHit size={[0.22, 0.42, 0.22]} onClick={onToggle} />
        <FacedHtml point={shade} position={[0, 0.16, 0]}>
          <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" data-lamp-toggle aria-hidden="true" tabIndex={-1} onClick={onToggle}>
            {on ? "Lamp on" : "Lamp off"}
          </button>
        </FacedHtml>
      </group>
    </group>
  );
}

const SWITCH_FALLBACK = new THREE.Vector3(-1.22, 1.28, -2.1);

function CeilingSwitch({
  scene,
  on,
  onToggle,
}: {
  scene: THREE.Object3D;
  on: boolean;
  onToggle: () => void;
}) {
  const fromGlb = useMemo(() => {
    const obj = scene.getObjectByName(CEILING_SWITCH);
    return hasGeometry(obj) ? obj : undefined;
  }, [scene]);
  const center = useMemo(() => {
    if (fromGlb) return objectAnchor(fromGlb, 1.28);
    const named = scene.getObjectByName(CEILING_SWITCH);
    if (named) return objectAnchor(named, 1.28);
    return SWITCH_FALLBACK.clone();
  }, [fromGlb, scene]);

  return (
    <group position={center.toArray()}>
      {!fromGlb && (
        <>
          <mesh>
            <boxGeometry args={[0.08, 0.12, 0.02]} />
            <meshStandardMaterial color="#f3ebe0" roughness={0.62} />
          </mesh>
          <mesh position={[0, on ? 0.018 : -0.018, 0.016]}>
            <boxGeometry args={[0.028, 0.04, 0.016]} />
            <meshStandardMaterial color="#c45c3e" roughness={0.5} />
          </mesh>
        </>
      )}
      <ClickHit size={[0.16, 0.2, 0.1]} onClick={onToggle} />
      <FacedHtml point={center} position={[0, 0.12, 0.02]}>
        <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" data-ceiling-switch aria-hidden="true" tabIndex={-1} onClick={onToggle}>
          {on ? "Ceiling on" : "Ceiling off"}
        </button>
      </FacedHtml>
    </group>
  );
}

/** Door on the wall opposite the window. Uses `ks_door` when the GLB has one. */
function RoomDoor({ scene, onOpen }: { scene: THREE.Object3D; onOpen: () => void }) {
  const fromGlb = useMemo(() => {
    const obj = scene.getObjectByName(DOOR_OBJECT);
    return hasGeometry(obj) ? obj : undefined;
  }, [scene]);
  const center = useMemo(() => {
    if (!fromGlb) return new THREE.Vector3(0.15, 1.1, 2.12);
    return objectAnchor(fromGlb, 1.1);
  }, [fromGlb]);

  return (
    <group position={fromGlb ? center : [0.15, 0, 2.12]}>
      {!fromGlb && (
        <>
          <mesh position={[0, 1.08, 0]}>
            <boxGeometry args={[0.92, 2.16, 0.08]} />
            <meshStandardMaterial color="#5c3a24" roughness={0.78} />
          </mesh>
          <mesh position={[0, 1.08, -0.03]}>
            <boxGeometry args={[0.78, 2.02, 0.05]} />
            <meshStandardMaterial color="#8b5a3c" roughness={0.7} />
          </mesh>
          <mesh position={[0.28, 1.02, -0.07]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#c4a078" roughness={0.35} metalness={0.25} />
          </mesh>
        </>
      )}
      <mesh
        position={fromGlb ? [0, 0, 0] : [0, 1.08, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[0.95, 2.2, 0.28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <FacedHtml point={center} position={fromGlb ? [0, 0.2, 0] : [0, 0.42, -0.08]}>
        <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" data-room-door aria-hidden="true" tabIndex={-1} onClick={onOpen}>
          The door
        </button>
      </FacedHtml>
    </group>
  );
}

/** Sit prompt on the Blender chair. Hidden until `ks_chair` is in the GLB. */
function ChairSit({ scene, seated, onSit }: { scene: THREE.Object3D; seated: boolean; onSit: () => void }) {
  const chair = useMemo(() => scene.getObjectByName(CHAIR_OBJECT), [scene]);
  const center = useMemo(() => (chair ? objectAnchor(chair, 0.48) : null), [chair]);

  if (!chair || !center) return null;

  return (
    <group position={center}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSit();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[0.5, 0.72, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {!seated && (
        <FacedHtml point={center} position={[0, 0.28, 0]}>
          <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" data-sit-down aria-hidden="true" tabIndex={-1} onClick={onSit}>
            Sit down
          </button>
        </FacedHtml>
      )}
    </group>
  );
}

/** Stay inside the plaster — no walking through walls, floor, or the desk. */
const ROOM_WALK = { minX: -2.08, maxX: 2.08, minZ: -1.12, maxZ: 1.82 };
const WALK_SPEED = 1.55;
const LOOK_YAW = 0.0034;
const LOOK_PITCH = 0.0028;
const PITCH_MIN = -0.72;
const PITCH_MAX = 0.55;

function walkIntent(e: KeyboardEvent): { axis: "f" | "r"; dir: -1 | 1 } | null {
  const code = e.code;
  if (code === "KeyW" || e.key === "ArrowUp") return { axis: "f", dir: 1 };
  if (code === "KeyS" || e.key === "ArrowDown") return { axis: "f", dir: -1 };
  if (code === "KeyA" || e.key === "ArrowLeft") return { axis: "r", dir: -1 };
  if (code === "KeyD" || e.key === "ArrowRight") return { axis: "r", dir: 1 };
  return null;
}

function lookFromView(pos: THREE.Vector3, target: THREE.Vector3) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dz = target.z - pos.z;
  return {
    yaw: Math.atan2(dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  };
}

function lookDir(yaw: number, pitch: number) {
  const cp = Math.cos(pitch);
  return new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
}

function clampInRoom(pos: THREE.Vector3) {
  pos.x = THREE.MathUtils.clamp(pos.x, ROOM_WALK.minX, ROOM_WALK.maxX);
  pos.z = THREE.MathUtils.clamp(pos.z, ROOM_WALK.minZ, ROOM_WALK.maxZ);
}

/** Eye-height look: yaw/pitch only. The camera never leaves standing height. */
function EyeCamera({ face, seated, touring }: { face: RoomFace; seated: boolean; touring: boolean }) {
  const { camera, gl } = useThree();
  const keys = useRef({ f: 0, r: 0 });
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const userMoved = useRef(false);
  const touringRef = useRef(touring);
  touringRef.current = touring;
  const seatedRef = useRef(seated);
  seatedRef.current = seated;
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const view = seated && face === "front" ? SEATED_VIEW : FACE_VIEW[face];

  useEffect(() => {
    userMoved.current = false;
    const look = lookFromView(view.position, view.target);
    yaw.current = look.yaw;
    pitch.current = look.pitch;
  }, [face, seated, touring, view]);

  useEffect(() => {
    const el = gl.domElement;
    const blockMenu = (e: Event) => e.preventDefault();
    const down = (e: PointerEvent) => {
      if (touringRef.current) return;
      if ((e.target as HTMLElement | null)?.closest?.("button, a, input, textarea, [role='dialog']")) return;
      dragging.current = true;
      userMoved.current = true;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current || touringRef.current) return;
      // Mouse right looks right; mouse up looks up. Screen Y grows downward.
      yaw.current += e.movementX * LOOK_YAW;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * LOOK_PITCH, PITCH_MIN, PITCH_MAX);
    };
    const up = (e: PointerEvent) => {
      dragging.current = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      if (touringRef.current || seatedRef.current) return;
      e.preventDefault();
      userMoved.current = true;
      const dir = lookDir(yaw.current, 0);
      camera.position.addScaledVector(dir, -e.deltaY * 0.0022);
      clampInRoom(camera.position);
      camera.position.y = EYE_Y;
    };
    el.addEventListener("contextmenu", blockMenu);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("contextmenu", blockMenu);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [camera, gl]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (touringRef.current || seated) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true'], [aria-modal='true']")) {
        return;
      }
      const intent = walkIntent(e);
      if (!intent) return;
      e.preventDefault();
      keys.current[intent.axis] = intent.dir;
      userMoved.current = true;
    };
    const up = (e: KeyboardEvent) => {
      const intent = walkIntent(e);
      if (!intent) return;
      if (keys.current[intent.axis] === intent.dir) keys.current[intent.axis] = 0;
    };
    const clear = () => {
      keys.current.f = 0;
      keys.current.r = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [seated]);

  useFrame((_, dt) => {
    if (touring || !userMoved.current) {
      const t = reduced || touring ? 1 : 1 - Math.pow(0.0008, dt);
      camera.position.lerp(view.position, t);
      if (!seated) {
        camera.position.y = EYE_Y;
        clampInRoom(camera.position);
      }
      camera.lookAt(view.target);
    } else {
      if (!seated && (keys.current.f || keys.current.r)) {
        const forward = lookDir(yaw.current, 0);
        const right = new THREE.Vector3(-forward.z, 0, forward.x);
        camera.position.addScaledVector(forward, keys.current.f * WALK_SPEED * dt);
        camera.position.addScaledVector(right, keys.current.r * WALK_SPEED * dt);
      }
      if (seated) {
        camera.position.copy(SEATED_VIEW.position);
      } else {
        camera.position.y = EYE_Y;
        clampInRoom(camera.position);
      }
      camera.lookAt(camera.position.clone().add(lookDir(yaw.current, pitch.current)));
    }

    const host = gl.domElement.closest(".ks-room3d");
    if (host instanceof HTMLElement) {
      host.dataset.cam = `${camera.position.x.toFixed(3)},${camera.position.y.toFixed(3)},${camera.position.z.toFixed(3)}`;
      host.dataset.eye = camera.position.y.toFixed(3);
      host.dataset.look = `${yaw.current.toFixed(3)},${pitch.current.toFixed(3)}`;
      host.dataset.walk = keys.current.f || keys.current.r ? "1" : "0";
    }
  });

  return null;
}

useGLTF.preload(ROOM_GLB);

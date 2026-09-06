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
  DOOR_OBJECT,
  HOTSPOT_LABEL,
  LAMP_OBJECT,
  ROOM_GLB,
  WINDOW_SUN_OBJECT,
  hotspotFromObjectName,
} from "../../lib/roomHotspots";
import type { RoomFace } from "../../lib/roomLayout";
import type { Environment } from "../../types/app";
import type { Phase } from "../room/RoomFurniture";
import { StickerStore } from "../StickerStore";
import { useListen } from "../../store/listen";

const EYE_Y = 1.32;

/** Start in the larger plaster box (walls x±2.56, z±2.19, ceiling y=3.18). */
const FACE_VIEW: Record<RoomFace, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  front: {
    position: new THREE.Vector3(0.05, EYE_Y, 1.42),
    target: new THREE.Vector3(-0.15, 0.92, -1.58),
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

  const stand = () => {
    setShopOpen(false);
    setSeated(false);
  };

  const sit = () => {
    setRoomFace("front");
    setSeated(true);
  };

  useEffect(() => {
    bindScene({
      sit,
      stand,
      openDrawer: () => setShopOpen(true),
      openDoor: onOpenDoor,
      seated,
      shopOpen,
    });
    return () => bindScene(null);
  }, [bindScene, seated, shopOpen, setRoomFace, onOpenDoor]);

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
          />
          <DeskProps />
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
      if (windowAncestor(mesh)) {
        local.roughness = Math.max(local.roughness ?? 0, 0.88);
        local.metalness = 0;
        local.envMapIntensity = 0.08;
        const physical = local as THREE.MeshPhysicalMaterial;
        if ("clearcoat" in physical) physical.clearcoat = 0;
        if ("transmission" in physical) physical.transmission = 0;
      }
    });
  }, [cloned, environment.musicOn, phase]);

  return (
    <group>
      <primitive object={cloned} />
      <DeskDrawer scene={cloned} open={drawerOpen} />
      <ChairSit scene={cloned} seated={seated} onSit={onSit} />
      <RoomDoor scene={cloned} onOpen={onOpenDoor} />
      <RoomLights phase={phase} environment={environment} scene={cloned} />
      {seated && !drawerOpen && <DrawerPrompt onOpen={onOpenDrawer} />}
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

const DRAWER_PROMPT_AT = new THREE.Vector3(-0.15, 0.48, -1.5);

function DrawerPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <group position={DRAWER_PROMPT_AT.toArray()}>
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
      <FacedHtml point={DRAWER_PROMPT_AT}>
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
const LAMP_FALLBACK = new THREE.Vector3(0.9, 1.08, -1.7);
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
  const lamp = useMemo(() => {
    if (!scene) return LAMP_FALLBACK.clone();
    const p = worldPos(scene, LAMP_OBJECT, LAMP_FALLBACK);
    if (p.y < 0.5) p.y = 1.08;
    return p;
  }, [scene]);
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
  });

  const windowColor = night ? "#c8d4f0" : dusk ? "#ffb070" : "#ffe6b8";
  const windowGain = night ? 0.55 : dusk ? 1.35 : 2.1;

  return (
    <>
      <ambientLight intensity={night ? 0.12 : dusk ? 0.16 : 0.18} color={night ? "#8a9bb8" : "#fff4e6"} />
      <directionalLight position={windowSun.toArray()} intensity={windowGain} color={windowColor} />
      {environment.ceilingOn !== false && (
        <pointLight position={ceiling.toArray()} intensity={3.2} color="#fff6ea" distance={9} />
      )}
      {environment.lampOn && (night || dusk) && (
        <pointLight position={lamp.toArray()} intensity={4.5} color="#ffb56a" distance={3.4} />
      )}
      {environment.shelfLit && <pointLight position={shelfLit.toArray()} intensity={2.4} color="#ffd89a" distance={3} />}
    </>
  );
}

function DeskProps() {
  return (
    <group>
      <group position={[-0.58, 0.768, -1.7]} rotation={[0, 0.45, 0]}>
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
      <group position={[-0.42, 0.772, -1.62]} rotation={[0, 0.28, 0]}>
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
      <group position={[-0.78, 0.768, -1.76]} rotation={[0, 0.55, 0]}>
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

/** Door on the wall opposite the window. Uses `ks_door` when the GLB has one. */
function RoomDoor({ scene, onOpen }: { scene: THREE.Object3D; onOpen: () => void }) {
  const fromGlb = useMemo(() => scene.getObjectByName(DOOR_OBJECT), [scene]);
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

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { HotspotId } from "../../lib/hotspots";
import { HOTSPOT_LABEL, ROOM_GLB, hotspotFromObjectName } from "../../lib/roomHotspots";
import type { RoomFace } from "../../lib/roomLayout";
import { nextFace } from "../../lib/roomLayout";
import type { Environment } from "../../types/app";
import type { Phase } from "../room/RoomFurniture";

const FACE_VIEW: Record<RoomFace, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  front: {
    position: new THREE.Vector3(0.05, 1.32, 1.72),
    target: new THREE.Vector3(-0.05, 0.88, -1.05),
  },
  left: {
    position: new THREE.Vector3(-0.15, 1.42, 0.55),
    target: new THREE.Vector3(-1.85, 1.42, -0.08),
  },
  right: {
    position: new THREE.Vector3(0.2, 1.38, 0.5),
    target: new THREE.Vector3(1.88, 1.15, -0.1),
  },
};

const SEATED_VIEW = {
  position: new THREE.Vector3(-0.36, 1.52, -0.46),
  target: new THREE.Vector3(-0.5, 0.76, -1.18),
};

const CHAIR_POS: [number, number, number] = [-0.28, 0, -0.5];
/** Desk-facing chair, yawed 30° toward the CRT (right from the standing view). */
const CHAIR_YAW = THREE.MathUtils.degToRad(-30);

type HotspotAction = Exclude<HotspotId, "hud" | "timeline">;

export function RoomScene3D({
  roomFace,
  setRoomFace,
  phase,
  environment,
  tourFocus,
  touring,
  onOpenWindow,
  onOpenMusic,
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
  onGo: (view: "shelf" | "timeline" | "atlas" | "archive" | "book" | "guestbook") => void;
}) {
  const [seated, setSeated] = useState(false);

  const activate = (id: HotspotAction) => {
    if (id === "window") onOpenWindow();
    else if (id === "crt") onOpenMusic();
    else if (id === "book") onGo("book");
    else if (id === "archive") onGo("archive");
    else if (id === "guestbook") onGo("guestbook");
    else if (id === "map") onGo("atlas");
    else if (id === "shelf") onGo("shelf");
  };

  const turn = (face: RoomFace) => {
    setSeated(false);
    setRoomFace(face);
  };

  useEffect(() => {
    if (touring) setSeated(false);
  }, [touring]);

  useEffect(() => {
    if (touring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (e.key === "Escape" && seated) {
        e.preventDefault();
        setSeated(false);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        turn(nextFace(roomFace, "left"));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        turn(nextFace(roomFace, "right"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring, roomFace, seated, setRoomFace]);

  return (
    <div className="ks-room3d" data-room-face={roomFace} data-seated={seated ? "1" : "0"} aria-label="The scrapbook room">
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
            onActivate={activate}
          />
          <DeskChair seated={seated} onSit={() => { setRoomFace("front"); setSeated(true); }} />
          <DeskProps />
          <RoomLights phase={phase} environment={environment} />
        </Suspense>
        <FaceCamera face={roomFace} seated={seated} touring={touring} />
      </Canvas>
      <WallReturns face={roomFace} onTurn={turn} />
      {seated && (
        <button type="button" className="ks-stand-up" onClick={() => setSeated(false)}>
          Stand up
        </button>
      )}
    </div>
  );
}

function RoomModel({
  phase,
  environment,
  tourFocus,
  seated,
  onActivate,
}: {
  phase: Phase;
  environment: Environment;
  tourFocus: HotspotId | null;
  seated: boolean;
  onActivate: (id: HotspotAction) => void;
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
      {roots.map(({ id, object }) => (
        <HotspotAnchor
          key={id}
          id={id}
          object={object}
          active={tourFocus === id}
          onActivate={() => onActivate(id)}
          prompt={seated && id === "book" ? "Open the scrapbook" : undefined}
        />
      ))}
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
  const box = useMemo(() => {
    const b = new THREE.Box3().setFromObject(object);
    const c = new THREE.Vector3();
    b.getCenter(c);
    return c;
  }, [object]);

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
      <Html center occlude={false} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          className={`ks-hot3d${active ? " is-tour" : ""}${prompt ? " ks-hot3d--label" : ""}`}
          data-tour={id}
          aria-label={HOTSPOT_LABEL[id] ?? id}
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
        >
          {prompt}
        </button>
      </Html>
    </group>
  );
}

function RoomLights({ phase, environment }: { phase: Phase; environment: Environment }) {
  const night = phase === "night";
  const dusk = phase === "dusk";
  const amb = night ? 0.22 : dusk ? 0.36 : 0.48;
  return (
    <>
      <ambientLight intensity={amb} color={night ? "#8a9bb8" : "#fff4e6"} />
      <pointLight position={[0, 2.45, -0.15]} intensity={night ? 1.6 : 3.4} color="#fff6ea" distance={7} />
      <pointLight position={[-0.6, 1.75, 0.8]} intensity={night ? 0.9 : 2.0} color="#ffe8c8" distance={5} />
      {environment.lampOn && (night || dusk) && (
        <pointLight position={[-0.35, 0.95, -1.05]} intensity={4.5} color="#ffb56a" distance={3.2} />
      )}
      {environment.shelfLit && <pointLight position={[1.85, 1.35, -0.12]} intensity={2.4} color="#ffd89a" distance={3} />}
    </>
  );
}

function DeskProps() {
  return (
    <group>
      <group position={[-0.72, 0.762, -1.1]} rotation={[0, 0.45, 0]}>
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
      <group position={[-0.22, 0.772, -1.08]} rotation={[0, 0.28, 0]}>
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
      <group position={[-0.68, 0.768, -1.32]} rotation={[0, 0.55, 0]}>
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

function DeskChair({ seated, onSit }: { seated: boolean; onSit: () => void }) {
  const oak = "#8b5a3c";
  const dark = "#5c3a24";
  return (
    <group position={CHAIR_POS} rotation={[0, CHAIR_YAW, 0]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.42, 0.05, 0.4]} />
        <meshStandardMaterial color={oak} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.52, 0.17]}>
        <boxGeometry args={[0.42, 0.5, 0.05]} />
        <meshStandardMaterial color={oak} roughness={0.72} />
      </mesh>
      {[
        [-0.17, 0.12, -0.16],
        [0.17, 0.12, -0.16],
        [-0.17, 0.12, 0.16],
        [0.17, 0.12, 0.16],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={[0.05, 0.24, 0.05]} />
          <meshStandardMaterial color={dark} roughness={0.78} />
        </mesh>
      ))}
      <mesh
        position={[0, 0.46, 0.02]}
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
        <boxGeometry args={[0.46, 0.7, 0.46]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {!seated && (
        <Html position={[0, 0.9, 0]} center occlude={false} style={{ pointerEvents: "auto" }}>
          <button type="button" className="ks-sit-prompt" data-sit-down onClick={onSit}>
            Sit down
          </button>
        </Html>
      )}
    </group>
  );
}

function FaceCamera({ face, seated, touring }: { face: RoomFace; seated: boolean; touring: boolean }) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useFrame((_, dt) => {
    const view = seated && face === "front" ? SEATED_VIEW : FACE_VIEW[face];
    const t = reduced ? 1 : 1 - Math.pow(0.0008, dt);
    camera.position.lerp(view.position, t);
    const ctrl = controls.current;
    if (ctrl) {
      ctrl.target.lerp(view.target, t);
      ctrl.minDistance = seated ? 0.55 : 1.1;
      ctrl.maxDistance = seated ? 1.8 : 3.4;
      ctrl.update();
    } else {
      camera.lookAt(view.target);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableZoom={!touring}
      enableRotate={!touring}
      minDistance={seated ? 0.55 : 1.1}
      maxDistance={seated ? 1.8 : 3.4}
      maxPolarAngle={seated ? Math.PI * 0.78 : Math.PI * 0.58}
      minPolarAngle={seated ? Math.PI * 0.12 : Math.PI * 0.28}
      target={(seated && face === "front" ? SEATED_VIEW : FACE_VIEW[face]).target.toArray()}
    />
  );
}

function WallReturns({ face, onTurn }: { face: RoomFace; onTurn: (f: RoomFace) => void }) {
  return (
    <nav className="ks-returns" aria-label="Turn the room">
      {face === "front" && (
        <>
          <button type="button" className="ks-return ks-return--left ks-return--map" onClick={() => onTurn("left")}>
            <span className="ks-return-label">Corkboard map</span>
          </button>
          <button type="button" className="ks-return ks-return--right ks-return--shelf" onClick={() => onTurn("right")}>
            <span className="ks-return-label">Bookshelf</span>
          </button>
        </>
      )}
      {face === "left" && (
        <button type="button" className="ks-return ks-return--right ks-return--desk" onClick={() => onTurn("front")}>
          <span className="ks-return-label">Desk</span>
        </button>
      )}
      {face === "right" && (
        <button type="button" className="ks-return ks-return--left ks-return--desk" onClick={() => onTurn("front")}>
          <span className="ks-return-label">Desk</span>
        </button>
      )}
    </nav>
  );
}

useGLTF.preload(ROOM_GLB);

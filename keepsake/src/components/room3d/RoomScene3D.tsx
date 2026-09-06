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
  position: new THREE.Vector3(-0.28, 1.08, -0.38),
  target: new THREE.Vector3(-0.48, 0.78, -1.22),
};

const CHAIR_POS: [number, number, number] = [-0.22, 0, -0.52];

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
        camera={{ fov: seated ? 36 : 42, near: 0.08, far: 40, position: FACE_VIEW.front.position.toArray() }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.78,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "default",
        }}
      >
        <color attach="background" args={[phase === "night" ? "#1a1410" : phase === "dusk" ? "#3a2418" : "#c4a078"]} />
        <Suspense fallback={null}>
          <RoomModel
            phase={phase}
            environment={environment}
            tourFocus={tourFocus}
            seated={seated}
            onActivate={activate}
          />
          <DeskChair seated={seated} onSit={() => { setRoomFace("front"); setSeated(true); }} />
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
      if (mesh.name === "Outside_View") {
        local.color.set(phase === "night" ? "#243044" : phase === "dusk" ? "#c4895a" : "#b8c4c8");
        local.emissive.set(phase === "night" ? "#0c1420" : phase === "dusk" ? "#6a3a20" : "#6e7a82");
        local.emissiveIntensity = phase === "night" ? 0.12 : 0.22;
      }
      if (mesh.name === "Win_Glass") {
        local.color.set("#d8e0e4");
        local.emissive.set("#2a3034");
        local.emissiveIntensity = 0.04;
        const glass = local as THREE.MeshStandardMaterial & { transmission?: number };
        if (typeof glass.transmission === "number") glass.transmission = Math.min(glass.transmission, 0.45);
        local.transparent = true;
        local.opacity = 0.55;
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
  const windowGlow = night ? 0.35 : dusk ? 0.9 : 1.35;
  return (
    <>
      <ambientLight intensity={amb} color={night ? "#8a9bb8" : "#fff4e6"} />
      <pointLight position={[-0.12, 1.52, -1.62]} intensity={windowGlow} color="#f0e2c4" distance={3.4} decay={2} />
      <pointLight position={[0, 2.45, -0.15]} intensity={night ? 1.6 : 4.2} color="#fff6ea" distance={7} />
      <pointLight position={[-0.6, 1.75, 0.8]} intensity={night ? 0.9 : 2.4} color="#ffe8c8" distance={5} />
      {environment.lampOn && (night || dusk) && (
        <pointLight position={[-0.35, 0.95, -1.05]} intensity={4.5} color="#ffb56a" distance={3.2} />
      )}
      {environment.shelfLit && <pointLight position={[1.85, 1.35, -0.12]} intensity={2.4} color="#ffd89a" distance={3} />}
    </>
  );
}

function DeskChair({ seated, onSit }: { seated: boolean; onSit: () => void }) {
  const oak = "#8b5a3c";
  const dark = "#5c3a24";
  return (
    <group position={CHAIR_POS} rotation={[0, 0, 0]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.42, 0.05, 0.4]} />
        <meshStandardMaterial color={oak} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.52, -0.17]}>
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
        <Html position={[0, 0.86, 0.12]} center occlude={false} style={{ pointerEvents: "auto" }}>
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
      ctrl.minDistance = seated ? 0.45 : 1.1;
      ctrl.maxDistance = seated ? 1.35 : 3.4;
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
      minDistance={seated ? 0.45 : 1.1}
      maxDistance={seated ? 1.35 : 3.4}
      maxPolarAngle={seated ? Math.PI * 0.62 : Math.PI * 0.58}
      minPolarAngle={seated ? Math.PI * 0.32 : Math.PI * 0.28}
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

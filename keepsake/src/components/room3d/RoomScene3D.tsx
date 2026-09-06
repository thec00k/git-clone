import { Suspense, useEffect, useMemo, useRef } from "react";
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
    if (touring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setRoomFace(nextFace(roomFace, "left"));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setRoomFace(nextFace(roomFace, "right"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [touring, roomFace, setRoomFace]);

  return (
    <div className="ks-room3d" data-room-face={roomFace} aria-label="The scrapbook room">
      <Canvas
        camera={{ fov: 42, near: 0.08, far: 40, position: FACE_VIEW.front.position.toArray() }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={[phase === "night" ? "#1a1410" : phase === "dusk" ? "#3a2418" : "#c4a078"]} />
        <Suspense fallback={null}>
          <RoomModel
            phase={phase}
            environment={environment}
            tourFocus={tourFocus}
            onActivate={activate}
          />
          <RoomLights phase={phase} environment={environment} />
        </Suspense>
        <FaceCamera face={roomFace} touring={touring} />
      </Canvas>
      <WallReturns face={roomFace} onTurn={setRoomFace} />
    </div>
  );
}

function RoomModel({
  phase,
  environment,
  tourFocus,
  onActivate,
}: {
  phase: Phase;
  environment: Environment;
  tourFocus: HotspotId | null;
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
      if (mesh.name === "CRT_Screen" && mat && !Array.isArray(mat)) {
        const m = mat as THREE.MeshStandardMaterial;
        m.emissive = new THREE.Color(environment.musicOn ? "#3ec8c8" : "#102428");
        m.emissiveIntensity = environment.musicOn ? 1.4 : 0.15;
      }
      if (mesh.name === "Win_Glass" && mat && !Array.isArray(mat) && "transmission" in mat) {
        /* keep glass as exported */
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
  onActivate,
}: {
  id: HotspotAction;
  object: THREE.Object3D;
  active: boolean;
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
          className={`ks-hot3d${active ? " is-tour" : ""}`}
          data-tour={id}
          aria-label={HOTSPOT_LABEL[id] ?? id}
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
        />
      </Html>
    </group>
  );
}

function RoomLights({ phase, environment }: { phase: Phase; environment: Environment }) {
  const night = phase === "night";
  const dusk = phase === "dusk";
  const amb = night ? 0.18 : dusk ? 0.38 : 0.62;
  const key = night ? 4 : dusk ? 10 : 18;
  return (
    <>
      <ambientLight intensity={amb} color={night ? "#8a9bb8" : "#fff4e6"} />
      <pointLight position={[-0.12, 1.52, -1.62]} intensity={key} color="#fff1d0" distance={6} />
      <pointLight position={[0, 2.45, -0.15]} intensity={night ? 2 : 7} color="#fff8ee" distance={8} />
      <pointLight position={[-0.6, 1.75, 0.8]} intensity={night ? 1.2 : 4} color="#ffe8c8" distance={5} />
      {environment.lampOn && (night || dusk) && (
        <pointLight position={[-0.35, 0.95, -1.05]} intensity={6} color="#ffb56a" distance={3.2} />
      )}
      {environment.shelfLit && <pointLight position={[1.85, 1.35, -0.12]} intensity={3.2} color="#ffd89a" distance={3} />}
    </>
  );
}

function FaceCamera({ face, touring }: { face: RoomFace; touring: boolean }) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useFrame((_, dt) => {
    const view = FACE_VIEW[face];
    const t = reduced ? 1 : 1 - Math.pow(0.0008, dt);
    camera.position.lerp(view.position, t);
    const ctrl = controls.current;
    if (ctrl) {
      ctrl.target.lerp(view.target, t);
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
      minDistance={1.1}
      maxDistance={3.4}
      maxPolarAngle={Math.PI * 0.58}
      minPolarAngle={Math.PI * 0.28}
      target={FACE_VIEW[face].target.toArray()}
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

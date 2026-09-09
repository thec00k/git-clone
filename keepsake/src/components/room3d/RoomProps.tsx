import { PhotoSurface } from './MemoryObjects';
import {motionFactor,MOTION} from '../../lib/motion';
import {FurniturePrinter} from './FurniturePrinter';
import {useActiveRoom} from './useActiveRoom';
import { useApp } from '../../store/appStore';
import { useNav } from "../../store/nav";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import { LAMP_OBJECT } from "../../lib/roomHotspots";
import * as THREE from "three";
import { ARCHIVE_DRAWER, ARCHIVE_OBJECT, DESK_DRAWER, CLOCK_OBJECT, CLOCK_DIGITS, CEILING_SWITCH, CHAIR_OBJECT, DOOR_OBJECT, HOTSPOT_LABEL } from "../../lib/roomHotspots";
import type { TimeMode } from "../../types/app";
import { RollingClock } from "./RollingClock";
import { ClickHit, FacedHtml } from "./RoomInteractions";
import { hasGeometry, measureDesk, findDeskObject, isDeskSized, lampShadePos, objectAnchor } from "./sceneGeometry";
const DRAWER_OPEN_Z = 0.26;
/** Local +Z of `ks_archive_drawer` — toward the chair, into the room. */
const ARCHIVE_DRAWER_OPEN_Z = 0.34;
const ARCHIVE_FALLBACK = new THREE.Vector3(1.22, 0, -1.805);

import { useReducedMotion } from "../../hooks/useReducedMotion";
import {useWorkbench} from '../../store/workbench';
export function DeskDrawer({ scene, open }: { scene: THREE.Object3D; open: boolean }) {
  const reduced = useReducedMotion();
  const drawer = useMemo(() => scene.getObjectByName(DESK_DRAWER), [scene]);
  const restZ = useRef<number | null>(null);

  useFrame((_, dt) => {
    if (!drawer) return;
    if (restZ.current == null) restZ.current = drawer.position.z;
    drawer.userData.ksDrawerRestZ=restZ.current;
    const target = restZ.current + (open ? DRAWER_OPEN_Z : 0);
    drawer.position.z = THREE.MathUtils.lerp(drawer.position.z, target, motionFactor(dt,MOTION.drawer,reduced));
  });
  return null;
}

export function ArchiveCabinet({
  scene,
  open,
  active,
  onOpen,
}: {
  scene: THREE.Object3D;
  open: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  const cabinet = useMemo(() => scene.getObjectByName(ARCHIVE_OBJECT), [scene]);
  const reduced = useReducedMotion();
  const drawer = useMemo(() => scene.getObjectByName(ARCHIVE_DRAWER), [scene]);
  const solid = hasGeometry(cabinet);
  const restZ = useRef<number | null>(null);
  const standInDrawer = useRef<THREE.Group>(null);

  const origin = useMemo(() => {
    if (!cabinet) return ARCHIVE_FALLBACK.clone();
    const p = new THREE.Vector3();
    cabinet.getWorldPosition(p);
    return p;
  }, [cabinet]);

  const labelAt = useMemo(
    () => new THREE.Vector3(origin.x, origin.y + 0.92, origin.z + 0.28),
    [origin],
  );

  useFrame((_, dt) => {
    if (drawer) {
      if (restZ.current == null) restZ.current = drawer.position.z;
    drawer.userData.ksDrawerRestZ=restZ.current;
      const target = restZ.current + (open ? ARCHIVE_DRAWER_OPEN_Z : 0);
      drawer.position.z = THREE.MathUtils.lerp(drawer.position.z, target, motionFactor(dt,MOTION.drawer,reduced));
    }
    if (standInDrawer.current) {
      standInDrawer.current.position.z = THREE.MathUtils.lerp(
        standInDrawer.current.position.z,
        open ? ARCHIVE_DRAWER_OPEN_Z : 0,
        motionFactor(dt,MOTION.drawer,reduced),
      );
    }
  });

  return (
    <group>
      {!solid && (
        <group position={origin.toArray()}>
          <mesh position={[0, 0.43, -0.02]}>
            <boxGeometry args={[0.58, 0.86, 0.46]} />
            <meshStandardMaterial color="#6e4328" roughness={0.74} />
          </mesh>
          <mesh position={[0, 0.87, -0.01]}>
            <boxGeometry args={[0.62, 0.04, 0.5]} />
            <meshStandardMaterial color="#8d5a36" roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.6, 0.06, 0.48]} />
            <meshStandardMaterial color="#5c3a24" roughness={0.8} />
          </mesh>
          <group ref={standInDrawer} position={[0, 0.5, 0.01]}>
            <mesh>
              <boxGeometry args={[0.52, 0.58, 0.4]} />
              <meshStandardMaterial color="#8b5a3c" roughness={0.66} />
            </mesh>
            <mesh position={[0, 0, 0.208]}>
              <boxGeometry args={[0.5, 0.54, 0.02]} />
              <meshStandardMaterial color="#7a4c2e" roughness={0.58} />
            </mesh>
            <mesh position={[0, -0.02, 0.228]}>
              <boxGeometry args={[0.12, 0.018, 0.028]} />
              <meshStandardMaterial color="#c4a078" roughness={0.38} metalness={0.18} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.46, 8]} />
              <meshStandardMaterial color="#c4a078" roughness={0.4} metalness={0.22} />
            </mesh>
            {(
              [
                [-0.16, "#c45c3e"],
                [-0.02, "#8b3a32"],
                [0.12, "#d8c4a8"],
                [0.22, "#eadcc8"],
              ] as const
            ).map(([x, color]) => (
              <mesh key={`${x}:${color}`} position={[x, 0.265, 0.06]} rotation={[0.08, 0, 0]}>
                <boxGeometry args={[0.09, 0.028, 0.16]} />
                <meshStandardMaterial color={color} roughness={0.55} />
              </mesh>
            ))}
          </group>
        </group>
      )}
      <group position={[origin.x, origin.y + 0.5, origin.z + 0.18]}>
        <ClickHit size={[0.66, 0.96, 0.7]} onClick={onOpen} />
      </group>
      <group position={labelAt.toArray()}>
        <FacedHtml point={labelAt}>
          <button
            type="button"
            className={`ks-hot3d${active ? " is-tour" : ""} ks-hot3d--label`}
            data-tour="archive"
            data-open-archive
            aria-hidden="true"
            tabIndex={-1}
            aria-label={HOTSPOT_LABEL.archive}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            Open the files
          </button>
        </FacedHtml>
      </group>
    </group>
  );
}

export function DrawerPrompt({ scene, onOpen }: { scene: THREE.Object3D; onOpen: () => void }) {
  const at = useMemo(() => {
    const desk = measureDesk(scene);
    const drawer=scene.getObjectByName(DESK_DRAWER);if(drawer){const b=new THREE.Box3().setFromObject(drawer);return new THREE.Vector3((b.min.x+b.max.x)/2,(b.min.y+b.max.y)/2,b.max.z-(drawer.position.z-(drawer.userData.ksDrawerRestZ??drawer.position.z))+.015);}return new THREE.Vector3((desk.minX + desk.maxX) / 2, desk.y - 0.1, desk.maxZ + 0.04);
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
        <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" aria-label="Open desk drawer shop" data-open-drawer onClick={onOpen}>
          Open drawer · shop
        </button>
      </FacedHtml>
    </group>
  );
}

const STAND_IN_ORIGIN = new THREE.Vector3(-0.15, 0, -1.765);
const STAND_IN_TOP_THICK = 0.045;

const STAND_IN_TOP_W = 1.78;
const STAND_IN_TOP_D = 0.7;
const CLOCK_FACE_PX = 168;

type BookOnDesk = { x: number; z: number; halfW: number; halfD: number };

/**
 * Group origin is the oak face (y = 0). The slab hangs below that, and every
 * prop's y is only its half-height, so bottoms cannot leave the wood.
 */
export function DeskAssembly({ scene, timeMode }: { scene: THREE.Object3D; timeMode: TimeMode }) {
  const desk = useMemo(() => findDeskObject(scene), [scene]);
  const clockSolid = hasGeometry(scene.getObjectByName(CLOCK_OBJECT));
  const surface = useMemo(() => {
    const measured = measureDesk(scene);
    const origin = new THREE.Vector3();
    if (desk) desk.getWorldPosition(origin);
    else origin.copy(STAND_IN_ORIGIN);
    const solid = isDeskSized(desk);
    return {
      x: solid ? (measured.minX + measured.maxX) / 2 : origin.x,
      y: measured.y,
      z: solid ? (measured.minZ + measured.maxZ) / 2 : origin.z,
      solid,
    };
  }, [scene, desk]);

  const book = useMemo<BookOnDesk>(() => {
    const mesh = scene.getObjectByName("ks_book");
    if (!mesh || !hasGeometry(mesh)) {
      return { x: 0, z: 0.08, halfW: 0.09, halfD: 0.12 };
    }
    const box = new THREE.Box3().setFromObject(mesh);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    return {
      x: c.x - surface.x,
      z: c.z - surface.z,
        halfW: Math.max(s.x / 2, .34),
      halfD: s.z / 2,
    };
  }, [scene, surface.x, surface.z]);

  const legH = Math.max(0.2, surface.y - STAND_IN_TOP_THICK);

  useEffect(() => {
    const host = document.querySelector(".ks-room3d");
    if (host instanceof HTMLElement) {
      host.dataset.deskSurface = `${surface.x.toFixed(3)},${surface.y.toFixed(3)},${surface.z.toFixed(3)}`;
      host.dataset.deskSolid = surface.solid ? "1" : "0";
    }
  }, [surface]);

  return (
    <group position={[surface.x, surface.y, surface.z]}>
      {!surface.solid && (
        <>
          <mesh name="ks_standin_desktop" position={[0, -STAND_IN_TOP_THICK / 2, 0]}>
            <boxGeometry args={[STAND_IN_TOP_W, STAND_IN_TOP_THICK, STAND_IN_TOP_D]} />
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
            <mesh key={`${x}:${z}`} position={[x, -STAND_IN_TOP_THICK - legH / 2, z]}>
              <boxGeometry args={[0.07, legH, 0.07]} />
              <meshStandardMaterial color="#7a4c2e" roughness={0.74} />
            </mesh>
          ))}
        </>
      )}
      <OakDeskClutter book={book} />
      {!clockSolid && <StandInClock book={book} timeMode={timeMode} />}
    </group>
  );
}

function clampOnTop(n: number, limit: number) {
  return THREE.MathUtils.clamp(n, -limit, limit);
}

/** Markers / printer / camera. y = 0 is the oak; sit() is only half-height. */
export function OakDeskClutter({ book }: { book: BookOnDesk }) {
  const {phase}=useWorkbench();const reduced=useReducedMotion();const markers=useRef<THREE.Group>(null);
  const {setPrinterOpen,isVisitor}=useNav();
  const {state}=useApp();
  const sit = (half: number) => half;
  const insetX = STAND_IN_TOP_W / 2 - 0.14;
  const insetZ = STAND_IN_TOP_D / 2 - 0.12;
  const markerX = clampOnTop(book.x + (phase==='editing'||phase==='opening'||phase==='closing'?book.halfW+.07:.29), insetX);
  const printerX = clampOnTop(book.x - book.halfW - 0.17, insetX);
  const cameraX = clampOnTop(book.x - book.halfW - 0.1, insetX);
  const rowZ = clampOnTop(book.z, insetZ);
  useFrame((_,dt)=>{if(markers.current)markers.current.position.x=THREE.MathUtils.lerp(markers.current.position.x,markerX,motionFactor(dt,MOTION.furniture,reduced));});

  return (
    <group>
      <group ref={markers} name="Desk_Markers_Assembly" position={[clampOnTop(book.x+.29,insetX), sit(0.008), rowZ]} rotation={[0, 0.35, 0]}>
        {[
          { z: 0, color: "#c45c3e", yaw: -0.08 },
          { z: 0.018, color: "#2c221c", yaw: 0.04 },
          { z: 0.036, color: "#4a7c59", yaw: 0.12 },
        ].map((m) => (
          <mesh key={m.color} position={[0, 0, m.z]} rotation={[0, m.yaw, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.13, 8]} />
            <meshStandardMaterial color={m.color} roughness={0.42} />
          </mesh>
        ))}
      </group>
      <group name="Desk_Printer_Assembly" position={[printerX, 0.023, rowZ + 0.18]} rotation={[0, 0.08, 0]} onClick={e=>{e.stopPropagation();if(!isVisitor)setPrinterOpen(true);}}>
        <FurniturePrinter>
        <RoundedBox args={[0.135,0.046,0.17]} radius={0.012} smoothness={3}><meshStandardMaterial color="#e5dbc7" roughness={0.82}/></RoundedBox>
        <mesh position={[0,0.003,0.086]}><boxGeometry args={[0.103,0.008,0.003]}/><meshStandardMaterial color="#26392f"/></mesh>
        </FurniturePrinter>
        <mesh position={[0,0.004,0.12]}><boxGeometry args={[0.085,0.0015,0.07]}/><meshStandardMaterial color="#fffef4"/></mesh>
        <group position={[0,0.0057,0.115]} rotation={[-Math.PI/2,0,0]}>{!isVisitor && state.latestPrint ? <PhotoSurface src={state.latestPrint.src} width={.07} height={.046}/> : <mesh><planeGeometry args={[.07,.046]}/><meshStandardMaterial color="#668777"/></mesh>}</group>
        <mesh position={[0.043,0.024,-0.048]}><sphereGeometry args={[0.003,8,6]}/><meshStandardMaterial color="#a6ce97" emissive="#82b76e" emissiveIntensity={0.5}/></mesh>
        {['#b56c4a','#c7a86b','#6d8a6c'].map((color,i)=><mesh key={color} position={[-0.009+i*0.009,0.0235,-0.058]}><boxGeometry args={[0.008,0.001,0.025]}/><meshStandardMaterial color={color}/></mesh>)}
      </group>
      <group name="Desk_Camera_Assembly" position={[cameraX, sit(0.025), rowZ]} rotation={[0, 0.32, 0]}>
        <mesh>
          <boxGeometry args={[0.12, 0.05, 0.064]} />
          <meshStandardMaterial color="#ad7852" roughness={0.78} />
        </mesh>
        <mesh position={[0, -0.011, 0]}>
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

/** Retro case on the oak; digits live on the +Z face (toward the chair). */
export function StandInClock({ book, timeMode }: { book: BookOnDesk; timeMode: TimeMode }) {
  const caseH = 0.05;
  const x = clampOnTop(book.x - book.halfW - 0.36, STAND_IN_TOP_W / 2 - 0.12);
  const z = clampOnTop(book.z - 0.22, STAND_IN_TOP_D / 2 - 0.1);
  return (
    <group position={[x, caseH / 2 - 0.003, z]}>
      <mesh>
        <boxGeometry args={[0.16, caseH, 0.07]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.006, 0.032]}>
        <boxGeometry args={[0.13, 0.028, 0.008]} />
        <meshStandardMaterial color="#12140e" roughness={0.4} />
      </mesh>
      <Html
        transform
        occlude={false}
        distanceFactor={400}
        position={[0, 0.006, 0.038]}
        rotation={[-0.12, 0, 0]}
        scale={0.125 / CLOCK_FACE_PX}
        style={{ pointerEvents: "none", backfaceVisibility: "hidden" }}
      >
        <div data-clock-locked="1">
          <RollingClock timeMode={timeMode} />
        </div>
      </Html>
    </group>
  );
}

export function LampFixture({
  scene,
  on,
  onToggle,
}: {
  scene: THREE.Object3D;
  on: boolean;
  onToggle: () => void;
}) {
  const {environment}=useApp();
  const lampChoice=environment.furniture?.[environment.roomTheme??'woodland']?.lamp;
  const ownBulb=lampChoice==='lamp-2'||lampChoice==='lamp-3';
  const fixture=useRef<THREE.Group>(null);
  useFrame(()=>{fixture.current?.position.copy(lampShadePos(scene));});
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
            <meshStandardMaterial color="#a68b53" roughness={0.58} metalness={0.65} />
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.055, 0.1, 0.09, 12]} />
            <meshStandardMaterial color="#3a2a20" roughness={0.62} />
          </mesh>
        </group>
      )}
      <group ref={fixture} position={shade.toArray()}>
      <mesh position={[0,-.01,.02]} visible={!ownBulb}>
        <sphereGeometry args={[0.028, 12, 10]} />
        {on ? (
          <meshBasicMaterial color="#fff1c2" />
        ) : (
          <meshStandardMaterial color="#c4b089" roughness={0.4} />
        )}
      </mesh>
        <ClickHit size={[0.22, 0.42, 0.22]} onClick={onToggle} />
        <FacedHtml point={shade} position={[0, 0.16, 0]}>
          <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" aria-label={on ? "Turn desk lamp off" : "Turn desk lamp on"} data-lamp-toggle aria-hidden="true" tabIndex={-1} onClick={onToggle}>
            {on ? "Lamp on" : "Lamp off"}
          </button>
        </FacedHtml>
      </group>
    </group>
  );
}

export function DeskClock({ scene, timeMode }: { scene: THREE.Object3D; timeMode: TimeMode }) {
  const room = useActiveRoom();
  const clock = useMemo(() => scene.getObjectByName(CLOCK_OBJECT), [scene]);
  const digits = useMemo(() => scene.getObjectByName(CLOCK_DIGITS), [scene]);
  const pose = useMemo(() => {
    const face = digits && hasGeometry(digits) ? digits : clock && hasGeometry(clock) ? clock : null;
    if (!face) return null;
    const box = new THREE.Box3().setFromObject(face);
    const pos = new THREE.Vector3();
    box.getCenter(pos);
    if (!digits || !hasGeometry(digits)) pos.z = box.max.z + 0.004;
    const size = box.getSize(new THREE.Vector3());
    const width = Math.max(size.x, size.z, 0.1);
    const quat = new THREE.Quaternion();
    face.getWorldQuaternion(quat);
    return { pos, quat, scale: width / CLOCK_FACE_PX };
  }, [clock, digits]);

  if (!pose) return null;
  return (
    <group position={pose.pos.toArray()} quaternion={pose.quat}>
      <Html transform occlude={false} distanceFactor={400} position={[0, 0, 0]} scale={pose.scale} style={{ pointerEvents: "none" }}>
        <div data-clock-locked="1" className={room.id === 'beachfront' ? 'ks-coastal-clock' : undefined}>
          <RollingClock timeMode={timeMode} />
        </div>
      </Html>
    </group>
  );
}

const SWITCH_FALLBACK = new THREE.Vector3(-1.58, 1.32, -2.08);

export function CeilingSwitch({
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
            <meshStandardMaterial color="#9d7854" roughness={0.65} />
          </mesh>
        </>
      )}
      <ClickHit size={[0.16, 0.2, 0.1]} onClick={onToggle} />
      <FacedHtml point={center} position={[0, 0.12, 0.02]}>
        <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" aria-label={on ? "Turn ceiling light off" : "Turn ceiling light on"} data-ceiling-switch aria-hidden="true" tabIndex={-1} onClick={onToggle}>
          {on ? "Ceiling on" : "Ceiling off"}
        </button>
      </FacedHtml>
    </group>
  );
}

/** Door on the wall opposite the window. Uses `ks_door` when the GLB has one. */
export function RoomDoor({ scene, onOpen }: { scene: THREE.Object3D; onOpen: () => void }) {
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
            <meshStandardMaterial color="#a68b53" roughness={0.58} metalness={0.65} />
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
        <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" aria-label="Open the door" data-room-door aria-hidden="true" tabIndex={-1} onClick={onOpen}>
          The door
        </button>
      </FacedHtml>
    </group>
  );
}

/** Sit prompt on the Blender chair. Hidden until `ks_chair` is in the GLB. */
export function ChairSit({ scene, seated, onSit }: { scene: THREE.Object3D; seated: boolean; onSit: () => void }) {
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
          <button type="button" className="ks-sit-prompt ks-sit-prompt--seat" aria-label="Take a seat" data-sit-down aria-hidden="true" tabIndex={-1} onClick={onSit}>
            Sit down
          </button>
        </FacedHtml>
      )}
    </group>
  );
}

/** Stay inside the plaster — no walking through walls, floor, or the desk. */

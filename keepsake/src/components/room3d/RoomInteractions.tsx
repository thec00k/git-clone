import { useMemo, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { HotspotId } from "../../lib/hotspots";
import { HOTSPOT_LABEL, hotspotFromObjectName } from "../../lib/roomHotspots";
import { objectAnchor } from "./sceneGeometry";
export type HotspotAction = Exclude<HotspotId, "hud">;
export function collectHotspotRoots(root: THREE.Object3D): { id: HotspotAction; object: THREE.Object3D }[] {
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

export function HotspotAnchor({
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
    const cover=id==='guestbook'?object.getObjectByName('Guestbook_Cover'):undefined;
    if(cover){const b=new THREE.Box3().setFromObject(cover);return new THREE.Vector3((b.min.x+b.max.x)/2,b.max.y+.025,(b.min.z+b.max.z)/2);}
    return objectAnchor(object,0.88);
  }, [object,id]);

  return (
    <group position={box}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 4) return;
          onActivate();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[id==='guestbook'?.10:.18, 10, 10]} />
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

export function FacedHtml({
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

export function ClickHit({
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



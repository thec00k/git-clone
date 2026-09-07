import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { RoomFace } from "../../lib/roomLayout";
import { activeRoom } from "./themes";
const EYE_Y = 1.32;

export const FACE_VIEW = Object.fromEntries(Object.entries(activeRoom.views).map(([face, view]) => [face, {
  position: new THREE.Vector3(...view.position), target: new THREE.Vector3(...view.target),
}])) as Record<RoomFace, { position: THREE.Vector3; target: THREE.Vector3 }>;
const READING_VIEW = {position:new THREE.Vector3(.25,1.32,.45),target:new THREE.Vector3(-1.9,.45,1.35)};
const SEATED_VIEW = { position: new THREE.Vector3(...activeRoom.seated.position), target: new THREE.Vector3(...activeRoom.seated.target) };
/** Straight down on the oak. Open `?look=desk` to check contact. */
const DESK_OVERHEAD_VIEW = {
  position: new THREE.Vector3(-0.15, 2.05, -1.72),
  target: new THREE.Vector3(-0.15, 0.75, -1.76),
};

function wantsDeskOverhead() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("look") === "desk";
}

const ROOM_WALK = activeRoom.walkBounds;
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
export function EyeCamera({ face, seated, touring, viewRevision, reading = false }: { face: RoomFace; seated: boolean; touring: boolean; viewRevision: number; reading?: boolean }) {
  const { camera, gl } = useThree();
  const keys = useRef({ f: 0, r: 0 });
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const userMoved = useRef(false);
  const touringRef = useRef(touring);

  const seatedRef = useRef(seated);

  useEffect(() => { touringRef.current = touring; seatedRef.current = seated; }, [touring, seated]);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const overhead = wantsDeskOverhead();
  const view = reading && !touring ? READING_VIEW : overhead ? DESK_OVERHEAD_VIEW : seated && face === "front" ? SEATED_VIEW : FACE_VIEW[face];

  useEffect(() => {
    userMoved.current = false;
    const look = lookFromView(view.position, view.target);
    yaw.current = look.yaw;
    pitch.current = look.pitch;
  }, [face, seated, touring, view, viewRevision]);

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
      if (touringRef.current || seated || document.querySelector('[aria-modal="true"]')) return;
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
      clear();
    };
  }, [seated]);

  useFrame((_, dt) => {
    if (document.querySelector('[aria-modal="true"]')) { keys.current = { f: 0, r: 0 }; dragging.current = false; return; }
    dt = Math.min(dt, .05);
    if (touring || !userMoved.current) {
      const t = reduced || touring ? 1 : 1 - Math.pow(0.0008, dt);
      camera.position.lerp(view.position, t);
      if (overhead) {
        camera.position.copy(view.position);
      } else if (!seated) {
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




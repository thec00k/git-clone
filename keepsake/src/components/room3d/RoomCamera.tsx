import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { RoomFace } from "../../lib/roomLayout";
import {useActiveRoom} from "./useActiveRoom";
import {DISPLAY_CASE_VIEW,CABIN_DISPLAY_CASE_VIEW} from './ArtifactDisplayCase';
const EYE_Y = 1.32;
const WORKBENCH_VIEW={position:new THREE.Vector3(-.15,1.55,-1.12),target:new THREE.Vector3(-.15,.78,-1.72)};

const READING_VIEW = {position:new THREE.Vector3(.25,1.32,.45),target:new THREE.Vector3(-1.9,.45,1.35)};
/** Straight down on the oak. Open `?look=desk` to check contact. */
const DESK_OVERHEAD_VIEW = {
  position: new THREE.Vector3(-0.15, 2.05, -1.72),
  target: new THREE.Vector3(-0.15, 0.75, -1.76),
};

function wantsDeskOverhead() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("look") === "desk";
}


const WALK_SPEED = 2.35;
const LOOK_YAW = 0.0044;
const LOOK_PITCH = 0.0036;
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

function lookDir(yaw: number, pitch: number, target = new THREE.Vector3()) {
  const cp = Math.cos(pitch);
  return target.set(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
}

function clampInRoom(pos: THREE.Vector3, ROOM_WALK: {minX:number;maxX:number;minZ:number;maxZ:number}) {
  pos.x = THREE.MathUtils.clamp(pos.x, ROOM_WALK.minX, ROOM_WALK.maxX);
  pos.z = THREE.MathUtils.clamp(pos.z, ROOM_WALK.minZ, ROOM_WALK.maxZ);
  // Keep the viewer's body clear of the cabinet, including its handles.
  if (pos.z > .88 && pos.x > 1.30) pos.x = 1.30;
}

/** Eye-height look: yaw/pitch only. The camera never leaves standing height. */
export function EyeCamera({ face, seated, touring, viewRevision, reading = false, workbench = false, displayCase = false }: { face: RoomFace; seated: boolean; touring: boolean; viewRevision: number; reading?: boolean; workbench?:boolean; displayCase?:boolean }) {
  const activeRoom = useActiveRoom();
  const [photoView,setPhotoView]=useState<{position:THREE.Vector3;target:THREE.Vector3}|null>(null);
  useEffect(()=>{const change=(e:Event)=>{const d=(e as CustomEvent).detail;setPhotoView(d?{position:new THREE.Vector3(...d.position),target:new THREE.Vector3(...d.target)}:null);};window.addEventListener('ks-frame-view',change);return()=>window.removeEventListener('ks-frame-view',change);},[]);
  const ROOM_WALK = activeRoom.walkBounds;
  const FACE_VIEW = useMemo(() => Object.fromEntries(Object.entries(activeRoom.views).map(([face,v]) => [face,{position:new THREE.Vector3(...v.position),target:new THREE.Vector3(...v.target)}])) as Record<RoomFace,{position:THREE.Vector3;target:THREE.Vector3}>, [activeRoom]);
  const SEATED_VIEW = useMemo(() => ({position:new THREE.Vector3(...activeRoom.seated.position),target:new THREE.Vector3(...activeRoom.seated.target)}),[activeRoom]);
  const { camera, gl } = useThree();
  const aim=useMemo(()=>({matrix:new THREE.Matrix4(),quaternion:new THREE.Quaternion()}),[]);
  const scratch=useMemo(()=>({forward:new THREE.Vector3(),right:new THREE.Vector3(),target:new THREE.Vector3()}),[]);
  const diagnosticElapsed=useRef(0);
  const keys = useRef({ f: 0, r: 0 });
  const objectControls = useRef(false);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);
  const userMoved = useRef(false);
  useEffect(()=>{const change=(e:Event)=>{objectControls.current=!!(e as CustomEvent).detail;keys.current={f:0,r:0};dragging.current=false;};window.addEventListener('ks-object-controls',change);return()=>window.removeEventListener('ks-object-controls',change);},[]);
  const touringRef = useRef(touring);

  const seatedRef = useRef(seated);

  useEffect(() => { touringRef.current = touring||workbench||!!photoView; seatedRef.current = seated||workbench; }, [touring, seated,workbench,photoView]);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const overhead = wantsDeskOverhead();
  const view = photoView ?? (workbench ? WORKBENCH_VIEW : displayCase && !touring ? activeRoom.id==='snowy-mountain'?CABIN_DISPLAY_CASE_VIEW:DISPLAY_CASE_VIEW : reading && !touring ? READING_VIEW : overhead ? DESK_OVERHEAD_VIEW : seated && face === "front" ? SEATED_VIEW : FACE_VIEW[face]);

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
      if (touringRef.current||objectControls.current) return;
      if ((e.target as HTMLElement | null)?.closest?.("button, a, input, textarea, [role='dialog']")) return;
      dragging.current = true;
      // Begin a drag from the visible pose, including midway through a transition.
      camera.getWorldDirection(scratch.forward);
      yaw.current = Math.atan2(scratch.forward.x, -scratch.forward.z);
      pitch.current = Math.asin(THREE.MathUtils.clamp(scratch.forward.y,-1,1));
      userMoved.current = true;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current || touringRef.current||objectControls.current) return;
      // Mouse right looks right; mouse up looks up. Screen Y grows downward.
      yaw.current += e.movementX * LOOK_YAW;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * LOOK_PITCH, PITCH_MIN, PITCH_MAX);
    };
    const up = (e: PointerEvent) => {
      dragging.current = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      if (touringRef.current || seatedRef.current||objectControls.current) return;
      e.preventDefault();
      userMoved.current = true;
      const dir = lookDir(yaw.current, 0);
      camera.position.addScaledVector(dir, -e.deltaY * 0.0032);
      clampInRoom(camera.position, ROOM_WALK);
      camera.position.y = EYE_Y;
    };
    el.addEventListener("contextmenu", blockMenu);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("contextmenu", blockMenu);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [camera, gl, ROOM_WALK, scratch]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (touringRef.current || objectControls.current || seated || document.querySelector('[aria-modal="true"]')) return;
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
    if(objectControls.current)return;
    if (document.querySelector('[aria-modal="true"]')) { keys.current = { f: 0, r: 0 }; dragging.current = false; return; }
    dt = Math.min(dt, .05);
    if (touring || !userMoved.current) {
      const t = reduced || touring ? 1 : 1 - Math.pow(0.0008, dt);
      camera.position.lerp(view.position, t);
      if (overhead) {
        camera.position.copy(view.position);
      } else if (!seated&&!workbench&&!photoView) {
        camera.position.y = EYE_Y;
        clampInRoom(camera.position, ROOM_WALK);
      }
      aim.matrix.lookAt(camera.position,view.target,camera.up);
      aim.quaternion.setFromRotationMatrix(aim.matrix);
      camera.quaternion.slerp(aim.quaternion,t);
    } else {
      if (!seated && (keys.current.f || keys.current.r)) {
        const forward = lookDir(yaw.current, 0, scratch.forward);
        const right = scratch.right.set(-forward.z, 0, forward.x);
        const distance = WALK_SPEED * dt / Math.max(1, Math.hypot(keys.current.f, keys.current.r));
        camera.position.addScaledVector(forward, keys.current.f * distance);
        camera.position.addScaledVector(right, keys.current.r * distance);
      }
      if (seated) {
        camera.position.copy(SEATED_VIEW.position);
      } else {
        camera.position.y = EYE_Y;
        clampInRoom(camera.position, ROOM_WALK);
      }
      camera.lookAt(scratch.target.copy(camera.position).add(lookDir(yaw.current, pitch.current,scratch.forward)));
    }

    if(camera instanceof THREE.PerspectiveCamera){
      const bookFov=Math.max(42,THREE.MathUtils.radToDeg(2*Math.atan(.42/Math.max(.35,camera.aspect))));
      const targetFov=workbench?bookFov:seated?38:activeRoom.fov;
      const nextFov=Math.abs(camera.fov-targetFov)<.001?targetFov:THREE.MathUtils.lerp(camera.fov,targetFov,reduced?1:1-Math.exp(-dt*7));
      if(camera.fov!==nextFov){camera.fov=nextFov;camera.updateProjectionMatrix();}
    }
    diagnosticElapsed.current+=dt;
    if(diagnosticElapsed.current<.1)return;
    diagnosticElapsed.current=0;
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




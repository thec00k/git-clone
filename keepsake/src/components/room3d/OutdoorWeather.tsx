import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { Weather } from "../../types/app";

type WeatherRoom = "woodland" | "beachfront" | "cyberpunk";

const WEATHER_PROFILES: Record<WeatherRoom, {
  centerX: number; floorY: number; nearZ: number; width: number; height: number; depth: number;
  rain: string; snow: string; rainOpacity: number; snowOpacity: number;
}> = {
  woodland: { centerX: 0, floorY: 0, nearZ: -2.6, width: 8, height: 6, depth: 4, rain: "#c5d8d7", snow: "#eee9d8", rainOpacity: .42, snowOpacity: .8 },
  beachfront: { centerX: 0, floorY: -.2, nearZ: -3, width: 14, height: 7, depth: 10, rain: "#cfe5ec", snow: "#f4f7f2", rainOpacity: .48, snowOpacity: .82 },
  cyberpunk: { centerX: -.15, floorY: .85, nearZ: -2.42, width: 6, height: 5.7, depth: 7, rain: "#61d9ff", snow: "#dff8ff", rainOpacity: .52, snowOpacity: .88 },
};

/** Shared precipitation volume placed beyond each room's window. */
export function OutdoorWeather({ kind, count, room }: { kind: Exclude<Weather, "clear">; count: number; room: WeatherRoom }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const reduced = useReducedMotion();
  const profile = WEATHER_PROFILES[room];
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: profile.centerX + pseudoRandom(i * 3 + 1) * profile.width - profile.width / 2,
    y: profile.floorY + pseudoRandom(i * 3 + 2) * profile.height,
    z: profile.nearZ - pseudoRandom(i * 3 + 3) * profile.depth,
  })), [count, profile]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }, dt) => {
    if (!mesh.current) return;
    drops.forEach((drop, i) => {
      if (!reduced) {
        drop.y -= Math.min(dt, .05) * (kind === "rain" ? 3.2 : .42);
        if (drop.y < profile.floorY) drop.y += profile.height;
      }
      const drift = kind === "snow" && !reduced ? Math.sin(clock.elapsedTime * .3 + i) * .15 : 0;
      dummy.position.set(drop.x + drift, drop.y, drop.z);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} name={`Outdoor_Weather_${room}_${kind}`} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={kind === "rain" ? [.008, .16, .008] : [.028, .028, .028]} />
      <meshBasicMaterial
        color={kind === "rain" ? profile.rain : profile.snow}
        transparent
        opacity={kind === "rain" ? profile.rainOpacity : profile.snowOpacity}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

import { use, useEffect, useMemo } from "react";
import {loadRoomAsset} from "./roomAssetCache";
import * as THREE from "three";
import { LAMP_BULB } from "../../lib/roomHotspots";
import type { Environment } from "../../types/app";
import type { Phase } from "../room/RoomFurniture";
import {useActiveRoom} from "./useActiveRoom";

/** Clone materials once. The GLTF cache retains ownership of geometry/textures. */
export function useRoomAsset(phase: Phase, environment: Environment) {
  const activeRoom = useActiveRoom();
  const {scene} = use(loadRoomAsset(activeRoom.asset));
  const { cloned, materials } = useMemo(() => {
    const cloned = scene.clone(true);
    const materials: THREE.Material[] = [];
    cloned.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const copy = (material: THREE.Material) => {
        const local = material.clone(); materials.push(local); return local;
      };
      obj.material = Array.isArray(obj.material) ? obj.material.map(copy) : copy(obj.material);
      if (obj.name === "Outside_View" || obj.name === "Win_Glass") {
        const material = new THREE.MeshBasicMaterial();
        materials.push(material); obj.material = material;
        if (activeRoom.id !== "classic") obj.visible = false;
      }
    });
    return { cloned, materials };
  }, [scene, activeRoom.id]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  useEffect(() => {
    cloned.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (obj.name === "Outside_View" && mat instanceof THREE.MeshBasicMaterial) {
          mat.color.set(phase === "night" ? "#1a2230" : phase === "dusk" ? "#5a4034" : "#5c666e");
        }
        if (obj.name === "Win_Glass" && mat instanceof THREE.MeshBasicMaterial) {
          mat.color.set(phase === "night" ? "#243040" : "#6e7a82");
          mat.transparent = true; mat.opacity = .25; mat.depthWrite = false;
        }
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
        if (obj.name === "CRT_Screen") {
          mat.emissive.set(environment.musicOn ? "#3ec8c8" : "#102428");
          mat.emissiveIntensity = environment.musicOn ? 1.4 : .15;
        }
        if (obj.name === LAMP_BULB || /lamp.*bulb/i.test(obj.name)) {
          mat.emissive.set(environment.lampOn ? "#ffe6b0" : "#3a3228");
          mat.emissiveIntensity = environment.lampOn ? 2.4 : .08;
        }
      }
    });
  }, [cloned, environment.musicOn, environment.lampOn, phase]);
  return cloned;
}

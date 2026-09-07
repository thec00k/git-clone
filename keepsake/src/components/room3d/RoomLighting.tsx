import { ShelfLighting } from "./ShelfLighting";
import { MapPictureLight } from "./MapPictureLight";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CEILING_FAN_LIGHT, CEILING_FAN_OBJECT, CEILING_FAN_BLADES, WINDOW_SUN_OBJECT } from "../../lib/roomHotspots";
import type { Phase } from "../room/RoomFurniture";
import type { Environment } from "../../types/app";
import { worldPos, lampShadePos, deskLampCorner, STAND_IN_DESK } from "./sceneGeometry";
import { useReducedMotion } from "../../hooks/useReducedMotion";
const CEILING_FALLBACK = new THREE.Vector3(0, 3.02, 0);
const WINDOW_SUN_FALLBACK = new THREE.Vector3(-0.15, 2.28, -2.63);

/** Window carries day / dusk / night. The ceiling fan is a plain on/off, like the lamp. */
export function RoomLights({
  phase,
  environment,
  scene,
}: {
  phase: Phase;
  environment: Environment;
  scene?: THREE.Object3D;
}) {
  const reduced = useReducedMotion();
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
  const ambientRef=useRef<THREE.AmbientLight>(null);
  const sunRef=useRef<THREE.DirectionalLight>(null);
  const ceilingRef=useRef<THREE.PointLight>(null);
  const skyRef=useRef<THREE.HemisphereLight>(null);
  const lampRef = useRef<THREE.PointLight>(null);


  const lightColor=useMemo(()=>new THREE.Color(night?'#c8d4f0':dusk?'#ffb070':'#ffe6b8'),[night,dusk]);
  const ambientColor=useMemo(()=>new THREE.Color(night?'#8a9bb8':'#fff4e6'),[night]);
  useFrame((_, dt) => {
    const t=reduced?1:1-Math.exp(-dt*3);
    const lights:[[THREE.Light|null,number],[THREE.Light|null,number],[THREE.Light|null,number],[THREE.Light|null,number],[THREE.Light|null,number]]=[
      [ambientRef.current,night?.16:dusk?.24:.34],[sunRef.current,night?.55:dusk?1.35:2.1],[ceilingRef.current,environment.ceilingOn!==false?3.2:0],[lampRef.current,environment.lampOn?(night?3.8:dusk?2.8:1.6):0],[skyRef.current,night?.25:.55]];
    lights.forEach(([light,target])=>{if(light)light.intensity=THREE.MathUtils.lerp(light.intensity,target,t);});
    sunRef.current?.color.lerp(lightColor,t);ambientRef.current?.color.lerp(ambientColor,t);
    const blades =
      scene?.getObjectByName(CEILING_FAN_BLADES) ??
      scene?.getObjectByName(CEILING_FAN_OBJECT)?.children.find((child) => /blade/i.test(child.name));
    if (blades && !reduced && environment.ceilingOn !== false) blades.rotation.y += dt * 1.35;
    if (scene && lampRef.current) {
      const p = lampShadePos(scene);
      lampRef.current.position.copy(p);
    }
  });




  return (
    <>
      <ambientLight ref={ambientRef} intensity={.25} color="#fff4e6" />
      <hemisphereLight ref={skyRef} args={["#bac4ba", "#3f4931", .4]} />
      <directionalLight position={windowSun.toArray()} ref={sunRef} intensity={1} color="#ffe6b8" castShadow shadow-mapSize={[1024,1024]} shadow-bias={-.001} shadow-normalBias={.025} />
      {(
        <pointLight ref={ceilingRef} position={ceiling.toArray()} intensity={3.2} color="#fff6ea" distance={9} />
      )}
      {(
        <pointLight
          ref={lampRef}
          position={(scene ? lampShadePos(scene) : deskLampCorner(STAND_IN_DESK)).toArray()}
          intensity={1.6}
          color="#ffb56a"
          distance={1.85}
        />
      )}
      <ShelfLighting scene={scene} on={environment.shelfLit} />
      <MapPictureLight scene={scene} night={night} />
    </>
  );
}

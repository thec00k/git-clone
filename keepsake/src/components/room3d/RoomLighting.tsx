import {ShelfLighting} from './ShelfLighting';
import {motionFactor, MOTION} from '../../lib/motion';
import {MapPictureLight} from './MapPictureLight';
import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {
  CEILING_FAN_LIGHT,
  CEILING_FAN_OBJECT,
  CEILING_FAN_BLADES,
  WINDOW_SUN_OBJECT,
} from '../../lib/roomHotspots';
import type {Phase} from '../room/RoomFurniture';
import type {Environment} from '../../types/app';
import {worldPos, lampShadePos, deskLampCorner, STAND_IN_DESK} from './sceneGeometry';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useActiveRoom} from './useActiveRoom';
import {useApp} from '../../store/appStore';
import {useWorkbench} from '../../store/workbench';
import {MEMORY_MOODS} from '../../lib/memoryAtmosphere';
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
  const {activeBook} = useApp();
  const {phase: bookPhase} = useWorkbench();
  const memoryMood =
    environment.memoryLighting && bookPhase === 'editing' ? activeBook?.memoryMood : undefined;
  const coastal = useActiveRoom().id === 'beachfront';
  const neon = useActiveRoom().id === 'cyberpunk';
  const woodland = useActiveRoom().id === 'woodland';
  const night = phase === 'night';
  const dusk = phase === 'dusk';
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
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ceilingRef = useRef<THREE.PointLight>(null);
  const skyRef = useRef<THREE.HemisphereLight>(null);
  const lampRef = useRef<THREE.PointLight>(null);

  const lightColor = useMemo(() => {
    // Woodland dusk window light is a pale peach, not saturated orange: the room's warm pool comes from the desk lamp.
    const duskColor = woodland ? '#ffcfa6' : '#ffb070';
    const color = new THREE.Color(neon ? '#939cff' : night ? '#c8d4f0' : dusk ? duskColor : '#ffe6b8');
    if (memoryMood && memoryMood !== 'neutral' && MEMORY_MOODS[memoryMood])
      color.lerp(new THREE.Color(MEMORY_MOODS[memoryMood].light), 0.22);
    return color;
  }, [night, dusk, memoryMood, neon, woodland]);
  // Woodland dusk gets a cool fill (the art bible's warm-pool-against-cool-room contrast); other rooms keep their warm fill.
  const coolDusk = woodland && dusk;
  // The same pass for Woodland's other hours: at night the room is cool and dim and the desk
  // lamp leads; by day the window light leads and the lamp is a quiet accent.
  const woodlandNight = woodland && night;
  const woodlandDay = woodland && !night && !dusk;
  const ambientColor = useMemo(
    () => new THREE.Color(night ? '#8a9bb8' : coolDusk ? '#b9c6dc' : woodlandDay ? '#f6f1e8' : '#fff4e6'),
    [night, coolDusk, woodlandDay],
  );
  const skyColor = useMemo(
    () => new THREE.Color(coolDusk ? '#8fa3bd' : woodlandNight ? '#5d6f8c' : '#bac4ba'),
    [coolDusk, woodlandNight],
  );
  const groundColor = useMemo(
    () => new THREE.Color(coolDusk ? '#3a342c' : woodlandNight ? '#2a2622' : '#3f4931'),
    [coolDusk, woodlandNight],
  );
  useFrame((_, dt) => {
    const t = motionFactor(dt, MOTION.light, reduced);
    const lights: [
      [THREE.Light | null, number],
      [THREE.Light | null, number],
      [THREE.Light | null, number],
      [THREE.Light | null, number],
      [THREE.Light | null, number],
    ] = [
      [ambientRef.current, night ? (woodland ? 0.2 : 0.16) : dusk ? (woodland ? 0.3 : 0.24) : 0.34],
      [sunRef.current, neon ? 0.65 : night ? 0.55 : dusk ? (woodland ? 0.9 : 1.35) : 2.1],
      [
        ceilingRef.current,
        // The Woodland ceiling light eases down at dusk and night so the desk lamp pool leads
        // (scrapbook first), and a little by day so the window light leads.
        environment.ceilingOn !== false
          ? coolDusk
            ? 1.1
            : woodlandNight
              ? 0.9
              : woodlandDay
                ? 2.4
                : coastal
                  ? 2.3
                  : 3.2
          : 0,
      ],
      [
        lampRef.current,
        environment.lampOn && !neon
          ? (night ? (woodland ? 2.5 : 3.8) : dusk ? (woodland ? 2.6 : 2.8) : woodland ? 1.0 : 1.6) *
            (coastal ? 0.28 : 1)
          : 0,
      ],
      [skyRef.current, night ? (woodland ? 0.3 : 0.25) : coolDusk ? 0.6 : 0.55],
    ];
    lights.forEach(([light, target]) => {
      if (light) light.intensity = THREE.MathUtils.lerp(light.intensity, target, t);
    });
    sunRef.current?.color.lerp(lightColor, t);
    ambientRef.current?.color.lerp(ambientColor, t);
    skyRef.current?.color.lerp(skyColor, t);
    skyRef.current?.groundColor.lerp(groundColor, t);
    const blades =
      scene?.getObjectByName(CEILING_FAN_BLADES) ??
      scene?.getObjectByName(CEILING_FAN_OBJECT)?.children.find(child => /blade/i.test(child.name));
    if (blades && !reduced && environment.ceilingOn !== false) blades.rotation.y += Math.min(dt, 0.05) * 1.35;
    if (scene && lampRef.current) {
      const p = lampShadePos(scene);
      lampRef.current.position.copy(p);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.25} color="#fff4e6" />
      <hemisphereLight ref={skyRef} args={['#bac4ba', '#3f4931', 0.4]} />
      <directionalLight
        position={windowSun.toArray()}
        ref={sunRef}
        intensity={1}
        color="#ffe6b8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={12}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.00008}
        shadow-normalBias={0.003}
      />
      {
        <pointLight
          ref={ceilingRef}
          position={ceiling.toArray()}
          intensity={3.2}
          color={neon ? '#cac3ff' : '#fff6ea'}
          distance={9}
        />
      }
      {
        <pointLight
          ref={lampRef}
          position={(scene ? lampShadePos(scene) : deskLampCorner(STAND_IN_DESK)).toArray()}
          intensity={1.6}
          color={coastal ? '#ffe1b5' : woodlandDay ? '#ffd9b0' : woodland ? '#ffcc9c' : '#ffb56a'}
          distance={1.85}
        />
      }
      <ShelfLighting scene={scene} on={environment.shelfLit} />
      {!neon && <MapPictureLight scene={scene} night={night} />}
    </>
  );
}

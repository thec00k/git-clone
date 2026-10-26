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

/**
 * Light strengths per room and time of day (intensities only; lights are never mounted or removed, see
 * check-constant-lights). Each room follows the art bible's hierarchy: by day the window leads and the
 * lamp is a quiet accent; at dusk and night the ceiling eases down and the desk lamp pool leads, so the
 * scrapbook reads first against a cooler room. Woodland's values are its October 17 lighting pass; the
 * other rooms got the same pass on October 26.
 */
type Grade = {ambient: number; sun: number; ceiling: number; lamp: number; sky: number};
const GRADES: Record<string, Record<'day' | 'dusk' | 'night', Grade>> = {
  woodland: {
    day: {ambient: 0.34, sun: 2.1, ceiling: 2.4, lamp: 1.0, sky: 0.55},
    dusk: {ambient: 0.3, sun: 0.9, ceiling: 1.1, lamp: 2.6, sky: 0.6},
    night: {ambient: 0.2, sun: 0.55, ceiling: 0.9, lamp: 2.5, sky: 0.3},
  },
  // Beachfront's lamp has a small pale shade, so it needs less power than Woodland's for the same pool.
  beachfront: {
    day: {ambient: 0.34, sun: 2.1, ceiling: 2.3, lamp: 0.45, sky: 0.55},
    dusk: {ambient: 0.26, sun: 1.2, ceiling: 1.3, lamp: 1.5, sky: 0.5},
    night: {ambient: 0.18, sun: 0.5, ceiling: 0.85, lamp: 1.9, sky: 0.3},
  },
  // Neon City is always night outside; the window haze stays constant and only the room's own lights grade.
  // The lava lamp doubles as the task light so the book is lit on the dark desk.
  cyberpunk: {
    day: {ambient: 0.34, sun: 0.65, ceiling: 2.0, lamp: 1.3, sky: 0.55},
    dusk: {ambient: 0.24, sun: 0.65, ceiling: 1.6, lamp: 1.6, sky: 0.5},
    night: {ambient: 0.16, sun: 0.65, ceiling: 1.3, lamp: 1.8, sky: 0.3},
  },
  // Sky Castle is white marble and crystal: it clips with Woodland's strengths, so everything is lower.
  'sky-castle': {
    day: {ambient: 0.26, sun: 1.0, ceiling: 1.0, lamp: 0.7, sky: 0.4},
    dusk: {ambient: 0.2, sun: 0.7, ceiling: 0.8, lamp: 1.6, sky: 0.38},
    night: {ambient: 0.14, sun: 0.35, ceiling: 0.55, lamp: 2.0, sky: 0.22},
  },
};

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
  const activeId = useActiveRoom().id;
  const woodland = activeId === 'woodland';
  const skyCastle = activeId === 'sky-castle';
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
    const color = new THREE.Color(
      neon
        ? '#ffa463' // sodium-amber city haze through the window (Blade Runner pass, 2026-10-25)
        : skyCastle
          ? night
            ? '#9bc5e8'
            : dusk
              ? '#efcbd8'
              : '#eff5ff'
          : night
            ? '#c8d4f0'
            : dusk
              ? duskColor
              : '#ffe6b8',
    );
    if (memoryMood && memoryMood !== 'neutral' && MEMORY_MOODS[memoryMood])
      color.lerp(new THREE.Color(MEMORY_MOODS[memoryMood].light), 0.22);
    return color;
  }, [night, dusk, memoryMood, neon, woodland, skyCastle]);
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
  // At night Beachfront and Sky Castle take a cool, dim sky fill as well, so the lamp pool reads warm against it.
  const otherNight = night && (coastal || skyCastle);
  const skyColor = useMemo(
    () =>
      new THREE.Color(
        otherNight
          ? '#5e7090'
          : skyCastle
            ? '#c2dbf1'
            : coolDusk
              ? '#8fa3bd'
              : woodlandNight
                ? '#5d6f8c'
                : '#bac4ba',
      ),
    [coolDusk, woodlandNight, skyCastle, otherNight],
  );
  const groundColor = useMemo(
    () =>
      new THREE.Color(
        otherNight
          ? '#2b2c36'
          : skyCastle
            ? '#9c97b3'
            : coolDusk
              ? '#3a342c'
              : woodlandNight
                ? '#2a2622'
                : '#3f4931',
      ),
    [coolDusk, woodlandNight, skyCastle, otherNight],
  );
  useFrame((_, dt) => {
    const t = motionFactor(dt, MOTION.light, reduced);
    const g = GRADES[activeId] ?? GRADES.woodland;
    const grade = g[night ? 'night' : dusk ? 'dusk' : 'day'];
    const lights: [THREE.Light | null, number][] = [
      [ambientRef.current, grade.ambient],
      [sunRef.current, grade.sun],
      [ceilingRef.current, environment.ceilingOn !== false ? grade.ceiling : 0],
      [lampRef.current, environment.lampOn ? grade.lamp : 0],
      [skyRef.current, grade.sky],
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
          color={
            coastal || skyCastle
              ? '#ffe1b5'
              : neon
                ? '#ffd0c4' // the lava lamp's peach-pink glow on the desk, pale enough for paper to stay paper
                : woodlandDay
                  ? '#ffd9b0'
                  : woodland
                    ? '#ffcc9c'
                    : '#ffb56a'
          }
          distance={1.85}
        />
      }
      <ShelfLighting scene={scene} on={environment.shelfLit} />
      {!neon && <MapPictureLight scene={scene} night={night} />}
    </>
  );
}

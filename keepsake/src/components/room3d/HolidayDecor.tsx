import {useEffect,useMemo,useRef,type ReactNode} from 'react';
import * as THREE from 'three';
import {useSeasonal} from '../../hooks/useSeasonal';
import type {HolidayId} from '../../types/app';

/**
 * Seasonal dressing for the Woodland room, driven by the season engine (`useSeasonal().holiday`).
 * Deliberately simple paper-craft shapes in flat colours: they are placeholders for commissioned art
 * but real enough to judge placement and mood. Nothing here animates, so reduced motion needs no case.
 * Positions come from the Woodland study model: mantel top about y 1.04, front z about 1.74; window opening x -1.12..0.82, top rail y 3.05.
 */
const MANTEL = {minX: -1.4, maxX: -0.42, y: 1.04, z: 1.78};
const paper = (color: string, emissive = '#000000', ei = 0) => new THREE.MeshStandardMaterial({color, roughness: .92, metalness: 0, emissive, emissiveIntensity: ei, flatShading: true});

function sag(a: THREE.Vector3, b: THREE.Vector3, depth: number, t: number) {
  const p = a.clone().lerp(b, t); p.y -= depth * 4 * t * (1 - t); return p;
}
function heartShape() {
  const s = new THREE.Shape(); s.moveTo(0, -.5); s.bezierCurveTo(-.7, .1, -.45, .62, 0, .3); s.bezierCurveTo(.45, .62, .7, .1, 0, -.5); return s;
}
function Garland({a, b, depth, count, kind, colors, size = .13, thickness = .004, lineColor = '#6b5a44'}: {a: THREE.Vector3; b: THREE.Vector3; depth: number; count: number; kind: 'flag' | 'heart'; colors: string[]; size?: number; thickness?: number; lineColor?: string}) {
  const geo = useMemo(() => {
    if (kind === 'heart') return new THREE.ShapeGeometry(heartShape());
    const s = new THREE.Shape(); s.moveTo(-.5, 0); s.lineTo(.5, 0); s.lineTo(0, -1.15); s.closePath(); return new THREE.ShapeGeometry(s);
  }, [kind]);
  const mats = useMemo(() => colors.map(c => new THREE.MeshStandardMaterial({color: c, roughness: .95, side: THREE.DoubleSide, flatShading: true})), [colors.join(',')]);
  const line = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length: 13}, (_, i) => sag(a, b, depth, i / 12))), 24, thickness, 5), [a, b, depth, thickness]);
  const lineMat = useMemo(() => paper(lineColor), [lineColor]);
  return <group>
    <mesh geometry={line} material={lineMat}/>
    {Array.from({length: count}, (_, i) => {
      const t = (i + .5) / count, p = sag(a, b, depth, t);
      return <mesh key={i} geometry={geo} material={mats[i % mats.length]} position={[p.x, p.y - (kind === 'heart' ? size * .55 : 0), p.z + .005]} scale={size * (kind === 'heart' ? 1 : .95)} rotation={[0, 0, (i % 2 ? .05 : -.05)]}/>;
    })}
  </group>;
}
const WIN_A = new THREE.Vector3(-1.1, 3.0, -2.06), WIN_B = new THREE.Vector3(.8, 3.0, -2.06);
// Drape the Christmas garland across the mantel's front face so it reads from the room (on top it hid behind the edge).
const MANTEL_A = new THREE.Vector3(MANTEL.minX + .02, MANTEL.y - .04, MANTEL.z - .13), MANTEL_B = new THREE.Vector3(MANTEL.maxX - .02, MANTEL.y - .04, MANTEL.z - .13);

function Pumpkin({position, scale = 1}: {position: [number, number, number]; scale?: number}) {
  const body = useMemo(() => paper('#e0762a', '#ff8a2a', .25), []), stem = useMemo(() => paper('#5b6b2e'), []);
  return <group position={position} scale={scale}>
    <mesh material={body} scale={[1, .8, 1]}><sphereGeometry args={[.09, 12, 8]}/></mesh>
    <mesh material={stem} position={[0, .08, 0]}><boxGeometry args={[.02, .04, .02]}/></mesh>
  </group>;
}
function Bat({position, rot = 0, s = 1}: {position: [number, number, number]; rot?: number; s?: number}) {
  const geo = useMemo(() => {
    const sh = new THREE.Shape(); sh.moveTo(0, .02); sh.lineTo(.05, .06); sh.lineTo(.16, .08); sh.lineTo(.12, .02); sh.lineTo(.1, -.03); sh.lineTo(.06, 0); sh.lineTo(.03, -.05); sh.lineTo(0, -.02);
    sh.lineTo(-.03, -.05); sh.lineTo(-.06, 0); sh.lineTo(-.1, -.03); sh.lineTo(-.12, .02); sh.lineTo(-.16, .08); sh.lineTo(-.05, .06); sh.closePath(); return new THREE.ShapeGeometry(sh);
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#1d1722', roughness: 1, side: THREE.DoubleSide}), []);
  return <mesh geometry={geo} material={mat} position={position} rotation={[0, 0, rot]} scale={s * 1.6}/>;
}
function Tree() {
  const green = useMemo(() => paper('#2f5a3c'), []), trunk = useMemo(() => paper('#5a4129'), []), star = useMemo(() => paper('#f2d36b', '#ffd35a', 1.2), []);
  const bulbs = useMemo(() => ['#c0392b', '#f2d36b', '#e8e1cc', '#3b6fb0'].map(c => paper(c, c, .5)), []);
  const spots: [number, number, number, number][] = [[.15, .2, .1, 0], [-.12, .3, .1, 1], [.05, .45, .12, 2], [-.1, .55, .07, 3], [.1, .13, -.14, 1], [-.02, .62, .09, 0]];
  return <group position={[-.06, 0, 1.66]}>
    <mesh material={trunk} position={[0, .05, 0]}><cylinderGeometry args={[.025, .03, .1, 6]}/></mesh>
    <mesh material={green} position={[0, .2, 0]}><coneGeometry args={[.23, .3, 9]}/></mesh>
    <mesh material={green} position={[0, .4, 0]}><coneGeometry args={[.18, .28, 9]}/></mesh>
    <mesh material={green} position={[0, .58, 0]}><coneGeometry args={[.12, .24, 9]}/></mesh>
    <mesh material={star} position={[0, .73, 0]}><octahedronGeometry args={[.04]}/></mesh>
    {spots.map(([x, y, z, m], i) => <mesh key={i} material={bulbs[m]} position={[x, y, z]}><sphereGeometry args={[.017, 6, 5]}/></mesh>)}
  </group>;
}
function Stocking({x, color}: {x: number; color: string}) {
  const red = useMemo(() => paper(color), [color]), cuff = useMemo(() => paper('#f4efe2'), []);
  return <group position={[x, .84, MANTEL.z - .15]}>
    <mesh material={red} position={[0, .02, 0]}><boxGeometry args={[.07, .17, .035]}/></mesh>
    <mesh material={red} position={[.03, -.07, 0]}><boxGeometry args={[.11, .06, .035]}/></mesh>
    <mesh material={cuff} position={[0, .11, 0]}><boxGeometry args={[.08, .035, .04]}/></mesh>
  </group>;
}
function Eggs() {
  const colors = ['#f4b6c2', '#bfe3d0', '#f7e2a0', '#c7c3f0', '#f4b6c2', '#bfe3d0'];
  const mats = useMemo(() => colors.map(c => paper(c)), []);
  const basket = useMemo(() => paper('#a77b45'), []);
  return <group position={[-1.12, MANTEL.y, MANTEL.z - .06]}>
    <mesh material={basket} position={[0, .03, 0]}><cylinderGeometry args={[.1, .075, .07, 10]}/></mesh>
    {colors.map((_, i) => <mesh key={i} material={mats[i]} position={[(i % 3 - 1) * .045, .09 + Math.floor(i / 3) * .02, (Math.floor(i / 3) - .5) * .04]} scale={[1, 1.25, 1]}><sphereGeometry args={[.028, 8, 6]}/></mesh>)}
  </group>;
}
function Tulips() {
  const stem = useMemo(() => paper('#4f7a43'), []), petals = useMemo(() => ['#f08aa5', '#f7d36b', '#c9a2e8'].map(c => paper(c)), []), vase = useMemo(() => paper('#cfe0e6'), []);
  return <group position={[-.62, MANTEL.y, MANTEL.z - .06]}>
    <mesh material={vase} position={[0, .045, 0]}><cylinderGeometry args={[.04, .05, .09, 8]}/></mesh>
    {[-.03, 0, .03].map((x, i) => <group key={i} position={[x, .09, 0]} rotation={[0, 0, x * 2.5]}>
      <mesh material={stem} position={[0, .08, 0]}><cylinderGeometry args={[.004, .004, .16, 4]}/></mesh>
      <mesh material={petals[i]} position={[0, .17, 0]}><coneGeometry args={[.026, .06, 6]}/></mesh>
    </group>)}
  </group>;
}
function Flag() {
  const pole = useMemo(() => paper('#8a6b45'), []);
  const mats = useMemo(() => ['#b8312f', '#f4efe2', '#2a4a8c'].map(c => new THREE.MeshStandardMaterial({color: c, roughness: .95, side: THREE.DoubleSide})), []);
  return <group position={[-.7, MANTEL.y, MANTEL.z - .06]}>
    <mesh material={pole} position={[0, .13, 0]}><cylinderGeometry args={[.005, .005, .26, 4]}/></mesh>
    {[0, 1, 2].map(i => <mesh key={i} material={mats[i]} position={[.07, .2 - i * .03, 0]}><planeGeometry args={[.14, .03]}/></mesh>)}
  </group>;
}
function HeartsOnMantel() {
  const geo = useMemo(() => new THREE.ShapeGeometry(heartShape()), []);
  const mats = useMemo(() => ['#c9374f', '#f08aa5', '#e8566e'].map(c => new THREE.MeshStandardMaterial({color: c, roughness: .9, side: THREE.DoubleSide})), []);
  return <group>{[[-1.2, .1, 0], [-.9, .14, 1], [-.62, .09, 2]].map(([x, s, m], i) => <mesh key={i} geometry={geo} material={mats[m]} position={[x, MANTEL.y + s * .6, MANTEL.z - .08]} scale={s * 1.3}/>)}</group>;
}

export function HolidayDecor({coastal = false}: {coastal?: boolean}) {
  const {holiday} = useSeasonal();
  return <group name="Holiday_Decor" userData={{holiday}}>{holiday && <HolidaySet key={(coastal ? 'coast-' : '') + holiday} holiday={holiday} coastal={coastal}/>}</group>;
}
/** Keyed by holiday so a change unmounts the old set. Materials and geometries are created in useMemo and passed
 * as props, which react-three-fiber does not dispose, so collect them after mount and free them on unmount. */
function HolidaySet({holiday, coastal}: {holiday: HolidayId; coastal: boolean}) {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const owned = new Set<{dispose(): void}>();
    group.current?.traverse(o => { if (o instanceof THREE.Mesh) { owned.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => owned.add(m)); } });
    return () => owned.forEach(x => x.dispose());
  }, []);
  return <group ref={group}>{coastal ? COASTAL[holiday]() : DECOR[holiday]()}</group>;
}
const DECOR: Record<HolidayId, () => ReactNode> = {
  christmas: () => <>
    <Garland a={MANTEL_A} b={MANTEL_B} depth={.09} count={9} kind="flag" colors={['#b23a3a', '#f2d36b']} size={.035} thickness={.024} lineColor="#3f6b45"/>
    <Stocking x={-1.2} color="#b23a3a"/><Stocking x={-.91} color="#2f6b4f"/><Stocking x={-.62} color="#b23a3a"/>
    <Tree/>
  </>,
  halloween: () => <>
    <Pumpkin position={[-1.25, MANTEL.y + .08, MANTEL.z - .06]}/><Pumpkin position={[-.95, MANTEL.y + .06, MANTEL.z - .06]} scale={.75}/><Pumpkin position={[-.62, MANTEL.y + .07, MANTEL.z - .06]} scale={.9}/>
    <Pumpkin position={[-.05, .12, 1.62]} scale={1.4}/>
    {[[-1.5, 2.6, .3, 1], [-1.3, 2.35, -.4, .8], [-1.55, 2.2, .5, .9], [1.15, 2.55, -.3, 1], [1.35, 2.3, .4, .8]].map(([x, y, r, s], i) => <Bat key={i} position={[x, y, -2.08]} rot={r} s={s}/>)}
  </>,
  valentines: () => <>
    <Garland a={WIN_A} b={WIN_B} depth={.18} count={11} kind="heart" colors={['#c9374f', '#f08aa5', '#e8566e', '#f4c6d0']} size={.12}/>
    <HeartsOnMantel/>
  </>,
  easter: () => <><Eggs/><Tulips/></>,
  'independence-day': () => <>
    <Garland a={WIN_A} b={WIN_B} depth={.16} count={12} kind="flag" colors={['#b8312f', '#f4efe2', '#2a4a8c']} size={.13}/>
    <Flag/>
  </>,
};

/** Beachfront has no hearth: one garland across the arched window (below the string lights, which run y 2.0-3.08). */
const ARCH_A = new THREE.Vector3(-1.0, 2.62, -2.0), ARCH_B = new THREE.Vector3(.78, 2.62, -2.0);
const COASTAL: Record<HolidayId, () => ReactNode> = {
  christmas: () => <Garland a={ARCH_A} b={ARCH_B} depth={.12} count={11} kind="flag" colors={['#b23a3a', '#2f6b4f', '#f2d36b']} size={.11}/>,
  halloween: () => <><Garland a={ARCH_A} b={ARCH_B} depth={.12} count={11} kind="flag" colors={['#e0762a', '#1d1722']} size={.11}/>{[[-1.45, 2.4, .3], [1.15, 2.5, -.3]].map(([x, y, r], i) => <Bat key={i} position={[x, y, -2.0]} rot={r}/>)}</>,
  valentines: () => <Garland a={ARCH_A} b={ARCH_B} depth={.14} count={11} kind="heart" colors={['#c9374f', '#f08aa5', '#e8566e', '#f4c6d0']} size={.11}/>,
  easter: () => <Garland a={ARCH_A} b={ARCH_B} depth={.12} count={11} kind="flag" colors={['#f4b6c2', '#bfe3d0', '#f7e2a0', '#c7c3f0']} size={.11}/>,
  'independence-day': () => <Garland a={ARCH_A} b={ARCH_B} depth={.12} count={12} kind="flag" colors={['#b8312f', '#f4efe2', '#2a4a8c']} size={.11}/>,
};

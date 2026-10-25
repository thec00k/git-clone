import {useEffect, useMemo, useRef, type ReactNode} from 'react';
import * as THREE from 'three';
import {useSeasonal} from '../../hooks/useSeasonal';
import type {HolidayId} from '../../types/app';

/**
 * Seasonal dressing for the Woodland room, driven by the season engine (`useSeasonal().holiday`).
 * Deliberately simple paper-craft shapes in flat colours: they are placeholders for commissioned art
 * but real enough to judge placement and mood. Nothing here animates, so reduced motion needs no case.
 * Positions come from the Woodland study model: mantel top y 1.04, front edge z 1.65; the chimney stones start at z 1.73,
 * so the shelf in front of them is only 8 cm deep. `z` is that stone face. Window opening x -1.12..0.82, top rail y 3.05.
 */
const MANTEL = {minX: -1.4, maxX: -0.42, y: 1.04, z: 1.74};
const paper = (color: string, emissive = '#000000', ei = 0) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    emissive,
    emissiveIntensity: ei,
    flatShading: true,
  });

function sag(a: THREE.Vector3, b: THREE.Vector3, depth: number, t: number) {
  const p = a.clone().lerp(b, t);
  p.y -= depth * 4 * t * (1 - t);
  return p;
}
function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.7, 0.1, -0.45, 0.62, 0, 0.3);
  s.bezierCurveTo(0.45, 0.62, 0.7, 0.1, 0, -0.5);
  return s;
}
function Garland({
  a,
  b,
  depth,
  count,
  kind,
  colors,
  size = 0.13,
  thickness = 0.004,
  lineColor = '#6b5a44',
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  depth: number;
  count: number;
  kind: 'flag' | 'heart';
  colors: string[];
  size?: number;
  thickness?: number;
  lineColor?: string;
}) {
  const geo = useMemo(() => {
    if (kind === 'heart') return new THREE.ShapeGeometry(heartShape());
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0, -1.15);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [kind]);
  const mats = useMemo(
    () =>
      colors.map(
        c =>
          new THREE.MeshStandardMaterial({
            color: c,
            roughness: 0.95,
            side: THREE.DoubleSide,
            flatShading: true,
          }),
      ),
    [colors.join(',')],
  );
  const line = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(Array.from({length: 13}, (_, i) => sag(a, b, depth, i / 12))),
        24,
        thickness,
        5,
      ),
    [a, b, depth, thickness],
  );
  const lineMat = useMemo(() => paper(lineColor), [lineColor]);
  return (
    <group>
      <mesh geometry={line} material={lineMat} />
      {Array.from({length: count}, (_, i) => {
        const t = (i + 0.5) / count,
          p = sag(a, b, depth, t);
        return (
          <mesh
            key={i}
            geometry={geo}
            material={mats[i % mats.length]}
            position={[p.x, p.y - (kind === 'heart' ? size * 0.55 : 0), p.z + 0.005]}
            scale={size * (kind === 'heart' ? 1 : 0.95)}
            rotation={[0, 0, i % 2 ? 0.05 : -0.05]}
          />
        );
      })}
    </group>
  );
}
const WIN_A = new THREE.Vector3(-1.1, 3.0, -2.06),
  WIN_B = new THREE.Vector3(0.8, 3.0, -2.06);
// Drape the Christmas garland across the mantel's front face so it reads from the room (on top it hid behind the edge).
const MANTEL_A = new THREE.Vector3(MANTEL.minX + 0.02, MANTEL.y - 0.04, MANTEL.z - 0.13),
  MANTEL_B = new THREE.Vector3(MANTEL.maxX - 0.02, MANTEL.y - 0.04, MANTEL.z - 0.13);

function Pumpkin({position, scale = 1}: {position: [number, number, number]; scale?: number}) {
  const body = useMemo(() => paper('#e0762a', '#ff8a2a', 0.25), []),
    stem = useMemo(() => paper('#5b6b2e'), []);
  return (
    <group position={position} scale={scale}>
      <mesh material={body} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.09, 12, 8]} />
      </mesh>
      <mesh material={stem} position={[0, 0.08, 0]}>
        <boxGeometry args={[0.02, 0.04, 0.02]} />
      </mesh>
    </group>
  );
}
function Bat({position, rot = 0, s = 1}: {position: [number, number, number]; rot?: number; s?: number}) {
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.02);
    sh.lineTo(0.05, 0.06);
    sh.lineTo(0.16, 0.08);
    sh.lineTo(0.12, 0.02);
    sh.lineTo(0.1, -0.03);
    sh.lineTo(0.06, 0);
    sh.lineTo(0.03, -0.05);
    sh.lineTo(0, -0.02);
    sh.lineTo(-0.03, -0.05);
    sh.lineTo(-0.06, 0);
    sh.lineTo(-0.1, -0.03);
    sh.lineTo(-0.12, 0.02);
    sh.lineTo(-0.16, 0.08);
    sh.lineTo(-0.05, 0.06);
    sh.closePath();
    return new THREE.ShapeGeometry(sh);
  }, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({color: '#1d1722', roughness: 1, side: THREE.DoubleSide}),
    [],
  );
  return <mesh geometry={geo} material={mat} position={position} rotation={[0, 0, rot]} scale={s * 1.6} />;
}
function Tree({position}: {position: [number, number, number]}) {
  const green = useMemo(() => paper('#2f5a3c'), []),
    trunk = useMemo(() => paper('#5a4129'), []),
    stand = useMemo(() => paper('#8c2f2a'), []),
    star = useMemo(() => paper('#f2d36b', '#ffd35a', 1.2), []);
  const bulbs = useMemo(() => ['#c0392b', '#f2d36b', '#e8e1cc', '#3b6fb0'].map(c => paper(c, c, 0.5)), []);
  const spots: [number, number, number, number][] = [
    [0.15, 0.2, 0.1, 0],
    [-0.12, 0.3, 0.1, 1],
    [0.05, 0.45, 0.12, 2],
    [-0.1, 0.55, 0.07, 3],
    [0.1, 0.13, -0.14, 1],
    [-0.02, 0.62, 0.09, 0],
  ];
  return (
    <group position={position}>
      {/* A bucket stand and a short bare trunk under the branches. */}
      <mesh material={stand} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.1, 0.085, 0.08, 10]} />
      </mesh>
      <mesh material={trunk} position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.12, 6]} />
      </mesh>
      <group position={[0, 0.12, 0]}>
        <mesh material={green} position={[0, 0.2, 0]}>
          <coneGeometry args={[0.23, 0.3, 9]} />
        </mesh>
        <mesh material={green} position={[0, 0.4, 0]}>
          <coneGeometry args={[0.18, 0.28, 9]} />
        </mesh>
        <mesh material={green} position={[0, 0.58, 0]}>
          <coneGeometry args={[0.12, 0.24, 9]} />
        </mesh>
        <mesh material={star} position={[0, 0.73, 0]}>
          <octahedronGeometry args={[0.04]} />
        </mesh>
        {spots.map(([x, y, z, m], i) => (
          <mesh key={i} material={bulbs[m]} position={[x, y, z]}>
            <sphereGeometry args={[0.017, 6, 5]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function Stocking({x, color}: {x: number; color: string}) {
  const red = useMemo(() => paper(color), [color]),
    cuff = useMemo(() => paper('#f4efe2'), []);
  return (
    <group position={[x, 0.84, MANTEL.z - 0.15]}>
      <mesh material={red} position={[0, 0.02, 0]}>
        <boxGeometry args={[0.07, 0.17, 0.035]} />
      </mesh>
      <mesh material={red} position={[0.03, -0.07, 0]}>
        <boxGeometry args={[0.11, 0.06, 0.035]} />
      </mesh>
      <mesh material={cuff} position={[0, 0.11, 0]}>
        <boxGeometry args={[0.08, 0.035, 0.04]} />
      </mesh>
    </group>
  );
}
function Eggs() {
  const colors = ['#f4b6c2', '#bfe3d0', '#f7e2a0', '#c7c3f0', '#f4b6c2', '#bfe3d0'];
  const mats = useMemo(() => colors.map(c => paper(c)), []);
  const basket = useMemo(() => paper('#a77b45'), []);
  return (
    <group position={[-1.12, MANTEL.y, MANTEL.z - 0.065]} scale={0.5}>
      <mesh material={basket} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.1, 0.075, 0.07, 10]} />
      </mesh>
      {colors.map((_, i) => (
        <mesh
          key={i}
          material={mats[i]}
          position={[
            ((i % 3) - 1) * 0.045,
            0.09 + Math.floor(i / 3) * 0.02,
            (Math.floor(i / 3) - 0.5) * 0.04,
          ]}
          scale={[1, 1.25, 1]}
        >
          <sphereGeometry args={[0.028, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}
function Tulips() {
  const stem = useMemo(() => paper('#4f7a43'), []),
    petals = useMemo(() => ['#f08aa5', '#f7d36b', '#c9a2e8'].map(c => paper(c)), []),
    vase = useMemo(() => paper('#cfe0e6'), []);
  return (
    <group position={[-0.62, MANTEL.y, MANTEL.z - 0.06]} scale={0.7}>
      <mesh material={vase} position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.09, 8]} />
      </mesh>
      {[-0.03, 0, 0.03].map((x, i) => (
        <group key={i} position={[x, 0.09, 0]} rotation={[0, 0, x * 2.5]}>
          <mesh material={stem} position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.16, 4]} />
          </mesh>
          <mesh material={petals[i]} position={[0, 0.17, 0]}>
            <coneGeometry args={[0.026, 0.06, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Flag() {
  const pole = useMemo(() => paper('#8a6b45'), []);
  const mats = useMemo(
    () =>
      ['#b8312f', '#f4efe2', '#2a4a8c'].map(
        c => new THREE.MeshStandardMaterial({color: c, roughness: 0.95, side: THREE.DoubleSide}),
      ),
    [],
  );
  return (
    <group position={[-0.7, MANTEL.y, MANTEL.z - 0.06]}>
      <mesh material={pole} position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.26, 4]} />
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} material={mats[i]} position={[0.07, 0.2 - i * 0.03, 0]}>
          <planeGeometry args={[0.14, 0.03]} />
        </mesh>
      ))}
    </group>
  );
}
function HeartsOnMantel() {
  const geo = useMemo(() => new THREE.ShapeGeometry(heartShape()), []);
  const mats = useMemo(
    () =>
      ['#c9374f', '#f08aa5', '#e8566e'].map(
        c => new THREE.MeshStandardMaterial({color: c, roughness: 0.9, side: THREE.DoubleSide}),
      ),
    [],
  );
  return (
    <group>
      {[
        [-1.2, 0.1, 0],
        [-0.9, 0.14, 1],
        [-0.62, 0.09, 2],
      ].map(([x, s, m], i) => (
        <mesh
          key={i}
          geometry={geo}
          material={mats[m]}
          position={[x, MANTEL.y + s * 0.7, MANTEL.z - 0.08]}
          scale={s * 1.3}
        />
      ))}
    </group>
  );
}

type DecorRoom = 'woodland' | 'beachfront' | 'cyberpunk' | 'sky-castle';
export function HolidayDecor({room = 'woodland'}: {room?: DecorRoom}) {
  const {holiday} = useSeasonal();
  return (
    <group name="Holiday_Decor" userData={{holiday}}>
      {holiday && <HolidaySet key={room + '-' + holiday} holiday={holiday} room={room} />}
    </group>
  );
}
/** A small pumpkin on the left of each windowsill, clear of the sill's own props (Neon's lava lamp and hologram car). */
const SILL_PUMPKIN: Record<DecorRoom, [number, number, number]> = {
  woodland: [-0.8, 1.19, -2.0],
  beachfront: [-0.8, 1.18, -2.05],
  cyberpunk: [-0.78, 1.18, -2.02],
  'sky-castle': [-0.85, 1.16, -2.05],
};
/** Keyed by holiday so a change unmounts the old set. Materials and geometries are created in useMemo and passed
 * as props, which react-three-fiber does not dispose, so collect them after mount and free them on unmount. */
function HolidaySet({holiday, room}: {holiday: HolidayId; room: DecorRoom}) {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const owned = new Set<{dispose(): void}>();
    group.current?.traverse(o => {
      if (o instanceof THREE.Mesh) {
        owned.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => owned.add(m));
      }
    });
    return () => owned.forEach(x => x.dispose());
  }, []);
  return (
    <group ref={group}>
      {holiday === 'halloween' && <Pumpkin position={SILL_PUMPKIN[room]} scale={0.6} />}
      {room === 'woodland' ? DECOR[holiday]() : room === 'beachfront' ? COASTAL[holiday]() : LIGHT[holiday]()}
    </group>
  );
}
/** The owner's spot for the tree and the large pumpkin: the corner between the beanbag (x < -1.02, z < 1.48) and the hearth (x > -1.41). */
const WOODLAND_CORNER: [number, number, number] = [-1.85, 0, 1.85];
const DECOR: Record<HolidayId, () => ReactNode> = {
  christmas: () => (
    <>
      <Garland
        a={MANTEL_A}
        b={MANTEL_B}
        depth={0.09}
        count={9}
        kind="flag"
        colors={['#b23a3a', '#f2d36b']}
        size={0.035}
        thickness={0.024}
        lineColor="#3f6b45"
      />
      <Stocking x={-1.2} color="#b23a3a" />
      <Stocking x={-0.91} color="#2f6b4f" />
      <Stocking x={-0.62} color="#b23a3a" />
      <Tree position={WOODLAND_CORNER} />
    </>
  ),
  halloween: () => (
    <>
      {/* In front of the chimney the shelf is only 8 cm deep, so the two larger pumpkins sit at the mantel's
          ends, clear of the stones and level with the front, and only a small one sits in the middle. */}
      <Pumpkin position={[-1.357, MANTEL.y + 0.036, 1.7]} scale={0.5} />
      <Pumpkin position={[-0.464, MANTEL.y + 0.036, 1.7]} scale={0.5} />
      <Pumpkin position={[-0.95, MANTEL.y + 0.029, MANTEL.z - 0.05]} scale={0.4} />
      <Pumpkin position={[WOODLAND_CORNER[0], 0.2, WOODLAND_CORNER[2]]} scale={2.8} />
      {[
        [-1.5, 2.6, 0.3, 1],
        [-1.3, 2.35, -0.4, 0.8],
        [-1.55, 2.2, 0.5, 0.9],
        [1.15, 2.55, -0.3, 1],
        [1.35, 2.3, 0.4, 0.8],
      ].map(([x, y, r, s], i) => (
        <Bat key={i} position={[x, y, -2.08]} rot={r} s={s} />
      ))}
    </>
  ),
  valentines: () => (
    <>
      <Garland
        a={WIN_A}
        b={WIN_B}
        depth={0.18}
        count={11}
        kind="heart"
        colors={['#c9374f', '#f08aa5', '#e8566e', '#f4c6d0']}
        size={0.12}
      />
      <HeartsOnMantel />
    </>
  ),
  easter: () => (
    <>
      <Eggs />
      <Tulips />
    </>
  ),
  'independence-day': () => (
    <>
      <Garland
        a={WIN_A}
        b={WIN_B}
        depth={0.16}
        count={12}
        kind="flag"
        colors={['#b8312f', '#f4efe2', '#2a4a8c']}
        size={0.13}
      />
      <Flag />
    </>
  ),
};

/** The other rooms have no hearth. The tree and pumpkins stand where Woodland's hearth would be, between the beanbag
 * (x < -1.22) and the door jamb (x > -0.36), clear of the door's swing. */
const HEARTH_SPOT: [number, number, number] = [-0.85, 0, 1.75];
function Pumpkins() {
  const [x, , z] = HEARTH_SPOT;
  return (
    <>
      <Pumpkin position={[x, 0.2, z]} scale={2.8} />
      <Pumpkin position={[x - 0.15, 0.06, z - 0.33]} scale={0.8} />
      <Pumpkin position={[x + 0.2, 0.05, z - 0.3]} scale={0.6} />
    </>
  );
}
/** Beachfront: one garland across the arched window (below the string lights, which run y 2.0-3.08). */
const ARCH_A = new THREE.Vector3(-1.0, 2.62, -2.0),
  ARCH_B = new THREE.Vector3(0.78, 2.62, -2.0);
const COASTAL: Record<HolidayId, () => ReactNode> = {
  christmas: () => (
    <>
      <Garland
        a={ARCH_A}
        b={ARCH_B}
        depth={0.12}
        count={11}
        kind="flag"
        colors={['#b23a3a', '#2f6b4f', '#f2d36b']}
        size={0.11}
      />
      <Tree position={HEARTH_SPOT} />
    </>
  ),
  halloween: () => (
    <>
      <Pumpkins />
      <Garland
        a={ARCH_A}
        b={ARCH_B}
        depth={0.12}
        count={11}
        kind="flag"
        colors={['#e0762a', '#1d1722']}
        size={0.11}
      />
      {[
        [-1.45, 2.4, 0.3],
        [1.15, 2.5, -0.3],
      ].map(([x, y, r], i) => (
        <Bat key={i} position={[x, y, -2.0]} rot={r} />
      ))}
    </>
  ),
  valentines: () => (
    <Garland
      a={ARCH_A}
      b={ARCH_B}
      depth={0.14}
      count={11}
      kind="heart"
      colors={['#c9374f', '#f08aa5', '#e8566e', '#f4c6d0']}
      size={0.11}
    />
  ),
  easter: () => (
    <Garland
      a={ARCH_A}
      b={ARCH_B}
      depth={0.12}
      count={11}
      kind="flag"
      colors={['#f4b6c2', '#bfe3d0', '#f7e2a0', '#c7c3f0']}
      size={0.11}
    />
  ),
  'independence-day': () => (
    <Garland
      a={ARCH_A}
      b={ARCH_B}
      depth={0.12}
      count={12}
      kind="flag"
      colors={['#b8312f', '#f4efe2', '#2a4a8c']}
      size={0.11}
    />
  ),
};

/** Neon City and Sky Castle: a lighter set. One garland across the top of the window, plus the tree or pumpkins. */
const TOP_A = new THREE.Vector3(-1.05, 2.9, -2.0),
  TOP_B = new THREE.Vector3(0.75, 2.9, -2.0);
const topGarland = (colors: string[], kind: 'flag' | 'heart' = 'flag') => (
  <Garland a={TOP_A} b={TOP_B} depth={0.12} count={11} kind={kind} colors={colors} size={0.11} />
);
const LIGHT: Record<HolidayId, () => ReactNode> = {
  christmas: () => (
    <>
      {topGarland(['#b23a3a', '#2f6b4f', '#f2d36b'])}
      <Tree position={HEARTH_SPOT} />
    </>
  ),
  halloween: () => (
    <>
      {topGarland(['#e0762a', '#1d1722'])}
      <Pumpkins />
    </>
  ),
  valentines: () => topGarland(['#c9374f', '#f08aa5', '#e8566e', '#f4c6d0'], 'heart'),
  easter: () => topGarland(['#f4b6c2', '#bfe3d0', '#f7e2a0', '#c7c3f0']),
  'independence-day': () => topGarland(['#b8312f', '#f4efe2', '#2a4a8c']),
};

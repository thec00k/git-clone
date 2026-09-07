import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { Environment } from "../../types/app";
import type { Phase } from "../room/RoomFurniture";

/** Instanced scenery stays outside the physical window, with real parallax. */
export function WoodlandScenery({ phase, environment, particles }: {
  phase: Phase; environment: Environment; particles: number;
}) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const foliage=useMemo(()=>{
    const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d')!;
    let seed=43;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<260;i++){const angle=random()*Math.PI*2;const radius=Math.sqrt(random())*(85+Math.sin(angle*3)*16);const x=128+Math.cos(angle)*radius;const y=128+Math.sin(angle)*radius*.85;
      g.fillStyle=['#e6eadf','#d1d9c7','#f3f5ec'][Math.floor(random()*3)];g.beginPath();g.ellipse(x,y,7+random()*11,4+random()*7,random()*Math.PI,0,Math.PI*2);g.fill();}
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  },[]);
  useEffect(()=>()=>foliage.dispose(),[foliage]);
  const reduced = useReducedMotion();
  const night = phase === "night";
  const sky = night ? "#142439" : phase === "dusk" ? "#ce997e" : "#a9b9ac";
  const seasonColors = {
    spring: ["#708957", "#8f9e6b", "#466750"],
    summer: ["#476c50", "#71845b", "#2c5349"],
    autumn: ["#8f7a50", "#a38a60", "#486557"],
    winter: ["#8b9c98", "#b5beb1", "#516e68"],
  }[environment.season];
  const palette = seasonColors.join(",");
  const initialized=useRef("");
  const initializeTrees = () => {
    if (!trunks.current || !crowns.current) return;
    const dummy = new THREE.Object3D();
    const colors = palette.split(",");
    for (let i = 0; i < 40; i++) {
      const row = Math.floor(i / 10);
      const x = -10 + (i % 10) * 2.15 + Math.sin(i * 9) * .7;
      const z = -9 - row * 3.7;
      const height = 3.9 + Math.sin(i * 3.7) * 1.3;
      dummy.position.set(x, height / 2 - .6, z);
      dummy.scale.set(.09 + (i % 3) * .028, height, .09 + (i % 3) * .028);
      dummy.rotation.set(0, 0, Math.sin(i) * .06);
      dummy.updateMatrix(); trunks.current.setMatrixAt(i, dummy.matrix);
      for (let tier = 0; tier < 5; tier++) {
        dummy.position.set(x + Math.sin(i*3+tier*2.4)*.65, height * .8 + Math.sin(tier*2+i)*.6, z+Math.cos(tier*2.4)*.55);
        dummy.scale.set(1.05+Math.sin(i+tier)*.25, .85+Math.cos(tier)*.25, .9);
        dummy.rotation.set(0, Math.sin(i)*.2, Math.sin(i) * .1);
        dummy.updateMatrix(); crowns.current.setMatrixAt(i * 5 + tier, dummy.matrix);
        const tint = new THREE.Color(colors[(i + tier) % colors.length]);
        tint.lerp(new THREE.Color(night ? "#263b50" : sky), row * .14 + (night ? .36 : 0));
        crowns.current.setColorAt(i * 5 + tier, tint);
      }
    }
    trunks.current.instanceMatrix.needsUpdate = true;
    crowns.current.instanceMatrix.needsUpdate = true;
    if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true;
    trunks.current.computeBoundingSphere(); crowns.current.computeBoundingSphere();
  };
  useFrame(({clock})=>{
    if(!crowns.current||!trunks.current)return;
    const key=`${crowns.current.uuid}:${trunks.current.uuid}:${palette}:${night}:${sky}`;
    if(initialized.current!==key){initializeTrees();initialized.current=key;}
    if(!reduced)crowns.current.rotation.z=Math.sin(clock.elapsedTime*.18)*.002;
  });
  return <><fog attach="fog" args={[sky,8,28]}/><group name="woodland-scenery">
    <mesh position={[0, 4, -24]}>
      <planeGeometry args={[65, 30]} /><meshBasicMaterial color={sky} />
    </mesh>
    <mesh position={[3.5, 4.8, -22]}>
      <circleGeometry args={[night ? .38 : .65, 32]} />
      <meshBasicMaterial color={night ? "#d4decd" : "#f3d6a0"} />
    </mesh>
    {[0, 1, 2].map(i => <mesh key={i} position={[-7 + i * 7, -.5, -20 + i]} scale={[9, 3 + i * .3, 1]}>
      <sphereGeometry args={[1, 16, 8]} /><meshBasicMaterial color={night ? "#233c49" : ["#7b9185", "#8b9b8b", "#5b7b6e"][i]} />
    </mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.55, -12]}>
      <planeGeometry args={[40, 25]} /><meshBasicMaterial color={night ? "#1c3234" : "#516956"} />
    </mesh>
    <instancedMesh ref={trunks} args={[undefined, undefined, 40]}>
      <cylinderGeometry args={[.6, 1, 1, 7]} /><meshBasicMaterial color={night ? "#1a292c" : "#514a38"} />
    </instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, 200]}>
      <planeGeometry args={[2,2]} /><meshBasicMaterial map={foliage} alphaTest={.4} side={THREE.DoubleSide} />
    </instancedMesh>
    {environment.weather !== "clear" && <WindowWeather kind={environment.weather} count={particles} reduced={reduced} />}
  </group></>;
}

function WindowWeather({ kind, count, reduced }: { kind: "rain" | "snow"; count: number; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: Math.sin(i * 127.1) * 4, y: ((i * .618) % 1) * 6, z: -2.6 - ((i * .317) % 1) * 4,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    if (!mesh.current) return;
    drops.forEach((drop, i) => {
      if (!reduced) drop.y = (drop.y - Math.min(dt, .05) * (kind === "rain" ? 3.2 : .42) + 6) % 6;
      dummy.position.set(drop.x + (kind === "snow" && !reduced ? Math.sin(clock.elapsedTime * .3 + i) * .15 : 0), drop.y, drop.z);
      dummy.scale.setScalar(1); dummy.updateMatrix(); mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
    <boxGeometry args={kind === "rain" ? [.008, .16, .008] : [.028, .028, .028]} />
    <meshBasicMaterial color={kind === "rain" ? "#c5d8d7" : "#eee9d8"} transparent opacity={kind === "rain" ? .42 : .8} depthWrite={false} />
  </instancedMesh>;
}


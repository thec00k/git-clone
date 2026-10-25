import {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useApp} from '../../store/appStore';
import {CRT_LIGHT_COLORS} from '../../lib/roomMusic';
import {useReducedMotion} from '../../hooks/useReducedMotion';
/**
 * Room-wide neon channels (ceiling ring and floor-to-ceiling corners) and the honeycomb panels share
 * batched meshes with the window rim and the skyline, so they are dimmed by position instead of by object.
 * The window rim and the city keep their full glow; these become quiet accents.
 */
const NEON_ACCENT_MASK = `
float ksNeonMask(vec3 p){
  if(p.z<-2.3)return 1.;
  if(p.y>2.9||abs(p.x)>2.3)return .2;
  if(p.x>1.5&&p.y>1.35&&p.y<2.45&&p.z<-1.9)return .18;
  return 1.;
}`;
function dimNeonAccents(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKsNeonWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvKsNeonWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKsNeonWorld;' + NEON_ACCENT_MASK)
      .replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\ngl_FragColor.rgb *= ksNeonMask(vKsNeonWorld);',
      );
  };
  material.customProgramCacheKey = () => 'ks-neon-accent-mask';
  material.needsUpdate = true;
}

export function NeonAtmosphere({scene}: {scene: THREE.Object3D}) {
  const {environment, state} = useApp();
  const reduced = useReducedMotion();

  const mirrorMode = environment.cloudPalette ?? 'multicolor';
  const mirrorColor = CRT_LIGHT_COLORS[environment.crtColor ?? 'blue'];
  useEffect(() => {
    const surface = scene.getObjectByName('Neon_Infinity_Surface') as THREE.Mesh | undefined;
    if (!surface) return;
    const original = surface.material;
    scene.traverse(o => {
      if (o.name.startsWith('Neon_Infinity_Preview_')) o.visible = false;
    });
    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        tint: {value: new THREE.Color(mirrorColor)},
        mode: {value: mirrorMode === 'off' ? 0 : mirrorMode === 'crt' ? 1 : 2},
      },
      vertexShader: `varying vec3 world;
   void main(){world=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.0);}`,
      fragmentShader: `varying vec3 world;uniform vec3 tint;uniform float mode;
   void main(){
    vec3 ray=normalize(world-cameraPosition);vec3 color=vec3(.003,.004,.009);
    if(mode>0.5){
     for(int i=0;i<28;i++){
      float depth=float(i)*.23;
      vec2 p=world.xz+ray.xz*depth/max(ray.y,.12);
      vec2 edge=vec2(1.87,1.47)-abs(p);
      if(min(edge.x,edge.y)<-.02)break;
      float d=abs(min(edge.x,edge.y));
      float line=exp(-d*d/0.000045)+.16*exp(-d*35.);
      vec3 c=mode<1.5?tint:mix(vec3(1.,.055,.20),vec3(.56,.06,1.),clamp((p.y+1.47)/2.94,0.,1.));
      color+=c*line*pow(.87,float(i))*1.3;
     }
    }
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`,
    });
    surface.material = material;
    return () => {
      surface.material = original;
      material.dispose();
    };
  }, [scene, mirrorMode, mirrorColor]);
  useEffect(() => {
    // Each room mesh owns a cloned material (useRoomAsset), so patching these two leaves the lava, jellyfish and door alone.
    const patched: THREE.MeshStandardMaterial[] = [];
    for (const name of ['Neon_Static_Neon_Cyan', 'Neon_Static_Neon_Magenta']) {
      const mesh = scene.getObjectByName(name);
      if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        dimNeonAccents(mesh.material);
        patched.push(mesh.material);
      }
    }
    return () => {
      patched.forEach(m => {
        m.onBeforeCompile = () => {};
        m.customProgramCacheKey = () => '';
        m.needsUpdate = true;
      });
    };
  }, [scene]);
  const deskLight = useMemo(() => {
    const book = scene.getObjectByName('ks_book');
    const p = book ? book.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(-0.15, 0.78, -1.68);
    return p.add(new THREE.Vector3(0.05, 0.75, 0.3));
  }, [scene]);
  useEffect(() => {
    const halos: THREE.Mesh[] = [];
    const originals: {mesh: THREE.Mesh; material: THREE.Material | THREE.Material[]}[] = [];
    const hologramMaterials: THREE.Material[] = [];
    scene.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materials) {
        if (m instanceof THREE.MeshStandardMaterial && m.name.startsWith('Neon ')) {
          if (m.emissiveIntensity > 1) m.emissiveIntensity = 0.8;
          if (m.transparent) {
            m.depthWrite = false;
            o.castShadow = false;
          }
        }
      }
      if (!o.name.startsWith('Neon_Holo_')) return;
      const darkDetail = o.name.endsWith('Neon_Graphite');
      if (darkDetail) return;
      const detail = !o.name.endsWith('Neon_Hologram');
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {detail: {value: detail ? 1 : 0}},
        vertexShader: `varying vec3 viewPosition;varying vec3 viewNormal;varying float height;
     void main(){vec4 p=modelViewMatrix*vec4(position,1.);viewPosition=-p.xyz;viewNormal=normalize(normalMatrix*normal);height=(modelMatrix*vec4(position,1.)).y;gl_Position=projectionMatrix*p;}`,
        fragmentShader: `varying vec3 viewPosition;varying vec3 viewNormal;varying float height;uniform float detail;
     void main(){float rim=pow(1.-abs(dot(normalize(viewNormal),normalize(viewPosition))),2.2);
      float scan=.5+.5*sin(height*2100.);vec3 tint=mix(vec3(.07,.72,1.),vec3(.44,.18,.92),.5+.5*sin(height*24.));
      vec3 color=tint*(.34+rim*.9+scan*.13+detail*.5);gl_FragColor=vec4(color,.42+rim*.38+detail*.18);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
     }`,
      });
      originals.push({mesh: o, material: o.material});
      o.material = material;
      hologramMaterials.push(material);
      o.castShadow = false;
      o.receiveShadow = false;
      if (!detail) {
        const haloMaterial = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          vertexShader: `varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position+normal*.0018,1.);vP=-p.xyz;gl_Position=projectionMatrix*p;}`,
          fragmentShader: `varying vec3 vN;varying vec3 vP;void main(){float glow=pow(1.-abs(dot(normalize(vN),normalize(vP))),2.);gl_FragColor=vec4(.15,.65,1.,glow*.16);}`,
        });
        const halo = new THREE.Mesh(o.geometry, haloMaterial);
        halo.name = 'Hologram_soft_halo';
        halo.userData.host = o;
        halos.push(halo);
      }
    });
    halos.forEach(w => w.userData.host.add(w));
    return () => {
      halos.forEach(w => {
        w.removeFromParent();
        (w.material as THREE.Material).dispose();
      });
      originals.forEach(({mesh, material}) => {
        mesh.material = material;
      });
      hologramMaterials.forEach(m => m.dispose());
    };
  }, [scene]);
  const parts = useMemo(() => {
    const lava: THREE.Object3D[] = [],
      jellies: THREE.Object3D[] = [];
    scene.traverse(o => {
      if (/^Neon_Lava_/.test(o.name)) lava.push(o);
      if (/^Neon_Jelly_\d$/.test(o.name)) jellies.push(o);
    });
    return {lava: lava.map(o => ({o, y: o.position.y, sy: o.scale.y})), jellies};
  }, [scene]);
  useEffect(() => {
    for (const kind of ['cat', 'car', 'flower']) {
      const o = scene.getObjectByName('Neon_Hologram_' + kind);
      if (o)
        o.visible =
          state.roomDecor?.sillItem === 'holo-' + kind && state.roomDecor.owned.includes('holo-' + kind);
    }
  }, [scene, state.roomDecor]);
  useFrame(({clock}) => {
    const t = reduced ? 0 : clock.elapsedTime;
    parts.lava.forEach(({o, y, sy}, i) => {
      o.position.y = y + Math.sin(t * 0.35 + i * 1.8) * 0.014;
      o.scale.y = sy * (1 + Math.sin(t * 0.5 + i) * 0.08);
      if (o instanceof THREE.Mesh) {
        const m = o.material;
        if (m instanceof THREE.MeshStandardMaterial) m.emissiveIntensity = environment.lampOn ? 1.2 : 0;
      }
    });
    parts.jellies.forEach((o, i) => {
      o.position.y = Math.sin(t * 0.65 + i * 2) * 0.012;
      o.rotation.y = Math.sin(t * 0.24 + i) * 0.012;
    });
  });
  return (
    <>
      <pointLight
        position={[-0.45, 1.23, -2.02]}
        color="#6dcfff"
        intensity={
          state.roomDecor?.sillItem?.startsWith('holo-') &&
          state.roomDecor.owned.includes(state.roomDecor.sillItem)
            ? 0.055
            : 0
        }
        distance={0.48}
        decay={2}
      />
      <pointLight
        position={[-1.6, 2.68, 1.5]}
        color={mirrorMode === 'crt' ? mirrorColor : '#d951f3'}
        intensity={mirrorMode === 'off' ? 0 : 0.75}
        distance={3}
      />
      <pointLight
        position={[1.3, 2.72, -0.6]}
        color={mirrorMode === 'crt' ? mirrorColor : '#51c9ff'}
        intensity={mirrorMode === 'off' ? 0 : 0.65}
        distance={3}
      />
      {/* Cool white desk light: with the lamp on, the scrapbook is the brightest thing on the desk. */}
      <pointLight
        name="Neon_Desk_Light"
        position={deskLight.toArray()}
        color="#e8eeff"
        intensity={environment.lampOn ? 1.8 : 0}
        distance={1.7}
        decay={2}
      />
      <pointLight
        position={[-0.965, 1.02, -1.91]}
        color="#e94ab7"
        intensity={environment.lampOn ? 0.35 : 0}
        distance={1.3}
      />
      <pointLight position={[1.07, 1.1, -1.8]} color="#26d8ff" intensity={0.25} distance={1.2} />
      {/* Blade Runner palette (owner, 2026-10-25): a teal fill on the desk side, sodium amber by the shelf. */}
      <pointLight position={[-1, 2.35, 0]} color="#2fb7bd" intensity={0.8} distance={5} />
      <pointLight position={[1.8, 2.35, 0]} color="#ff8a3a" intensity={0.75} distance={5} />
      <SpinnerSweep reduced={reduced} />
    </>
  );
}

const SWEEP_PERIOD = 28; // seconds between passes
const SWEEP_LENGTH = 8; // seconds a pass takes

/** The searchlight's beam in the smog: brightest along its axis and near the car, fading into the room. */
const BEAM_SHADER = {
  vertexShader: `varying vec2 vUv;varying vec3 vN;varying vec3 vP;
   void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vP=-p.xyz;gl_Position=projectionMatrix*p;}`,
  fragmentShader: `varying vec2 vUv;varying vec3 vN;varying vec3 vP;uniform float strength;
   void main(){float core=pow(abs(dot(normalize(vN),normalize(vP))),3.);float along=smoothstep(0.,.75,vUv.y);
    gl_FragColor=vec4(vec3(1.,.88,.7)*core*along*strength,1.);}`,
};

/**
 * Now and then a spinner drifts past outside the window and its searchlight sweeps the floor and walls,
 * with a faint beam through the smog. No shadow map: the back wall faces away from the light, so only the
 * room is lit. Off with reduced motion (kept mounted at zero, so the room's light count never changes).
 */
function SpinnerSweep({reduced}: {reduced: boolean}) {
  const light = useRef<THREE.SpotLight>(null);
  const car = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const blink = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const beamGeometry = useMemo(() => {
    // An open cone 4 m long, apex at the origin, opening along +z (so lookAt aims it).
    const g = new THREE.CylinderGeometry(0.03, 0.45, 4, 24, 1, true);
    g.translate(0, -2, 0);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const beamMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...BEAM_SHADER,
        uniforms: {strength: {value: 0}},
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      beamGeometry.dispose();
      beamMaterial.dispose();
    },
    [beamGeometry, beamMaterial],
  );
  useFrame(({clock}) => {
    const t = (clock.elapsedTime + 6) % SWEEP_PERIOD;
    const k = Math.min(1, t / SWEEP_LENGTH);
    const passing = !reduced && t < SWEEP_LENGTH;
    const on = passing ? Math.sin(Math.PI * k) ** 1.5 : 0;
    const x = THREE.MathUtils.lerp(-3.4, 3.0, k);
    const y = 2.15 + Math.sin(k * Math.PI) * 0.1;
    car.current?.position.set(x, y, -3.6);
    if (car.current) car.current.visible = passing;
    target.position.set(THREE.MathUtils.lerp(-2.2, 2.0, k), 0, THREE.MathUtils.lerp(1.6, 0.6, k));
    target.updateMatrixWorld();
    light.current?.position.set(x, y - 0.08, -3.5);
    if (light.current) light.current.intensity = on * 30;
    if (beam.current) {
      beam.current.position.set(x, y - 0.08, -3.5);
      beam.current.lookAt(target.position);
      (beam.current.material as THREE.ShaderMaterial).uniforms.strength.value = on * 0.09;
    }
    if (blink.current) blink.current.color.set(Math.floor(clock.elapsedTime * 2) % 2 ? '#ff2a1a' : '#300805');
  });
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        target={target}
        color="#ffe9c9"
        angle={0.24}
        penumbra={0.6}
        distance={10}
        decay={1.2}
        intensity={0}
      />
      <mesh ref={beam} geometry={beamGeometry} material={beamMaterial} renderOrder={2} />
      <group ref={car} visible={false}>
        {/* A long, low wedge of a car with a smoked canopy lit from inside. */}
        <mesh rotation={[0, 0, -0.06]}>
          <boxGeometry args={[1.1, 0.13, 0.42]} />
          <meshStandardMaterial color="#1c2028" roughness={0.35} metalness={0.5} emissive="#0b0d12" />
        </mesh>
        <mesh position={[0.1, 0.1, 0]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.46, 0.09, 0.34]} />
          <meshBasicMaterial color="#3a5560" />
        </mesh>
        <mesh position={[0.54, -0.02, 0.1]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color="#fff3da" />
        </mesh>
        <mesh position={[-0.54, 0.02, 0.1]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial ref={blink} color="#ff2a1a" />
        </mesh>
        {[-0.3, -0.1, 0.1, 0.3].map(dx => (
          <mesh key={dx} position={[dx, -0.1, 0.12]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshBasicMaterial color="#5fe6ff" />
          </mesh>
        ))}
      </group>
    </>
  );
}

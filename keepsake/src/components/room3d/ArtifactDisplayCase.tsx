import {useEffect, useMemo, useRef, useState} from 'react';
import {Html, useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import type {ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {useApp} from '../../store/appStore';
import {CRT_LIGHT_COLORS} from '../../lib/roomMusic';
import {validateCardGlb} from '../../lib/cardBinders';
import {DISPLAY_MODEL_ACCEPT,DISPLAY_MODEL_FORMATS,importDisplayModel,modelDataUrl} from '../../lib/displayModelImport';
import {useReducedMotion} from '../../hooks/useReducedMotion';
RectAreaLightUniformsLib.init();

/** Shared placement: clear of shelf end, wall trim, and the central walking aisle. */
export const DISPLAY_CASE_POSITION: [number, number, number] = [2.03, 0, 1.65];
export const DISPLAY_CASE_VIEW = {position: new THREE.Vector3(-.35,1.38,-.65), target: new THREE.Vector3(2.03,1.07,1.65)};

export function ArtifactDisplayCase() {
  const {environment,state,update} = useApp();
  const input=useRef<HTMLInputElement>(null), pending=useRef<{shelf:number;slot:number}|null>(null); const [message,setMessage]=useState(''); const [doorsOpen,setDoorsOpen]=useState(false); const [selected,setSelected]=useState<string|null>(null); const [dragging,setDragging]=useState<string|null>(null); const scans=state.displayCaseScans??[];
  const add=async(file:File|undefined)=>{const place=pending.current;pending.current=null;if(!file||!place)return;try{setMessage(file.name.toLowerCase().endsWith('.glb')?'Checking model…':'Converting model locally…');const buffer=await importDisplayModel(file);validateCardGlb(buffer);const modelSrc=await modelDataUrl(buffer);update(s=>({...s,displayCaseScans:[...(s.displayCaseScans??[]).filter(x=>x.shelf!==place.shelf||x.slot!==place.slot),{id:crypto.randomUUID(),title:file.name.replace(/\.(glb|usdz|obj|ply|stl)$/i,''),modelSrc,...place}]}));setMessage('Model placed.');}catch(e){setMessage(e instanceof Error?e.message:'Could not add model.');}};
  const {scene} = useGLTF('/room/furniture/display-case.glb?v=right-angle-3');
  const tint = CRT_LIGHT_COLORS[environment.crtColor ?? 'green'];
  const on = environment.displayCaseLit !== false;
  const coastal = environment.roomTheme === 'beachfront';
  const model = useMemo(() => {
    const copy = scene.clone(true);
    const materials = new Map<THREE.Material, THREE.Material>();
    copy.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const convert = (original: THREE.Material) => {
        if (!materials.has(original)) materials.set(original, original.clone());
        return materials.get(original)!;
      };
      o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
      o.castShadow = !o.name.includes('Glass'); o.receiveShadow = !o.name.includes('Glass');
    });
    return {copy, materials};
  }, [scene]);
  useEffect(() => () => model.materials.forEach(m => m.dispose()), [model]);
  useEffect(()=>{const remove=(e:KeyboardEvent)=>{if(e.key!=='Backspace'||!selected||e.target instanceof HTMLInputElement)return;e.preventDefault();update(s=>({...s,displayCaseScans:(s.displayCaseScans??[]).filter(x=>x.id!==selected)}));setSelected(null);setMessage('Object removed.');};window.addEventListener('keydown',remove);return()=>window.removeEventListener('keydown',remove);},[selected,update]);
  const move=(to:{shelf:number;slot:number})=>{if(!dragging)return;const from=scans.find(x=>x.id===dragging),other=scans.find(x=>x.shelf===to.shelf&&x.slot===to.slot);if(!from)return;update(s=>({...s,displayCaseScans:(s.displayCaseScans??[]).map(x=>x.id===from.id?{...x,...to}:other&&x.id===other.id?{...x,shelf:from.shelf,slot:from.slot}:x)}));setDragging(null);setSelected(from.id);setMessage(other?'Objects swapped.':'Object moved.');};
  useEffect(() => {
    model.materials.forEach(m => {
      if (!(m instanceof THREE.MeshStandardMaterial)) return;
      if (m.name === 'Case_LED') {m.color.set(on ? tint : '#d5d0c0');m.emissive.set(tint);m.emissiveIntensity = on ? .85 : 0;}
      if (m.name === 'Case_PaintedTimber') {m.color.set(coastal ? '#eee9db' : '#d1c8af');m.emissive.copy(m.color);m.emissiveIntensity=.10;}
      if (m.name === 'Case_Oak') m.color.set(coastal ? '#ae916a' : '#796047');
      if (m instanceof THREE.MeshPhysicalMaterial && m.name === 'Case_Glass') {
        // Layered cabinet panes must remain readable on phones as well as desktop.
        // Alpha glass avoids multiple full-screen transmission render passes.
        m.transmission = 0; m.transparent = true; m.opacity = .12;
        m.depthWrite = false; m.roughness = .18; m.metalness = .15;
        m.side = THREE.DoubleSide; m.needsUpdate = true;
      }
    });
  }, [model, tint, on, coastal]);
  return <group name="Keepsake_ArtifactDisplayCase" position={DISPLAY_CASE_POSITION} rotation={[0,-3*Math.PI/4,0]}>
    <primitive object={model.copy}/>
    <DisplayCaseDoors scene={model.copy} open={doorsOpen}/>
    {doorsOpen&&Array.from({length:4},(_,shelf)=>Array.from({length:4},(_,slot)=>{const scan=scans.find(x=>x.shelf===shelf&&x.slot===slot),place={shelf,slot};return <group key={`${shelf}-${slot}`} position={[-.27+slot*.18,.46+shelf*.48,.02]}><mesh position={[0,0,-.015]} onPointerUp={e=>{e.stopPropagation();move(place);}}><boxGeometry args={[.16,.32,.07]}/><meshBasicMaterial transparent opacity={0}/></mesh>{scan?<DisplayScan src={scan.modelSrc} selected={selected===scan.id} onSelect={()=>setSelected(scan.id)} onDragStart={()=>setDragging(scan.id)} onDragEnd={()=>setDragging(null)}/>:<Html center transform distanceFactor={3.6}><button className="ks-case-add" title={`Add ${DISPLAY_MODEL_FORMATS}`} aria-label={`Add model to shelf ${shelf+1}, space ${slot+1}`} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();pending.current=place;setMessage(`Choose ${DISPLAY_MODEL_FORMATS}.`);input.current?.click();}}>+</button></Html>}</group>}))}
    <Html position={[0,-.12,.04]} center transform distanceFactor={4}><input ref={input} type="file" accept={DISPLAY_MODEL_ACCEPT} hidden onChange={e=>{void add(e.target.files?.[0]);e.currentTarget.value='';}}/><span className="ks-case-status" role="status">{message}</span></Html>
    {[[-.022,.6125,.224],[.022,.6125,.224],[-.022,1.5875,.224],[.022,1.5875,.224]].map((p,i)=><mesh key={i} position={p as [number,number,number]} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setDoorsOpen(open=>!open);setMessage(doorsOpen?'Doors closed.':'Doors open — choose an empty space.');}}><boxGeometry args={[.075,.10,.06]}/><meshBasicMaterial transparent opacity={0}/></mesh>)}
    {on && [.60,1.08,1.58,2.04].map(y => <rectAreaLight key={y} color={tint} intensity={3.5} width={.65} height={.18} position={[0,y-.018,.04]} rotation={[-Math.PI/2,0,0]}/>)}
  </group>;
}
function DisplayScan({src,selected,onSelect,onDragStart,onDragEnd}:{src:string;selected:boolean;onSelect:()=>void;onDragStart:()=>void;onDragEnd:()=>void}) {const {scene}=useGLTF(src);const copy=useMemo(()=>{const root=scene.clone(true);root.traverse(o=>{if(o instanceof THREE.Mesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});return root;},[scene]);useEffect(()=>{copy.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(selected?'#e4c447':'#000');m.emissiveIntensity=selected?.55:0;}});},[copy,selected]);return <primitive object={copy} scale={.11} onPointerDown={(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();onSelect();onDragStart();}} onPointerUp={(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();onDragEnd();}}/>;}

function DisplayCaseDoors({scene,open}:{scene:THREE.Object3D;open:boolean}) {
 const reduced=useReducedMotion();
 const doors=useMemo(()=>{
  const glass=scene.children.filter(o=>/^Case_DoorGlass/.test(o.name));const handles=scene.children.filter(o=>/^Case_Handle/.test(o.name));
  const pivots=[[-.353,.6125,.215],[.353,.6125,.215],[-.353,1.5875,.215],[.353,1.5875,.215]].map((p,i)=>{const pivot=new THREE.Group();pivot.name=`Case_DoorPivot_${i}`;pivot.position.fromArray(p);scene.add(pivot);if(glass[i])pivot.attach(glass[i]);if(handles[i])pivot.attach(handles[i]);return pivot;});
  return {pivots,glass,handles};
 },[scene]);
 useEffect(()=>()=>{doors.pivots.forEach((pivot,i)=>{if(doors.glass[i])scene.attach(doors.glass[i]);if(doors.handles[i])scene.attach(doors.handles[i]);scene.remove(pivot);});},[doors,scene]);
 // The case front faces positive Z. Each outer hinge rotates its door toward
 // that front/room side, never back through the shelves.
 useFrame((_,dt)=>doors.pivots.forEach((pivot,i)=>{const sign=i%2===0?-1:1;pivot.rotation.y=THREE.MathUtils.damp(pivot.rotation.y,open?sign*Math.PI*.56:0,6,reduced?100:Math.min(dt,.05));}));
 return null;
}

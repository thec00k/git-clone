import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
/** Opt-in local diagnostic: visible DOM output, no telemetry or network. */
export function RoomPerformance(){
 const {gl}=useThree();const times=useRef<number[]>([]);const start=useRef(0);const output=useRef<HTMLOutputElement|null>(null);
 useEffect(()=>{if(!new URLSearchParams(location.search).has('perf'))return;const el=document.createElement('output');el.setAttribute('aria-label','Room performance');el.style.cssText='position:fixed;top:70px;right:15px;z-index:90;padding:10px;background:#fff8e7;color:#352f25;font:12px monospace;max-width:310px';el.textContent='Warming up room performance…';document.body.append(el);output.current=el;return()=>{el.remove();output.current=null;};},[]);
 useFrame((_,dt)=>{if(!output.current||document.hidden)return;start.current+=dt;if(start.current<4)return;times.current.push(dt*1000);if(times.current.length%120!==0)return;const a=times.current.slice(-1200).sort((a,b)=>a-b);const avg=a.reduce((n,t)=>n+t,0)/a.length;output.current.textContent=`${Math.round(1000/avg)} fps · p95 ${a[Math.floor(a.length*.95)].toFixed(1)} ms · ${gl.info.render.calls} draws · ${gl.info.render.triangles} triangles · DPR ${gl.getPixelRatio().toFixed(2)} · ${a.length} frames`;if(times.current.length>1200)times.current=times.current.slice(-1200);});
 return null;
}

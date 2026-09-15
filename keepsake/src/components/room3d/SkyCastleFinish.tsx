import {useEffect} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {Phase} from '../room/RoomFurniture';
import {cloudTexture} from './skyTextures';

/** Finish only the independent Sky Castle clone; cached source materials remain untouched. */
export function SkyCastleFinish({scene,phase}:{scene:THREE.Object3D;phase:Phase}){
  const {gl,scene:world}=useThree();
  useEffect(()=>{
    const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(gl);
    const env=pmrem.fromScene(studio,.04);const previous=world.environment;
    world.environment=env.texture;studio.dispose();pmrem.dispose();
    const grain=cloudTexture(true);const restore:Array<()=>void>=[];
    scene.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats){
        if(!(m instanceof THREE.MeshStandardMaterial))continue;
        if(m.name.includes('clear quartz')){const depth=m.depthWrite;m.depthWrite=false;o.castShadow=false;restore.push(()=>{m.depthWrite=depth;});}
        if(o.name==='Sky_Cloud_Floor'){
          const oldMap=m.map,oldBump=m.bumpMap,oldScale=m.bumpScale;m.map=grain;m.bumpMap=grain;m.bumpScale=.065;m.needsUpdate=true;
          restore.push(()=>{m.map=oldMap;m.bumpMap=oldBump;m.bumpScale=oldScale;m.needsUpdate=true;});
        }
      }
    });
    return()=>{restore.forEach(f=>f());if(world.environment===env.texture)world.environment=previous;env.dispose();grain.dispose();};
  },[gl,world,scene]);
  useEffect(()=>{
    const night=phase==='night',dusk=phase==='dusk';
    scene.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(!(m instanceof THREE.MeshStandardMaterial))continue;
        m.envMapIntensity=night?.20:dusk?.65:.85;
        if(o.name.startsWith('Sky_Castle')){
          if(m.name.includes('distant alabaster'))m.color.set(night?'#253846':dusk?'#c6b6c9':'#ccd9e9');
          if(m.name.includes('starlight')){m.emissive.set(night?'#aee7e4':'#fff2d0');m.emissiveIntensity=night?2.2:.65;}
        }
      }
    });
  },[scene,phase]);
  return null;
}

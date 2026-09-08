import {useEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useApp} from '../../store/appStore';
import {FURNITURE_ITEMS,type FurnitureCategory,type FurnitureId} from '../../lib/furniture';
import {loadFurniture} from './furnitureAssetCache';
import {useActiveRoom} from './useActiveRoom';
import {furnitureBounds,fitFurniture} from '../../lib/furnitureGeometry';
import {motionFactor,MOTION} from '../../lib/motion';
import {useReducedMotion} from '../../hooks/useReducedMotion';

const patterns:Partial<Record<FurnitureCategory,RegExp>>={
  desk:/^Desk_(Top|Apron_|Leg_)/,
  chair:/^(Chair_|Cozy_Chair|Cozy_Cushion)/,
  lamp:/^(Lamp_|Beachfront_Prop_Lamp_)/,
  beanbag:/^Beanbag(?:$|_StitchedSeams|_Carry)/,
  'guestbook-stand':/^Cozy_Guest_(Table|LowerShelf)/,
  cabinet:/^Archive_(Back|Deck|Header|Inlay|Plinth|SideL|SideR|Top)$/,
  bookshelf:/^Shelf_(Back|Bot|Kick|SideL|SideR|Top)$/,
  crt:/^CRT_/,
  rug:/^Semantic_Rug_/,
  curtains:/^Semantic_Curtain_/,
};
const anchors:Partial<Record<FurnitureCategory,string>>={chair:'ks_chair',beanbag:'Beanbag',crt:'ks_crt'};

export function FurnitureModels({scene}:{scene:THREE.Object3D}){
  const {environment}=useApp();const room=useActiveRoom().id;
  const choices=room==='woodland'||room==='beachfront'?environment.furniture?.[room]:undefined;
  return <>{FURNITURE_ITEMS.filter(item=>choices?.[item.category]===item.id&&item.category!=='printer').map(item=><FurnitureReplacement key={item.category} scene={scene} id={item.id} category={item.category}/>)}</>;
}

function FurnitureReplacement({scene,id,category}:{scene:THREE.Object3D;id:FurnitureId;category:FurnitureCategory}){
  const {environment}=useApp();const reduced=useReducedMotion();
  const lampMaterials=useRef<{material:THREE.MeshStandardMaterial;intensity:number}[]>([]);
  const screenPair=useRef<{source:THREE.Mesh;target:THREE.Mesh;last:THREE.Material|THREE.Material[]}|null>(null);
  useFrame((_,dt)=>{
    for(const {material,intensity} of lampMaterials.current)material.emissiveIntensity=THREE.MathUtils.lerp(material.emissiveIntensity,environment.lampOn?intensity:0,motionFactor(dt,MOTION.light,reduced));
    const pair=screenPair.current;
    if(pair&&pair.source.material!==pair.last){
      const old=pair.target.material;if(!Array.isArray(old))old.dispose();
      const source=Array.isArray(pair.source.material)?pair.source.material[0]:pair.source.material;
      pair.target.material=source.clone();pair.target.material.visible=true;pair.last=pair.source.material;
    }
  });
  useEffect(()=>{
    let live=true;let restore=()=>{};
    loadFurniture(id).then(asset=>{
      if(!live)return;
      const root=new THREE.Group();root.name=`furniture:${id}`;
      const originals:THREE.Mesh[]=[];scene.traverse(o=>{if(o instanceof THREE.Mesh&&patterns[category]?.test(o.name)&&!o.name.toLowerCase().includes('bulb'))originals.push(o);});
      const anchorName=anchors[category];
      const anchor=anchorName?(scene.getObjectByName(anchorName)??scene):scene;
      const materials:THREE.Material[]=[];const geometries:THREE.BufferGeometry[]=[];
      const make=()=>{
        const model=asset.scene.clone(true);
        model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const clone=(m:THREE.Material)=>{const copy=m.clone();materials.push(copy);return copy;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);}});
        return model;
      };
      if(category==='rug'){
        const model=make();if(originals.length)fitFurniture(model,furnitureBounds(originals,scene));else model.position.set(-.25,.008,.25);root.add(model);
      }else if(category==='curtains'){
        for(const side of [-1,1]){
          const original=scene.getObjectByName(`Beachfront_Curtain_${side}`);
          const panels=originals.filter(o=>o.name.includes(side<0?'Curtain_L':'Curtain_R')&&o.name.includes('linen'));
          const target=original?new THREE.Box3().setFromObject(original):furnitureBounds(panels,scene);
          if(target.isEmpty())continue;
          if(original instanceof THREE.Mesh)originals.push(original);
          const tie=scene.getObjectByName(`Beachfront_Curtain_Tie_${side}`);if(tie instanceof THREE.Mesh)originals.push(tie);
          const model=make();fitFurniture(model,target);root.add(model);
        }
      }else{
        if(!originals.length)return;
        const target=furnitureBounds(originals,anchor),model=make();
        if(category==='chair')model.rotation.y=Math.PI;
        if(category==='bookshelf')model.rotation.y=-Math.PI/2;
        fitFurniture(model,target,category==='lamp'||category==='beanbag');
        if(category==='bookshelf')model.traverse(o=>{if(/^Shelf(?:\d|_|$)/.test(o.name)&&o instanceof THREE.Mesh){const y=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y;if(y>target.min.y+.08&&y<target.max.y-.08)o.visible=false;}});
        if(category==='cabinet')model.traverse(o=>{if(/^(Drawer_front|Drawer_pull|Label_frame|Paper_label)/.test(o.name))o.visible=false;});
        if(category==='crt'){
          const source=scene.getObjectByName('CRT_Screen'),screen=model.getObjectByName('Screen_surface');
          if(source instanceof THREE.Mesh&&screen instanceof THREE.Mesh){
            const sourceMat=Array.isArray(source.material)?source.material[0]:source.material;screen.material=sourceMat.clone();materials.push(screen.material);
            const geometry=new THREE.PlaneGeometry(.285,.208);const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));screen.geometry=geometry;geometries.push(geometry);
            screenPair.current={source,target:screen,last:source.material};
          }
        }
        root.add(model);
      }
      // A parent can also carry a living book, plant or animation anchor.
      // Hide its own surface, preserving children and their world transforms.
      if(category==='beanbag'){const oldThrow=scene.getObjectByName('Finish_Folded_Throw');if(oldThrow instanceof THREE.Mesh)originals.push(oldThrow);}
      const hidden=originals.map(o=>({o,material:o.material,shadow:o.castShadow,visible:o.visible}));
      const finishes:{o:THREE.Mesh;original:THREE.Material|THREE.Material[];replacement:THREE.Material|THREE.Material[]}[]=[];
      const finishPattern=category==='desk'?/^Desk_Drawer(?:Front)?$/:category==='cabinet'?/^ks_archive_drawer$/:category==='bookshelf'?/^ks_shelf_board_/:null;
      if(finishPattern)scene.traverse(o=>{
        if(!(o instanceof THREE.Mesh)||!finishPattern.test(o.name))return;
        const original=o.material;
        const materialName=category==='cabinet'?(id.endsWith('-2')?'Sea-glass linen':'Pale ash'):(id.endsWith('-2')?'Pale ash':'Warm oak');
        const matching=materials.find(m=>m.name===materialName);
        const finish=(m:THREE.Material)=>{const copy=(matching??m).clone();materials.push(copy);return copy;};
        const replacement=Array.isArray(original)?original.map(finish):finish(original);o.material=replacement;finishes.push({o,original,replacement});
      });
      const invisible=new THREE.MeshBasicMaterial({visible:false});
      originals.forEach(o=>{if(o.name==='CRT_Screen')o.visible=false;else o.material=invisible;o.castShadow=false;});
      anchor.add(root);
      if(category==='lamp')lampMaterials.current=materials.filter((m):m is THREE.MeshStandardMaterial=>m instanceof THREE.MeshStandardMaterial).map(material=>({material,intensity:material.emissiveIntensity}));
      const report=()=>{const host=document.querySelector('.ks-room3d');if(host instanceof HTMLElement){const ids:string[]=[];scene.traverse(o=>{if(o.name.startsWith('furniture:'))ids.push(o.name.slice(10));});host.dataset.furnitureLoaded=ids.sort().join(',');}};
      report();
      restore=()=>{const pair=screenPair.current;if(pair&&!Array.isArray(pair.target.material))pair.target.material.dispose();screenPair.current=null;anchor.remove(root);hidden.forEach(({o,material,shadow,visible})=>{if(o.material===invisible)o.material=material;o.castShadow=shadow;o.visible=visible;});finishes.forEach(({o,original,replacement})=>{if(o.material===replacement)o.material=original;});invisible.dispose();materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());report();};
    }).catch(error=>{if(live)console.warn(`Could not place ${id}; original retained.`,error);});
    return()=>{live=false;lampMaterials.current=[];restore();};
  },[scene,id,category]);
  return null;
}

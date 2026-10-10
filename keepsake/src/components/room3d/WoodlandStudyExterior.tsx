import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {Phase} from '../room/RoomFurniture';

const DEPTHS = [-19, -15, -11, -8, -5.5, -3.7];
/** Rough registered paint layers: shared geography, authored depth, no autonomous drift.
 * Canvas marks are deliberately provisional. Replace with registered art exports after camera proof.
 */
type Season='spring'|'summer'|'autumn'|'winter';
function paintLayer(index: number, season: Season, phase: Phase) {
  const winter = season === 'winter';
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 768;
  const c = canvas.getContext('2d')!;
  const night = phase === 'night', dusk = phase === 'dusk';
  const palettes = winter
    ? (night ? ['#172838','#344b5b','#3b5968','#647e89','#3b5964','#263f48'] : ['#b9ccd2','#8fa9b4','#6b8994','#d6dedd','#59767b','#3d595d'])
    : season==='autumn'&&!night ? (dusk ? ['#b0a79a','#8b8878','#8a6b45','#b0793c','#8c5b33','#4d4332'] : ['#cdc9b4','#a8a58c','#9a7a4a','#c58a3e','#9d6a36','#554a35'])
    : season==='spring'&&!night ? (dusk ? ['#c1b2b0','#93a095','#6f8f72','#9fb07c','#6f9a63','#3f5c48'] : ['#d3dccb','#a4b9a6','#7ba67f','#b5c98a','#78a85f','#456a4c'])
    : (night ? ['#1c2b36','#34464c','#354d4a','#54685a','#364c3f','#263e35'] : dusk ? ['#a8b3ae','#7d9291','#617b70','#a49970','#67694b','#3b5447'] : ['#c8d3c2','#99aaa0','#708a78','#afaa79','#7b7e52','#405d49']);
  const path=(points:number[][],color:string)=>{
    c.fillStyle=color; c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
  };
  if(index===0){
    const gradient=c.createLinearGradient(0,0,0,768);
    gradient.addColorStop(0,palettes[0]);gradient.addColorStop(1,night?'#475861':winter?'#e6e4d5':dusk?'#d7bb98':'#eee6c6');
    c.fillStyle=gradient;c.fillRect(0,0,1024,768);
    c.fillStyle=night?'#d7dfd4':'#e9d9b0';c.beginPath();c.arc(730,237,night?13:22,0,Math.PI*2);c.fill();
    if(night){c.fillStyle='#b5c9cb';for(let i=0;i<44;i++)c.fillRect((i*137+43)%1024,80+(i*71)%230,1.5,1.5);}
    c.globalAlpha=.16;c.fillStyle='#eef0e3';
    for(const [x,y,w] of [[160,260,160],[610,300,230],[420,170,100]]){c.beginPath();c.ellipse(x,y,w,13,0,0,Math.PI*2);c.fill();}c.globalAlpha=1;
  }
  if(index===1){
    path([[0,467],[130,375],[235,428],[375,320],[515,421],[663,348],[815,435],[930,385],[1024,430],[1024,768],[0,768]],palettes[1]);
    if(winter)path([[309,370],[375,320],[454,376],[405,355],[381,374],[364,350]],night?'#8fa1ad':'#edf0e9');
  }
  if(index===2){
    path([[0,505],[165,459],[325,489],[493,444],[669,468],[802,449],[1024,484],[1024,768],[0,768]],palettes[2]);
    for(let i=0;i<50;i++){const x=i*23-35,y=463+Math.sin(i*.7)*17,h=18+(i*13)%31;path([[x-9,y+30],[x,y-h],[x+10,y+30]],palettes[2]);}
  }
  if(index===3){
    path([[0,565],[152,513],[327,536],[497,496],[700,524],[849,493],[1024,551],[1024,768],[0,768]],palettes[3]);
    c.strokeStyle=night?'#7a969b':winter?'#87adb9':'#9bb9b4';c.lineWidth=8;c.beginPath();c.moveTo(588,505);c.bezierCurveTo(454,551,710,587,505,656);c.bezierCurveTo(420,693,464,736,340,775);c.stroke();
    c.lineWidth=2;c.strokeStyle=night?'#9caeaa':'#dae2d4';c.stroke();
  }
  if(index===4){
    const tree=(x:number,y:number,h:number)=>{path([[x-7,y],[x-4,y-h],[x+5,y-h],[x+10,y]],'#4c5144');for(let j=0;j<5;j++){const yy=y-h+j*h*.14,w=15+j*9;path([[x-w,yy+h*.30],[x,yy],[x+w,yy+h*.30]],palettes[4]);if(winter)path([[x-w*.65,yy+h*.19],[x,yy],[x+w*.6,yy+h*.19]],night?'#71878b':'#dce4df');}};
    tree(178,681,249);tree(845,621,190);
  }
  if(index===5){
    path([[0,704],[134,683],[265,724],[351,760],[0,768]],palettes[5]);
    path([[740,760],[880,709],[1024,680],[1024,768]],palettes[5]);
  }
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
  return texture;
}
export function WoodlandStudyExterior({season,phase}:{season:Season;phase:Phase}) {
  const textures=useMemo(()=>DEPTHS.map((_,i)=>paintLayer(i,season,phase)),[season,phase]);
  useEffect(()=>()=>textures.forEach(t=>t.dispose()),[textures]);
  return <group name="woodland-study-layered-exterior">
    {DEPTHS.map((z,i)=><mesh key={z} name={'Study_Exterior_Layer_'+i} position={[-.15,2.15,z]} renderOrder={i-10}>
      <planeGeometry args={[(.5-z)*.88*4/3,(.5-z)*.88]}/>
      <meshBasicMaterial map={textures[i]} transparent={i>0} alphaTest={.01} depthWrite={i===0} toneMapped={false}/>
    </mesh>)}
  </group>;
}


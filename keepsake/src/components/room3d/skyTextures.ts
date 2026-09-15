import * as THREE from 'three';
const fract=(n:number)=>n-Math.floor(n);
function noise(x:number,y:number){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const h=(a:number,b:number)=>fract(Math.sin(a*127.1+b*311.7)*43758.5453);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(ix,iy),h(ix+1,iy),u),THREE.MathUtils.lerp(h(ix,iy+1),h(ix+1,iy+1),u),v);
}
/** Static multi-scale noise masks: no sphere clusters or per-frame texture uploads. */
export function cloudTexture(floor=false){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=floor?512:256;
  const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const u=x/canvas.width,v=y/canvas.height;
    const n=noise(u*7+3,v*5+7)*.52+noise(u*17,v*12)*.27+noise(u*43,v*32)*.14+noise(u*101,v*83)*.07;
    const edge=Math.max(0,1-Math.pow((u-.5)*2,2)-Math.pow((v-.52)*2.7,2));
    const alpha=floor?1:THREE.MathUtils.smoothstep(edge+n*.74-.47,0,.35);
    const light=floor?.60+n*.40:.67+n*.28+(1-v)*.05;
    const i=(y*canvas.width+x)*4;
    pixels.data[i]=Math.round(255*light);pixels.data[i+1]=Math.round(255*Math.min(1,light+.013));pixels.data[i+2]=Math.round(255*Math.min(1,light+.035));pixels.data[i+3]=Math.round(alpha*255);
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  if(floor){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);}
  return texture;
}

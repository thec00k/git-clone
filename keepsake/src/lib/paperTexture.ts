import {PAPER_MATERIALS,paperSettings,type PaperSettings} from './materials';
import type {ShaderMount} from '@paper-design/shaders';

// One shared, idle GPU surface. Pages keep only the resulting image, never a live shader.
let mount:ShaderMount|undefined;
let queue:Promise<unknown>=Promise.resolve();
const cache=new Map<string,Promise<string>>();
const frame=()=>new Promise<void>(resolve=>{const timer=setTimeout(resolve,150);requestAnimationFrame(()=>{clearTimeout(timer);resolve();});});
export function getPaperTexture(settings:PaperSettings):Promise<string> {
  const p=paperSettings(settings),key=JSON.stringify(p);
  const found=cache.get(key);if(found)return found;
  const result=queue.catch(()=>{}).then(async()=>{
    const {ShaderMount,paperTextureFragmentShader,getShaderColorFromString,getShaderNoiseTexture,ShaderFitOptions}=await import('@paper-design/shaders');
    const s=PAPER_MATERIALS[p.material],grain=p.texture*2,creases=p.wrinkles*2;
    const noise=getShaderNoiseTexture();if(!noise)throw new Error('Paper noise unavailable');await noise.decode();
    const uniforms={u_isImage:false,u_colorBack:getShaderColorFromString(s.color),u_colorPaper:getShaderColorFromString(s.color),u_colorShadow:getShaderColorFromString(s.shadow),u_blending:0,u_distortion:0,u_clip:false,u_angle:300,u_seed:s.seed,u_roughness:Math.min(1,s.roughness*grain),u_roughnessSize:s.grainSize,u_roughnessRows:0,u_fiber:Math.min(1,s.fiber*grain),u_fiberSize:s.fiberSize,u_folds:Math.min(1,s.folds*creases),u_foldSizeX:1,u_foldSizeY:1,u_foldOffsetX:.18,u_foldOffsetY:.31,u_wrinkles:Math.min(1,s.wrinkles*creases),u_wrinkleSize:s.wrinkleSize,u_crumples:0,u_crumpleCount:6,u_drops:s.drops*grain,u_noiseTexture:noise,u_fit:ShaderFitOptions.cover,u_scale:.9,u_rotation:0,u_offsetX:0,u_offsetY:0,u_originX:.5,u_originY:.5,u_worldWidth:0,u_worldHeight:0};
    // The vertex shader computes paper coordinates through the image box even without a photo.
    Object.assign(uniforms,{u_imageAspectRatio:1});
    if(!mount){
      const host=document.createElement('div');host.setAttribute('aria-hidden','true');host.dataset.paperRenderer='';
      Object.assign(host.style,{position:'fixed',left:'-10000px',top:'0',width:'768px',height:'1052px',pointerEvents:'none'});
      document.body.append(host);
      try{mount=new ShaderMount(host,paperTextureFragmentShader,uniforms,{preserveDrawingBuffer:true},0,0,1,768*1052);}catch(error){host.remove();throw error;}
      await frame();await frame();
    }else mount.setUniforms(uniforms);
    mount.setFrame(0);
    if(mount.canvasElement.width<100)throw new Error('Paper renderer is not ready');
    return mount.canvasElement.toDataURL('image/webp',.88);
  });
  cache.set(key,result);queue=result;
  if(cache.size>24)cache.delete(cache.keys().next().value!);
  result.catch(()=>cache.delete(key));return result;
}

/** Resolve material images before page capture or print, including freshly mounted pages. */
export async function preparePaperImages(root:HTMLElement) {
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img[data-paper-settings]')).map(async img=>{
    try{img.src=await getPaperTexture(JSON.parse(img.dataset.paperSettings!));await img.decode();img.dataset.paperReady='true';}
    catch{img.dataset.paperReady='fallback';}
  }));
}

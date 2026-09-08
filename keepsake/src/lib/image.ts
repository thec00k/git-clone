/** Downscale user images before storing them. */
export interface LoadedImage { src:string; aspect:number; }
export function loadImageFile(file:File):Promise<LoadedImage>{
 if(file.size>25*1024*1024)return Promise.reject(new Error('This image exceeds the 25 MB file limit.'));
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{try{
   const {naturalWidth:w,naturalHeight:h}=img;
   if(!w||!h||w*h>50_000_000)throw new Error('Choose an image smaller than 50 megapixels.');
   const scale=Math.min(1,1400/Math.max(w,h));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable.');
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const src=canvas.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',.86);
   if(src==='data:,')throw new Error('This image could not be processed.');
   resolve({src,aspect:w/h});
  }catch(error){reject(error);}finally{URL.revokeObjectURL(url);}};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read image'));};img.src=url;
 });
}

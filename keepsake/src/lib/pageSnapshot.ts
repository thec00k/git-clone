/** Capture a private local page for the turning mesh. Nothing is uploaded. */
export async function snapshotPage(page:HTMLElement,signal?:AbortSignal):Promise<HTMLCanvasElement> {
  const deadline=Date.now()+5000;
  const bounded=<T,>(pending:Promise<T>)=>new Promise<T>((resolve,reject)=>{
    const abort=()=>{cleanup();reject(new Error('Page snapshot cancelled'));};
    const timer=window.setTimeout(()=>{cleanup();reject(new Error('Page snapshot timed out'));},Math.max(1,deadline-Date.now()));
    const cleanup=()=>{window.clearTimeout(timer);signal?.removeEventListener('abort',abort);};
    signal?.addEventListener('abort',abort,{once:true});
    pending.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
    if(signal?.aborted)abort();
  });
  await bounded(document.fonts.ready);
  const {default:html2canvas}=await bounded(import('html2canvas'));
  const clone=page.cloneNode(true) as HTMLElement;
  const probe=document.createElement('canvas');probe.width=probe.height=1;
  const color=probe.getContext('2d',{willReadFrequently:true})!;
  const normalize=(value:string)=>value.replace(/(?:oklch|oklab|color)\([^)]*\)/g,token=>{
    color.clearRect(0,0,1,1);color.fillStyle=token;color.fillRect(0,0,1,1);
    const [r,g,b,a]=color.getImageData(0,0,1,1).data;return `rgba(${r},${g},${b},${a/255})`;
  });
  const originals=[page,...page.querySelectorAll('*')];
  const copies=[clone,...clone.querySelectorAll('*')];
  originals.forEach((node,i)=>{
    const style=getComputedStyle(node);const target=copies[i] as HTMLElement|SVGElement;
    for(const key of Array.from(style))target.style.setProperty(key,normalize(style.getPropertyValue(key)));
    if(target instanceof HTMLElement){target.removeAttribute('id');target.removeAttribute('tabindex');}
  });
  Object.assign(clone.style,{width:'480px',height:'657px',minWidth:'480px',maxWidth:'480px',position:'relative',transform:'none',margin:'0',flex:'none'});
  const host=document.createElement('div');host.setAttribute('aria-hidden','true');host.inert=true;
  Object.assign(host.style,{position:'fixed',left:'-10000px',top:'0',width:'480px',height:'657px',pointerEvents:'none'});
  host.append(clone);document.body.append(host);
  try {
    await bounded(Promise.all(Array.from(clone.querySelectorAll('img')).map(image=>image.decode().catch(()=>{}))));
    return await bounded(html2canvas(clone,{scale:2,width:480,height:657,backgroundColor:'#eee5d3',useCORS:true,logging:false,imageTimeout:4000,
      onclone:doc=>{doc.body.style.backgroundColor='#ffffff';doc.body.style.color='#332b24';}}));
  } finally {host.remove();}
}

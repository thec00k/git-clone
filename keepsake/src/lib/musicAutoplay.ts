/** Try playback normally; a browser-blocked start gets one retry on a room interaction. */
export function startWithGesture(play:()=>void){
 let live=true;
 const attempt=()=>{if(live){try{play();}catch{/* The native player remains available. */}}};
 const clean=()=>{live=false;document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);};
 const gesture=(event:Event)=>{if(event.target instanceof Element&&event.target.closest('[data-music-controls],input,select,textarea'))return;attempt();clean();};
 document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);attempt();return clean;
}

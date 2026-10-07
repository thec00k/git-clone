import React from 'react';
import {createRoot} from 'react-dom/client';
import {PaperTexture} from '@paper-design/shaders-react';
import './style.css';
const base={colorBack:'#E4E7E1',blending:0,distortion:0,clip:false,angle:300,roughnessRows:0,foldSizeX:1,foldSizeY:1,foldOffsetX:0.18,foldOffsetY:0.31,crumples:0,crumpleCount:6,scale:0.9,fit:'cover'};
const studies=[
{id:'warm-cream',name:'Warm cream',note:'Soft grain and shallow undulations. The everyday album stock.',colorPaper:'#F5EBD6',colorShadow:'#C9BDA1',seed:4,roughness:0.24,roughnessSize:0.35,fiber:0.18,fiberSize:0.35,folds:0.04,wrinkles:0.15,wrinkleSize:0.6,drops:0.035},
{id:'handmade-cotton',name:'Handmade cotton',note:'Visible fibers and uneven pulp. A cooler, handmade sheet.',colorPaper:'#F1EFE7',colorShadow:'#BAB9A6',seed:17,roughness:0.34,roughnessSize:0.46,fiber:0.6,fiberSize:0.55,folds:0.025,wrinkles:0.24,wrinkleSize:0.42,drops:0.06},
{id:'creased-journal',name:'Creased journal',note:'Warm stock with broad wrinkles and a soft fold. For letters and old memories.',colorPaper:'#E6D5B3',colorShadow:'#B5A17D',seed:29,roughness:0.26,roughnessSize:0.4,fiber:0.24,fiberSize:0.4,folds:0.22,wrinkles:0.48,wrinkleSize:0.72,drops:0.09}
];
function save(id){const source=document.querySelector('#'+id+' canvas');fetch('/save/'+id,{method:'POST',body:source.toDataURL('image/png')}).then(r=>{if(!r.ok)throw Error('Save failed');document.querySelector('#'+id).dataset.saved='yes';document.querySelector('#'+id).closest('article').querySelector('button').textContent='Saved '+id+' PNG';});}
function App(){return <><header><p>KEEPSAKE / PAPER MATERIAL STUDIES</p><h1>Three sheets. Three kinds of memory.</h1><p>Actual Paper Texture shader renders · clean paper only · 1024 × 1280 pixels</p></header><main>{studies.map(({id,name,note,...props},i)=><article key={id}><div id={id} className="sheet"><PaperTexture {...base} {...props} webGlContextAttributes={{preserveDrawingBuffer:true}} width={1024} height={1280} minPixelRatio={1} maxPixelCount={1310720} style={{width:1024,height:1280}} /></div><h2>0{i+1} / {name}</h2><p>{note}</p><button onClick={()=>save(id)}>Download {name} PNG</button></article>)}</main></>};
createRoot(document.getElementById('root')).render(<App/>);

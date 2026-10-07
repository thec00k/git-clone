import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ScrapbookPage} from '../components/ScrapbookPage';
import {StickerFinishControls,PaperControls} from '../components/MaterialControls';
import {PAPER_MATERIALS,STICKER_FINISHES,type PaperSettings} from '../lib/materials';
import {StickerSurface} from '../components/StickerSurface';
import {PaperSurface} from '../components/PaperSurface';
import {snapshotPage} from '../lib/pageSnapshot';
import type {Page,PageElement,StickerElement} from '../types/scrapbook';
import '../index.css';
import './material-study.css';
const initial:Page={id:'study',paper:{material:'cream',texture:.5,wrinkles:.5},elements:Object.keys(STICKER_FINISHES).map((finish,i)=>({id:`sample-${i}`,type:'sticker',glyph:'keepsake:toadstool',finish:finish as StickerElement['finish'],finishStrength:.8,x:i%2===0?29:72,y:i<2?32:72,w:34,rotation:i%2===0?-6:5,z:i+1}))};
export function MaterialStudy(){
  const [page,setPage]=useState<Page>(()=>{try{return JSON.parse(localStorage.getItem('keepsake-material-study')||'null')||initial;}catch{return initial;}});
  const [selected,setSelected]=useState('sample-2'),[capture,setCapture]=useState(''),[busy,setBusy]=useState(false);
  const save=(next:Page)=>{setPage(next);localStorage.setItem('keepsake-material-study',JSON.stringify(next));};
  const update=(id:string,patch:Partial<PageElement>)=>save({...page,elements:page.elements.map(e=>e.id===id?{...e,...patch} as PageElement:e)});
  const sticker=page.elements.find(e=>e.id===selected) as StickerElement|undefined;
  return <main className="material-study"><header><p>KEEPSAKE / THE FINISHING TOUCHES</p><h1>Little things with a little depth.</h1><p>Choose a paper. Catch the light. Drag a sticker into place.</p></header><div className="material-study-layout"><section className="material-study-page"><ScrapbookPage page={page} active={false} bookTitle="" bookSubtitle="" selectedId={selected} onSelect={setSelected} onActivate={()=>{}} onDeselect={()=>setSelected('')} onMove={(id,x,y)=>update(id,{x,y})} onTransform={update} onEditText={()=>{}}/></section><aside><h2>Make it yours</h2><PaperControls settings={page.paper} onChange={(paper:PaperSettings|undefined)=>save({...page,paper})}/>{sticker&&<><h3>Sticker finish</h3><StickerFinishControls glyph={sticker.glyph} finish={sticker.finish} strength={sticker.finishStrength} onChange={p=>update(sticker.id,p)}/></>}<p className="material-study-note">Select a mushroom to change its finish. Drag to move; use its handles to resize or turn it.</p><button disabled={busy} onClick={async()=>{setBusy(true);try{const c=await snapshotPage(document.querySelector('.material-study-page .ks-page')!);setCapture(c.toDataURL());}finally{setBusy(false);}}}>{busy?'Preparing…':'Preview page-turn image'}</button><button onClick={()=>{save(initial);setSelected('sample-2');}}>Reset study</button></aside></div><section className="material-study-swatches" aria-label="Paper samples">{Object.entries(PAPER_MATERIALS).map(([id,s])=><figure key={id}><div><PaperSurface settings={{material:id as PaperSettings['material'],texture:.5,wrinkles:.5}}/></div><figcaption>{s.name}</figcaption></figure>)}</section><section className="material-study-finishes" aria-label="Finish comparison">{Object.entries(STICKER_FINISHES).map(([id,name])=><figure key={id}><StickerSurface glyph="keepsake:toadstool" finish={id as StickerElement['finish']} strength={.8}/><figcaption>{name}</figcaption></figure>)}</section>{capture&&<section><h2>Page-turn image</h2><img alt="Captured scrapbook page with paper and sticker finishes" src={capture} style={{width:360,maxWidth:'100%'}}/></section>}</main>;
}
const root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);
root.render(<MaterialStudy/>);
if(import.meta.hot)import.meta.hot.dispose(data=>{data.root=root;});

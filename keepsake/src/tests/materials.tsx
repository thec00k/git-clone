import {createRoot} from 'react-dom/client';
import {AppProvider,useApp} from '../store/appStore';
import {useScrapbook} from '../hooks/useScrapbook';
import {PaperControls} from '../components/MaterialControls';
import {SelectionToolbar} from '../components/SelectionToolbar';
import {ScrapbookPage} from '../components/ScrapbookPage';
import '../index.css';
function Test(){const sb=useScrapbook(),{flushSave}=useApp();const page=sb.pages[1];if(!page)return null;return <main style={{padding:24,background:'#e8e4d4',minHeight:'100vh',color:'#302d25'}}><h1>Saved material checks</h1><div style={{display:'flex',gap:20,flexWrap:'wrap'}}><div style={{width:300}}><PaperControls settings={page.paper} onChange={p=>sb.setPaperMaterial(page.id,p)}/><button onClick={()=>sb.addSticker(page.id,'keepsake:toadstool')}>Add test sticker</button><button onClick={sb.undo} disabled={!sb.canUndo}>Undo</button><button onClick={sb.redo} disabled={!sb.canRedo}>Redo</button><button onClick={()=>void flushSave()}>Save fixture</button><output data-state style={{display:'block',wordBreak:'break-all',fontSize:11}}>{JSON.stringify(page)}</output></div><div style={{width:360}}><ScrapbookPage page={page} active={false} bookTitle="" bookSubtitle="" selectedId={sb.selectedId} onSelect={sb.setSelectedId} onActivate={()=>{}} onDeselect={()=>sb.setSelectedId(null)} onMove={(id,x,y)=>sb.updateElement(id,{x,y})} onTransform={sb.updateElement} onEditText={()=>{}}/></div></div>{sb.selected&&<SelectionToolbar selected={sb.selected} onRotate={sb.rotateBy} onScale={sb.scaleBy} onReset={sb.resetTransform} onForward={sb.bringForward} onBackward={sb.sendBackward} onCycleFrame={sb.cycleFrame} onColor={()=>{}} onLook={()=>{}} onReplace={()=>{}} onDelete={sb.removeElement} onFinish={sb.setStickerFinish}/>}</main>;}
if(location.port!=='5185')throw new Error('Use the isolated 5185 test server.');
createRoot(document.getElementById('root')!).render(<AppProvider><Test/></AppProvider>);

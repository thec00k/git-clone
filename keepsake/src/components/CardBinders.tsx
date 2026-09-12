import {lazy,Suspense,useEffect,useMemo,useRef,useState,type CSSProperties,type ComponentType,type ReactNode} from 'react';
import {useApp} from '../store/appStore';
import {useFocusTrap} from '../hooks/useFocusTrap';
import {loadImageFile,type LoadedImage} from '../lib/image';
import {checkImportCapacity,checkStorageCapacity} from '../lib/importLimits';
import {BINDER_COLORS,MAX_BINDER_CARDS,binderCardAt,binderSpreadCount,cardsWithPositions,newCardBinder,placeBinderCards,validateCardGlb,type BinderCard,type CardBinder} from '../lib/cardBinders';
import './CardBinders.css';
import {BinderPageTurn} from './BinderPageTurn';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {WalletNftImport} from './WalletNftImport';
import type {WalletNft} from '../lib/solanaWalletNfts';
const BinderScan=lazy(()=>import('./BinderScan').then(m=>({default:m.BinderScan})));

export function CardBinders({onClose,initialId,onPick,frame:Frame}:{onClose:()=>void;initialId?:string;onPick?:(id:string)=>void;frame?:ComponentType<{header?:ReactNode;footer?:ReactNode;children:ReactNode}>}) {
 const {state,update}=useApp();const root=useRef<HTMLDivElement>(null),addMenu=useRef<HTMLDetailsElement>(null),alive=useRef(true);
 const binders=state.cardBinders??[];
 const [id,setId]=useState(initialId??binders[0]?.id??''),[spread,setSpread]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[back,setBack]=useState(false),[cover,setCover]=useState(false),[targetPosition,setTargetPosition]=useState<number|null>(null);
 const [removed,setRemoved]=useState<{binderId:string;card:BinderCard}|null>(null);
 const binder=binders.find(b=>b.id===id)??binders[0];
 const placedCards=useMemo(()=>cardsWithPositions(binder?.cards??[]),[binder?.cards]);const card=placedCards.find(c=>c.id===selected);
 useFocusTrap(root,()=>{if(selected)setSelected(null);else onClose();});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const change=(fn:(b:CardBinder)=>CardBinder)=>{if(binder)update(s=>({...s,cardBinders:(s.cardBinders??[]).map(b=>b.id===binder.id?fn(b):b)}));};
 const changeCard=(patch:Partial<BinderCard>)=>change(b=>({...b,cards:b.cards.map(c=>c.id===selected?{...c,...patch}:c)}));
 const create=()=>{const b=newCardBinder();update(s=>({...s,cardBinders:[...(s.cardBinders??[]),b]}));setId(b.id);setSpread(0);setCover(true);setSelected(null);if(onPick)onPick(b.id);};
 async function images(files:FileList|null,kind:'cards'|'cover'|'back'='cards') {
  if(!files?.length||!binder)return;
  const picked=Array.from(files);if(picked.length>20||kind==='cards'&&binder.cards.length+picked.length>MAX_BINDER_CARDS){setMessage('Choose up to 20 images at once; each binder holds 180 cards.');return;}
  setBusy(true);setMessage('Preparing your cards…');const target=binder.id,targetCard=selected,targetPocket=targetPosition??undefined;
  try {
   await checkImportCapacity(picked);
   const photos:(LoadedImage&{name:string})[]=[];for(const file of picked){if(!alive.current)return;photos.push({...await loadImageFile(file,state.profile.preserveOriginals!==false),name:file.name});}
   await checkStorageCapacity(photos.reduce((n,p)=>n+p.src.length,0));if(!alive.current)return;
   const cards:BinderCard[]=photos.map(p=>({id:crypto.randomUUID(),title:p.name.replace(/\.[^.]+$/,'').slice(0,100),src:p.src,source:'image',finish:'paper'}));
   update(s=>({...s,archive:[...s.archive,...photos.map(p=>({id:crypto.randomUUID(),src:p.src,aspect:p.aspect,original:p.original,createdAt:Date.now(),categories:[],favorite:false}))],cardBinders:(s.cardBinders??[]).map(b=>b.id!==target?b:kind==='cover'?{...b,coverSrc:photos[0].src}:kind==='back'?{...b,cards:b.cards.map(c=>c.id===targetCard?{...c,backSrc:photos[0].src}:c)}:{...b,cards:placeBinderCards(b.cards,cards,targetPocket)})}));
   if(kind==='cards')setTargetPosition(null);setMessage(`${photos.length} image${photos.length===1?'':'s'} added. Full images are kept in your filing cabinet.`);
  }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Could not import these images.');}finally{if(alive.current)setBusy(false);}
 }
 async function scan(file:File|undefined) {
  if(!file||!binder)return;
  if(binder.cards.length>=MAX_BINDER_CARDS||binder.cards.filter(c=>c.modelSrc).length>=9){setMessage('This binder is full or already holds nine 3D scans.');return;}
  setBusy(true);const target=binder.id,targetPocket=targetPosition??undefined;
  try {
   if(file.size>5*1024*1024)throw new Error('Choose a GLB smaller than 5 MB.');
   validateCardGlb(await file.arrayBuffer());await checkStorageCapacity(file.size*2);
   const src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read scan.'));reader.readAsDataURL(new Blob([file],{type:'model/gltf-binary'}));});
   if(!alive.current)return;
   const item:BinderCard={id:crypto.randomUUID(),title:file.name.replace(/\.glb$/i,'').slice(0,100),modelSrc:src,source:'imported-scan',finish:'paper'};
   update(s=>({...s,cardBinders:(s.cardBinders??[]).map(b=>b.id===target?{...b,cards:placeBinderCards(b.cards,[item],targetPocket)}:b)}));setTargetPosition(null);setMessage('Scan added. Select it to inspect in 3D.');
  }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Could not import scan.');}finally{if(alive.current)setBusy(false);}
 }
 async function walletNfts(assets:WalletNft[]) {
  if(!binder||!assets.length)return;
  if(assets.length>20||binder.cards.length+assets.length>MAX_BINDER_CARDS)throw new Error('Choose up to 20 NFTs and leave enough open binder pockets.');
  setBusy(true);setMessage('Copying selected NFT artwork into this room…');const target=binder.id,targetPocket=targetPosition??undefined,photos:(LoadedImage&{name:string})[]=[];let skipped=0;
  try {for(const asset of assets){try{const response=await fetch(asset.image,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw new Error();const blob=await response.blob();if(!['image/png','image/jpeg','image/webp','image/gif'].includes(blob.type))throw new Error();photos.push({...await loadImageFile(new File([blob],asset.title,{type:blob.type}),false),name:asset.title});}catch{skipped++;}}
   if(!photos.length)throw new Error('The selected NFT artwork could not be copied. Its image host may block browser access.');await checkStorageCapacity(photos.reduce((n,p)=>n+p.src.length,0));if(!alive.current)return;
   const cards:BinderCard[]=photos.map(p=>({id:crypto.randomUUID(),title:p.name.slice(0,100),src:p.src,source:'image',finish:'paper'}));update(s=>({...s,archive:[...s.archive,...photos.map(p=>({id:crypto.randomUUID(),src:p.src,aspect:p.aspect,createdAt:Date.now(),categories:[],favorite:false}))],cardBinders:(s.cardBinders??[]).map(b=>b.id===target?{...b,cards:placeBinderCards(b.cards,cards,targetPocket)}:b)}));setTargetPosition(null);setMessage(`${cards.length} NFT${cards.length===1?'':'s'} added${skipped?`; ${skipped} could not be copied`:''}.`);
  }finally{if(alive.current)setBusy(false);}
 }
 async function receiveFromDesktop() {
  const address=window.prompt('Receiver address shown in the desktop terminal:', 'http://127.0.0.1:4318');
  if(!address)return;
  setBusy(true);setMessage('Looking for the latest phone scan…');
  try { const response=await fetch(`${address.replace(/\/$/,'')}/latest`); if(!response.ok) throw new Error(response.status===404?'No scan has arrived yet. Send one from Keepsake Scanner first.':'Could not reach the receiver. Keep it running on this desktop.'); const bytes=await response.arrayBuffer(); const disposition=response.headers.get('content-disposition')??''; const name=(/filename="?([^";]+)/.exec(disposition)?.[1]??'keepsake-scan.glb'); await scan(new File([bytes],name,{type:'model/gltf-binary'})); }
  catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Could not receive the scan.');} finally {if(alive.current)setBusy(false);}
 }
 const reduced=useReducedMotion();
 const [turn,setTurn]=useState<{from:number;to:number}|null>(null);
 const changeSpread=(to:number)=>{if(turn||busy)return;setSelected(null);if(Frame&&!reduced)setTurn({from:spread,to});else setSpread(to);};
 const pages=binderSpreadCount(placedCards);
 const header=<div className="ks-binder-dialog ks-binder-controls">  <header><div><small>A COLLECTION WORTH KEEPING</small><h2 id="binder-heading">{Frame?binder?.title:'Card binders'}</h2></div><button onClick={onClose} aria-label="Close card binders">×</button></header>
  {!Frame&&<nav aria-label="Binder collection"><label>Collection <select aria-label="Binder collection" disabled={busy} value={binder?.id??''} onChange={e=>{setId(e.target.value);if(onPick)onPick(e.target.value);setSpread(0);setSelected(null);setCover(false);}}>{!binders.length&&<option value="">No binders yet</option>}{binders.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label><button disabled={busy||binders.length>=12} onClick={create}>New card binder</button>{onPick&&binder&&<button onClick={()=>onPick(binder.id)}>Read at desk</button>}</nav>}
{binder&&<>   <div className="ks-binder-tools">{cover&&<label>Binder title <input maxLength={80} value={binder.title} onChange={e=>change(b=>({...b,title:e.target.value}))}/></label>}<button aria-pressed={cover} onClick={()=>{if(Frame){onClose();return;}setCover(!cover);setSelected(null);}}>{cover?'Open binder':'View cover'}</button>{cover&&<label>Cover color <select aria-label="Cover color" value={binder.color} onChange={e=>change(b=>({...b,color:e.target.value}))}>{BINDER_COLORS.map((c,i)=><option value={c} key={c}>{['Moss','Ocean','Plum','Cognac','Charcoal'][i]}</option>)}</select></label>}</div>
   <details ref={addMenu} className="ks-binder-add"><summary>Add cards</summary>{targetPosition!==null&&<div className="ks-pocket-target"><span>Adding to pocket {targetPosition+1}</span><button onClick={()=>setTargetPosition(null)}>Choose automatically</button></div>}<div className="ks-binder-import"><label className="ks-binder-file">Add card images<input disabled={busy} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Upload card images" onChange={e=>{void images(e.target.files);e.target.value='';}}/></label><label className="ks-binder-file">Photograph a card<input disabled={busy} type="file" accept="image/*" capture="environment" aria-label="Photograph a real card" onChange={e=>{void images(e.target.files);e.target.value='';}}/></label><label className="ks-binder-file">Import 3D scan (.glb)<input disabled={busy} type="file" accept=".glb" aria-label="Import scanned card GLB" onChange={e=>{void scan(e.target.files?.[0]);e.target.value='';}}/></label></div>
   <WalletNftImport disabled={busy} remaining={MAX_BINDER_CARDS-binder.cards.length} onImport={walletNfts}/><p className="ks-binder-help">Nine pockets per page · PNG, JPEG, WebP and animated GIF cards are supported. Wallet imports copy selected Solana NFT artwork into this private room. Photograph cards straight-on for best results. Import a self-contained GLB up to 5 MB and 50,000 triangles.</p></details>
   <details className="ks-binder-add"><summary>Receive a scan from your phone</summary><p>In the Keepsake folder on this desktop, run <code>npm run scanner:receive</code>. Keep that window open, then enter the shown local address and pairing code in Keepsake Scanner on your phone.</p><button disabled={busy} onClick={()=>void receiveFromDesktop()}>Import latest phone scan</button><p>The latest scan is transferred privately over your home Wi-Fi and added directly to this binder. The receiver also saves a backup in <code>scanner-imports</code>. The first scanner version is for LiDAR-equipped iPhone Pro and iPad Pro devices.</p></details>
</>}</div>;
 const content=<div className="ks-binder-page-area">   {!binder?<div className="ks-binder-empty">Create a binder for your cards and keepsakes.</div>:cover?<div className="ks-binder-cover" style={{backgroundColor:binder.color}}>{binder.coverSrc&&<img src={binder.coverSrc} alt="Binder cover artwork"/>}<h3>{binder.title||'Untitled collection'}</h3><span>{binder.cards.length} keepsakes</span><label className="ks-binder-file">Choose cover artwork<input disabled={busy} type="file" accept="image/*" aria-label="Upload binder cover" onChange={e=>{void images(e.target.files,'cover');e.target.value='';}}/></label></div>:<div className="ks-card-spread" style={{'--binder-color':binder.color} as CSSProperties}>
    {[0,1].map(side=><section key={`${spread}-${side}`} className="ks-pocket-page" aria-label={`Binder page ${spread*2+side+1}`}>
     {Array.from({length:9},(_,slot)=>{const under=turn?(turn.to>turn.from?(side===0?turn.from:turn.to):(side===0?turn.to:turn.from)):spread;const index=under*18+side*9+slot;const c=binderCardAt(placedCards,index);return <button className={`ks-card-pocket ${c?.finish==='foil'?'is-foil':''} ${c?'':'is-empty'}`} key={slot} disabled={!!turn||busy} aria-label={c?`Inspect card ${index+1}: ${c.title}`:`Add a card to empty pocket ${index+1}`} onClick={()=>{if(c){setSelected(c.id);setBack(false);return;}setTargetPosition(index);setMessage(`Pocket ${index+1} selected. Choose how you would like to add a card.`);if(addMenu.current){addMenu.current.open=true;addMenu.current.scrollIntoView({behavior:reduced?'auto':'smooth',block:'nearest'});}}}>{c?.src?<img src={c.src} alt={c.title} loading="lazy"/>:c?.modelSrc?<span>◇<br/>{c.title}<small>3D scan</small></span>:<span className="ks-pocket-add" aria-hidden="true">＋</span>}</button>;})}
    </section>)}<div className="ks-binder-rings" aria-hidden="true"><i/><i/><i/></div>
   {turn&&<BinderPageTurn binder={binder} from={turn.from} to={turn.to} onDone={()=>{setSpread(turn.to);setTurn(null);}}/>}</div>}
</div>;
 const footer=<div className="ks-binder-dialog ks-binder-controls">{binder&&<>   {!cover&&<footer><button disabled={!spread||!!turn||busy} onClick={()=>changeSpread(spread-1)}>Previous binder spread</button><span>Spread {spread+1} of {pages} · {binder.cards.length} cards</span><button disabled={spread>=pages-1||!!turn||busy} onClick={()=>changeSpread(spread+1)}>Next binder spread</button></footer>}
   {card&&<section className="ks-card-inspector" aria-label="Selected card"><header><h3>Closer look</h3><button onClick={()=>setSelected(null)}>Return to binder</button></header>
    {card.modelSrc?<Suspense fallback={<p>Loading viewer…</p>}><BinderScan src={card.modelSrc}/></Suspense>:<div className={`ks-inspected-card ${card.finish==='foil'?'is-foil':''}`} onPointerMove={e=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.transform=`perspective(900px) rotateY(${(e.clientX-r.left-r.width/2)/r.width*22}deg) rotateX(${-(e.clientY-r.top-r.height/2)/r.height*16}deg)`;}} onPointerLeave={e=>{e.currentTarget.style.transform='';}}>{(back?card.backSrc:card.src)?<img src={back?card.backSrc:card.src} alt={`${card.title} ${back?'back':'front'}`}/>:<span>No back image yet</span>}</div>}
    <label>Card title <input maxLength={100} value={card.title} onChange={e=>changeCard({title:e.target.value})}/></label>
    {!card.modelSrc&&<><button aria-pressed={back} onClick={()=>setBack(!back)}>{back?'Show card front':'Show card back'}</button><label className="ks-binder-file">Add back image<input disabled={busy} type="file" accept="image/*" aria-label="Upload card back" onChange={e=>{void images(e.target.files,'back');e.target.value='';}}/></label><label>Card finish <select aria-label="Card finish" value={card.finish} onChange={e=>changeCard({finish:e.target.value as BinderCard['finish']})}><option value="paper">Paper</option><option value="foil">Foil shimmer</option></select></label></>}
    <label>Move to pocket <select aria-label="Move to pocket" value={card.position} onChange={e=>{const to=Number(e.target.value);change(b=>{const cards=cardsWithPositions(b.cards),moving=cards.find(c=>c.id===card.id),occupant=binderCardAt(cards,to);if(!moving)return b;return {...b,cards:cards.map(c=>c.id===moving.id?{...c,position:to}:occupant&&c.id===occupant.id?{...c,position:moving.position}:c)};});setSpread(Math.floor(to/18));}}>{Array.from({length:MAX_BINDER_CARDS},(_,i)=><option key={i} value={i}>Pocket {i+1}{binderCardAt(placedCards,i)&&binderCardAt(placedCards,i)?.id!==card.id?' — swap':''}</option>)}</select></label>
    <button disabled={busy} onClick={()=>{setRemoved({binderId:binder.id,card});change(b=>({...b,cards:cardsWithPositions(b.cards).filter(c=>c.id!==card.id)}));setSelected(null);}}>Remove from binder</button>
   </section>}

</>}  {removed&&<button disabled={busy||(binders.find(b=>b.id===removed.binderId)?.cards.length??0)>=MAX_BINDER_CARDS} onClick={()=>{update(s=>({...s,cardBinders:(s.cardBinders??[]).map(b=>{if(b.id!==removed.binderId||b.cards.length>=MAX_BINDER_CARDS)return b;return {...b,cards:placeBinderCards(b.cards,[removed.card],removed.card.position)};})}));setRemoved(null);}}>Undo card removal</button>}
  <p role="status">{message}</p><small>Saved in this browser with your room. Room backups include binders and imported scans. Private prototype collection.</small>
</div>;
 return Frame?<Frame header={header} footer={footer}>{content}</Frame>:<div className="ks-binder-backdrop"><div ref={root} className="ks-binder-dialog" role="dialog" aria-modal="true" aria-labelledby="binder-heading">{header}{content}{footer}</div></div>;
}

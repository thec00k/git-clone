import {useApp} from '../store/appStore';
import {EXTRA_GOODS,NEON_EXTRAS,CABIN_EXTRAS,buyCabinExtra,placeCabinMount,buyExtra,buyNeonExtra,placePoster,placeNeonSign,getNeonSign} from '../lib/roomShop';
export {ShopRoomVariants} from './ShopRoomVariants';
export function ShopCreativeExtras(){
 const {state,update,environment}=useApp();const d=state.roomDecor??{owned:[]};const neon=environment.roomTheme==='cyberpunk';
 const cabin=environment.roomTheme==='snowy-mountain';
 const items=neon?[...NEON_EXTRAS,...EXTRA_GOODS]:cabin?[...CABIN_EXTRAS,...EXTRA_GOODS]:EXTRA_GOODS;
 return <>
  <p className="mb-3 text-sm text-paper/65">Posters hang near the door, one at a time. Markers and stamps appear in your scrapbook.{neon?' Choose one neon sign for the spot above the light switch.':''}</p>
  <ul className="ks-sticker-shop-list">{items.map(item=>{
   if(item.kind==='Mount'){
    const owned=d.owned.includes(item.id),placed=d.cabinMounts?.includes(item.id);
    return <li className="ks-sticker-pack" key={item.id}><span className="text-3xl" aria-hidden="true">{item.icon}</span><div className="flex-1"><p className="font-display">{item.title}</p><small>{item.description}</small></div><button className="ks-tool" aria-pressed={!!placed} aria-label={`${placed?'Put away':owned?'Hang':'Add'} ${item.title}`} onClick={()=>update(s=>owned?placeCabinMount(s,item.id,!placed):buyCabinExtra(s,item.id))}>{placed?'Put away':owned?'Hang':'Add · included'}</button></li>;
   }
   const owned=d.owned.includes(item.id),sign=item.kind==='Sign',placed=sign?getNeonSign(d)===item.id:d.posterItem===item.id,wall=sign||item.kind==='Poster';
   const label=placed?`${item.title} is on the wall`:owned?wall?`Hang ${item.title}`:`${item.title} is owned`:`Buy ${item.title} for ${item.price} stamps`;
   return <li className="ks-sticker-pack" key={item.id}><span className="text-3xl" aria-hidden="true">{item.icon}</span><div className="flex-1"><p className="font-display">{item.title}</p><small>{item.description}</small></div><button className="ks-tool" disabled={!!placed||owned&&!wall||!owned&&state.stamps<item.price} aria-label={label} onClick={()=>update(s=>owned?(item.kind==='Sign'?placeNeonSign(s,item.id):placePoster(s,item.id)):NEON_EXTRAS.some(i=>i.id===item.id)?buyNeonExtra(s,item.id):buyExtra(s,item.id))}>{placed?'On the wall':owned?wall?'Hang':'Owned':item.price===0?'Add · included':`${item.price} stamps`}</button></li>;
  })}</ul>
  {d.posterItem&&<button className="ks-tool mt-3" onClick={()=>update(s=>placePoster(s))}>Put poster away</button>}
  {neon&&getNeonSign(d)&&<button className="ks-tool mt-3" onClick={()=>update(s=>placeNeonSign(s,null))}>{getNeonSign(d)==='neon-heart'?'Put heart sign away':'Put cherry sign away'}</button>}
  {neon&&d.posterItem==='poster-snake'&&<button className="ks-tool mt-3" aria-pressed={!!d.snakePaused} onClick={()=>update(s=>({...s,roomDecor:{...s.roomDecor!,snakePaused:!s.roomDecor?.snakePaused}}))}>{d.snakePaused?'Resume poster animation':'Pause poster animation'}</button>}
 </>;
}

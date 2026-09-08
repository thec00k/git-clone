import {useApp} from '../store/appStore';
import {useNav} from '../store/nav';
import {canSee} from '../lib/permissions';
import type {MemoryPin} from '../types/app';
export function PinPageLink({pin}:{pin:MemoryPin}){
 const {state,updatePin,setActiveBook}=useApp();const {go,setBookPageId,viewAs,isVisitor}=useNav();
 const book=state.books.find(b=>b.id===pin.bookId&&canSee(b.visibility,viewAs,state.profile.allowFriendScrapbooks===true));const page=book?.pages.find(p=>p.id===pin.pageId);
 return <section className="ks-pin-page-link">{!isVisitor&&<label>Linked scrapbook page<select aria-label="Linked scrapbook page" value={page?JSON.stringify([book!.id,page.id]):''} onChange={e=>{const [bookId,pageId]=e.target.value?JSON.parse(e.target.value):[];updatePin(pin.id,{bookId,pageId});}}><option value="">No linked page</option>{state.books.map(b=><optgroup key={b.id} label={b.title}>{b.pages.map((p,i)=><option key={p.id} value={JSON.stringify([b.id,p.id])}>Page {i+1}{p.titlePage?' · title':''}</option>)}</optgroup>)}</select></label>}{page&&<button className="ks-tool" onClick={()=>{setActiveBook(book!.id);setBookPageId(page.id);go('book');}}>Open {book!.title} · page {book!.pages.indexOf(page)+1}</button>}{!isVisitor&&pin.pageId&&!page&&<small>This linked page is no longer available. Choose another page.</small>}</section>;
}

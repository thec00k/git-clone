import type { AppState } from '../types/app';
export const PLACES = [
 {id:'guestbook',label:'Beside the guestbook',hint:'A paper corner peeks from the small round table.',position:[-1.48,.704,-1.49],rotation:[-Math.PI/2,0,.18]},
 {id:'shelf',label:'Between the books',hint:'Look along the lower shelf for a cream paper slip.',position:[2.16,.473,.526],rotation:[-Math.PI/2,0,0]},
 {id:'frame',label:'Beside the cabinet frame',hint:'Something is tucked beside the photograph on the cabinet.',position:[1.43,.843,-1.73],rotation:[-Math.PI/2,0,-.12]},
 {id:'chair',label:'By the chair cushion',hint:'A folded note rests on the chair cushion.',position:[-.34,.553,-.90],rotation:[-Math.PI/2,0,.18]},
 {id:'desk',label:'On the writing desk',hint:'Look for an envelope at the front left of the writing desk.',position:[-.72,.757,-1.48],rotation:[-Math.PI/2,0,-.15]},
] as const;
export type PlaceId=typeof PLACES[number]['id'];
export interface Discovery {id:string;title:string;text:string;location:PlaceId;appearedAt:number;foundAt?:number;readAt?:number;keptAt?:number;bookId?:string;pageId?:string;story?:string;reward?:string;guestEntryId?:string;author?:string;delivery?:'desk'|'book'}
export interface DiscoveryState {frequency:'quiet'|'occasional'|'off';hints:boolean;guestNotesOnDesk?:boolean;entries:Discovery[];lastFoundAt?:number;lastVisitAt?:number}
export const LETTERS = [
 {id:'ordinary',title:'Ordinary days',text:'There is room for the ordinary days here, too. The cup by the window. A familiar street. Something small that made you smile.'},
 {id:'unhurried',title:'No hurry',text:'A page can wait. A good memory does not become less yours because you take your time finding the words.'},
 {id:'light',title:'A little light',text:'Some days fit in a photograph. Some need a whole page. You may keep either kind here.'},
 {id:'walk-1',story:'The woodland walk',title:'The gate',text:'From an old woodland notebook: At the gate I almost turned back. Then a robin landed on the post, looking as if it had been expecting someone. I followed the path.'},
 {id:'walk-2',story:'The woodland walk',title:'The bend',text:'From an old woodland notebook: Beyond the bend was a fallen tree, soft with moss. I sat there until the rain became a sound instead of an inconvenience. The path could wait.'},
 {id:'walk-3',story:'The woodland walk',title:'The way home',text:'From an old woodland notebook: I brought nothing home from the walk except a damp sleeve and a sentence: I would like to notice more. That seemed enough to keep.'},
 {id:'letter-1',story:'The unfinished letter',title:'Dear friend',text:'A fragment from the room’s old correspondence: Dear friend, I have crossed out three splendid beginnings. Perhaps I should simply tell you that the pear tree has flowered.'},
 {id:'letter-2',story:'The unfinished letter',title:'In the margin',text:'A fragment from the room’s old correspondence: Beside the unfinished letter someone wrote, Tell them the little things. Those are the things that make a place feel near.'},
 {id:'letter-3',story:'The unfinished letter',title:'The envelope',text:'A fragment from the room’s old correspondence: The finished letter was only six lines long. On its envelope: A small piece of here, for wherever you are.'},
 {id:'keeper-1',story:'The old caretaker',title:'A useful drawer',text:'From the old caretaker’s notes: Keep one drawer for things whose purpose you cannot quite explain. A ribbon, a ticket, a button. Understanding can come later.'},
 {id:'keeper-2',story:'The old caretaker',title:'The repaired chair',text:'From the old caretaker’s notes: The chair creaked again. I tightened the joint and left the worn patch alone. Some signs of use are worth preserving.'},
 {id:'keeper-3',story:'The old caretaker',title:'For the next keeper',text:'From the old caretaker’s notes: If this room becomes yours, move things until it feels comfortable. A well-kept room should have room for someone new.'},
];
export const REWARDS:Record<string,{title:string;glyph:string;text:string}>={
 correspondence:{title:'A woodland bookmark',glyph:'keepsake:bookmark',text:'A moss-colored bookmark, tucked away for your first kept letter.'},
 'between-lines':{title:'A pressed yellow flower',glyph:'keepsake:flower',text:'A little yellow flower for noticing what rests between the lines.'},
 'story-kept':{title:'The woodland postmark',glyph:'keepsake:postmark',text:'A woodland postmark for a story you have gathered, one small letter at a time.'},
 'printed-memory':{title:'A brass star stamp',glyph:'keepsake:star',text:'A warm brass star for taking a photograph from the printer to the page.'},
};
export function discoveryState(s:AppState):DiscoveryState{return s.discoveries??{frequency:'occasional',hints:false,entries:[]};}
export function baseline(s:AppState){return {elements:s.books.flatMap(b=>b.pages.flatMap(p=>p.elements.map(e=>e.id))),books:s.books.map(b=>b.id),pins:s.pins.map(p=>p.id),guests:s.guestbook.map(g=>g.id)};}
export function activeDiscovery(s:AppState){return discoveryState(s).entries.find(e=>!e.keptAt);}
/** One persistent object at a time; stable content and placement, no refresh rerolls. */
export function nextDiscovery(s:AppState,now:number,rng= Math.random,visitStartedAt=now):Discovery|null{
 const d=discoveryState(s);if(d.frequency==='off'||!s.progress.completedTour||activeDiscovery(s))return null;
 const gap=d.frequency==='quiet'?24*3600000:4*3600000;
 if(d.lastFoundAt!==undefined&&now-d.lastFoundAt<gap)return null;
 const guest=s.guestbook.find(g=>g.createdAt<visitStartedAt&&!s.achievementBaseline?.guests.includes(g.id)&&!d.entries.some(e=>e.guestEntryId===g.id));
 if(guest){
  if(rng()>=.55)return null;
  const delivery=guest.deskCopy&&d.guestNotesOnDesk!==false?'desk':'book';
  return {id:`guest-${guest.id}`,guestEntryId:guest.id,author:guest.author,title:`A note from ${guest.author}`,text:guest.message,location:delivery==='desk'?'desk':'guestbook',delivery,appearedAt:now};
 }
 const reward=Object.keys(REWARDS).find(id=>s.achievements.includes(id)&&!d.entries.some(e=>e.reward===id));
 const unseen=LETTERS.filter(l=>!d.entries.some(e=>e.id===l.id));
 const chosen=reward?{id:`reward-${reward}`,title:REWARDS[reward].title,text:REWARDS[reward].text}:unseen[Math.min(unseen.length-1,Math.floor(rng()*unseen.length))];
 if(!chosen)return null;
 const previous=d.entries.at(-1)?.location;const places=PLACES.filter(p=>p.id!==previous);
 const location=places[Math.min(places.length-1,Math.floor(rng()*places.length))].id;
 return {...chosen,location,appearedAt:now,...(reward?{reward}: {})};
}
export function discover(s:AppState,id:string,now:number,read=false):AppState{
 const d=discoveryState(s);const entry=d.entries.find(e=>e.id===id);if(!entry)return s;
 return {...s,discoveries:{...d,lastFoundAt:entry.foundAt?d.lastFoundAt:now,entries:d.entries.map(e=>e.id===id?{...e,foundAt:e.foundAt??now,...(read?{readAt:e.readAt??now}:{})}:e)}};
}
export function keepDiscovery(s:AppState,id:string,now:number):AppState{
 const next=discover(s,id,now,true);const d=discoveryState(next);
 return {...next,discoveries:{...d,entries:d.entries.map(e=>e.id===id?{...e,keptAt:e.keptAt??now}:e)}};
}

import type {AppState} from '../types/app';
export const MELLOW_SKIES='https://soundcloud.com/purrplecat/sets/mellow-skies';
export const CRT_COLORS={blue:{background:'#143951',ink:'#b8e6ff'},green:{background:'#183e32',ink:'#c0ffd5'},purple:{background:'#35264f',ink:'#e3caff'},pink:{background:'#64305e',ink:'#ffb8f2'},orange:{background:'#4a3020',ink:'#ffdfb0'},red:{background:'#46252b',ink:'#ffc9cd'},coastal:{background:'#438caf',ink:'#dbf6ff'}} as const;
/** Apply the saved entry preference once when opening a room, not on page/editor navigation. */
export function musicOnEntry(s:AppState):AppState{
 const e=s.environment;const preference=e.entryMusic??'off';
 if(preference==='off')return {...s,environment:{...e,musicOn:false}};
 if(preference==='mellow')return {...s,environment:{...e,musicProvider:'lofi',musicOn:true}};
 const available=preference==='soundcloud'?!!e.soundCloudUrl:!!s.books.find(b=>b.id===s.activeBookId)?.playlistUri;
 return {...s,environment:{...e,musicProvider:preference,musicOn:available}};
}


/** Saturated LED hues paired with the CRT, rather than its pale text ink. */
export const CRT_LIGHT_COLORS={blue:"#268bff",green:"#35ed78",purple:"#a855ff",pink:"#ff59d8",orange:"#ff951f",red:"#ff303e",coastal:"#40ceff"} as const;

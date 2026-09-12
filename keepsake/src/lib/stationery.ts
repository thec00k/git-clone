import {ROOM_STICKER_LABELS} from './roomStickerLabels.ts';
/** Stable identifiers shared by the drawer, editor, saved pages and print output. */
export const PAPER_STYLES={plain:'Warm plain',field:'Woodland margins',tide:'Coastal margins',ruled:'Correspondence lines',dots:'Field notebook dots'} as const;
export type PaperStyle=keyof typeof PAPER_STYLES;
export const KEEPSAKE_PRINTS=[{title:'Woodland field study',src:'/artwork/woodland-fern-v1.png'},{title:'An afternoon by the sea',src:'/artwork/coastal-postcard-v1.png'}];
export const isPaperStyle=(value:unknown):value is PaperStyle=>typeof value==='string'&&Object.hasOwn(PAPER_STYLES,value);
export const ILLUSTRATED_STICKERS={
 ...ROOM_STICKER_LABELS,
 'keepsake:oak-leaf':'Oak leaf', 'keepsake:toadstool':'Woodland mushroom',
 'keepsake:moth':'Evening moth', 'keepsake:teacup':'Quiet cup of tea',
 'keepsake:conch':'Coastal conch', 'keepsake:sailboat':'Little sailboat',
 'keepsake:sea-glass':'Sea-glass pieces', 'keepsake:tidal-postmark':'Ocean postmark',
} as const;
export function stickerLabel(glyph:string){return ILLUSTRATED_STICKERS[glyph as keyof typeof ILLUSTRATED_STICKERS];}

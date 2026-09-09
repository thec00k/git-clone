export const MEMORY_MOODS = {
  neutral: {label:'Room lighting', light:'#ffe6b8'},
  seaside: {label:'Seaside afternoon',light:'#ffd0a2'},
  woodland: {label:'Woodland walk',light:'#d9e6be'},
  winter: {label:'Winter memory',light:'#c9dcf6'},
  evening: {label:'Warm evening',light:'#ffc38f'},
} as const;
export type MemoryMood=keyof typeof MEMORY_MOODS;
export function soundZoneGain(face:string,reading:boolean,enabled:boolean){return !enabled?1:reading?.65:face==='front'?1:.55;}

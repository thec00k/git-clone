/** Shared response rates; cap tab-resume deltas so objects cannot jump through space. */
export const MOTION={furniture:7,drawer:8,light:3,atmosphere:2,printMs:1800} as const;
export function motionFactor(delta:number,response:number,reduced=false){return reduced?1:1-Math.exp(-Math.max(0,Math.min(delta,.05))*response);}

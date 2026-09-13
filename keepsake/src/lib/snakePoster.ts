/** A closed route through every cell keeps the autonomous snake collision-free. */
export const SNAKE_SIZE=12;
export const SNAKE_ROUTE:readonly (readonly [number,number])[]=(()=>{
 const route:[number,number][]=[];
 for(let x=0;x<SNAKE_SIZE;x++)route.push([x,0]);
 for(let x=SNAKE_SIZE-1;x>0;x--)for(let y=1;y<SNAKE_SIZE;y++)route.push([x,x%2?y:SNAKE_SIZE-y]);
 for(let y=SNAKE_SIZE-1;y>0;y--)route.push([0,y]);
 return route;
})();
export type SnakeState={head:number;length:number;food:number;score:number;round:number};
export function createSnake():SnakeState{return {head:9,length:8,food:20,score:0,round:1};}
export function stepSnake(s:SnakeState):SnakeState{
 const n=SNAKE_ROUTE.length,head=(s.head+1)%n;
 if(head!==s.food)return {...s,head};
 const length=s.length+1;
 if(length>=n-1)return {...createSnake(),round:s.round+1};
 return {head,length,score:s.score+1,round:s.round,food:(head+1+(s.score*17+11)%(n-length))%n};
}

export type SnakeCell=readonly [number,number];
export type SnakeDirection='up'|'down'|'left'|'right';
export type PlayerSnake={body:SnakeCell[];direction:SnakeDirection;queued:SnakeDirection;food:SnakeCell;score:number;status:'ready'|'playing'|'lost'|'won'};
const VECTOR:Record<SnakeDirection,SnakeCell>={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const same=(a:SnakeCell,b:SnakeCell)=>a[0]===b[0]&&a[1]===b[1];
export function createPlayerSnake():PlayerSnake{return {body:[[5,6],[4,6],[3,6],[2,6]],direction:'right',queued:'right',food:[8,6],score:0,status:'ready'};}
export function steerPlayerSnake(s:PlayerSnake,direction:SnakeDirection):PlayerSnake{
 if(s.status==='lost'||s.status==='won'||s.queued!==s.direction)return s;
 const a=VECTOR[s.direction],b=VECTOR[direction];if(a[0]+b[0]===0&&a[1]+b[1]===0)return s;
 return {...s,queued:direction,status:'playing'};
}
export function stepPlayerSnake(s:PlayerSnake):PlayerSnake{
 if(s.status!=='playing')return s;
 const [dx,dy]=VECTOR[s.queued],head:SnakeCell=[s.body[0][0]+dx,s.body[0][1]+dy],grows=same(head,s.food);
 const occupied=grows?s.body:s.body.slice(0,-1);
 if(head.some(v=>v<0||v>=SNAKE_SIZE)||occupied.some(p=>same(p,head)))return {...s,status:'lost'};
 const body=[head,...s.body];if(!grows)body.pop();
 const free=SNAKE_ROUTE.filter(p=>!body.some(b=>same(p,b)));
 return {...s,body,direction:s.queued,score:s.score+(grows?1:0),food:grows&&free.length?free[(s.score*29+13)%free.length]:s.food,status:free.length?'playing':'won'};
}

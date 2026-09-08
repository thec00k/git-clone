type Point={x:number;y:number};
/** Inverse perspective mapping: screen quadrilateral -> page percentages. */
export function pointInQuad(point:Point,corners:[Point,Point,Point,Point]):Point|null {
  const [p0,p1,p2,p3]=corners;
  const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x;
  const dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
  const denominator=dx1*dy2-dx2*dy1;
  if(Math.abs(denominator)<1e-8)return null;
  const g=(dx3*dy2-dx2*dy3)/denominator,h=(dx1*dy3-dx3*dy1)/denominator;
  const a=p1.x-p0.x+g*p1.x,b=p3.x-p0.x+h*p3.x;
  const d=p1.y-p0.y+g*p1.y,e=p3.y-p0.y+h*p3.y;
  const A=a-point.x*g,B=b-point.x*h,D=d-point.y*g,E=e-point.y*h;
  const determinant=A*E-B*D;
  if(Math.abs(determinant)<1e-8)return null;
  const x=point.x-p0.x,y=point.y-p0.y;
  return {x:(x*E-B*y)/determinant*100,y:(A*y-x*D)/determinant*100};
}
export function pagePoint(node:HTMLElement,x:number,y:number):Point {
  const page=(node.closest('.ks-page')??node) as HTMLElement;
  const probes=Array.from(page.querySelectorAll<HTMLElement>(':scope > [data-page-corner]'));
  if(probes.length===4){
    const corners=probes.map(probe=>{const r=probe.getBoundingClientRect();return{x:r.x,y:r.y};}) as [Point,Point,Point,Point];
    const point=pointInQuad({x,y},corners);if(point)return point;
  }
  const r=page.getBoundingClientRect();return{x:(x-r.left)/r.width*100,y:(y-r.top)/r.height*100};
}
export function pagePixelPoint(node:HTMLElement,x:number,y:number):Point {
  const page=(node.closest('.ks-page')??node) as HTMLElement;
  const p=pagePoint(page,x,y);return{x:p.x/100*page.offsetWidth,y:p.y/100*page.offsetHeight};
}

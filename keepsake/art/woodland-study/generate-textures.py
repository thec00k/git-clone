"""Deterministic, seamless material maps; no third-party artwork."""
from pathlib import Path
import numpy as np
from PIL import Image
OUT=Path(__file__).with_name('textures');OUT.mkdir(exist_ok=True)
def save(name,color,height,rough,strength):
    Image.fromarray(np.uint8(np.clip(color,0,255))).save(OUT/(name+'-color.png'))
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))*strength
    dy=(np.roll(height,-1,0)-np.roll(height,1,0))*strength
    n=np.stack((-dx,dy,np.ones_like(dx)),axis=-1);n/=np.linalg.norm(n,axis=-1)[...,None]
    Image.fromarray(np.uint8(np.clip((n*.5+.5)*255,0,255))).save(OUT/(name+'-normal.png'))
    # ORM: unused occlusion and metallic fixed; roughness in green for glTF.
    orm=np.stack((np.ones_like(height)*255,np.clip(rough,0,1)*255,np.zeros_like(height)),axis=-1)
    Image.fromarray(np.uint8(orm)).save(OUT/(name+'-orm.png'))
def field(n,seed):
    rng=np.random.default_rng(seed);y,x=np.mgrid[:n,:n]/n;v=np.zeros((n,n))
    for freq,amp in [(1,.5),(3,.22),(9,.1),(27,.04),(81,.012)]:
        for j in range(4):
            a,b=rng.integers(-freq,freq+1,2);v+=amp*np.sin(2*np.pi*(a*x+b*y)+rng.uniform(0,6.28))/4
    return v
n=1024;y,x=np.mgrid[:n,:n]/n;t=2*np.pi
warp=y+.013*np.sin(t*x)+.007*np.sin(t*(2*x+y))+.004*np.sin(t*(3*x-2*y))
grain=np.sin(t*(warp*90+.8*np.sin(t*warp*7)))
fine=np.sin(t*(warp*270+.35*np.sin(t*x*4)))
broad=field(n,8)
wood=4.5*grain+1.5*fine+14*broad+2*np.sin(t*warp*17)
# Restrained staggered board seams, continuous at tile boundaries.
v=(y*4)%1;edge=np.exp(-(np.minimum(v,1-v)/.010)**2)
row=np.floor(y*4);u=(x+row*.25)%1;end=np.exp(-(np.minimum(u,1-u)/.0015)**2)
seam=np.maximum(edge,end*.7)
for name,base,boards in [('oak',[153,113,77],False),('floor',[139,103,70],True),('timber',[177,155,125],True)]:
    variation=wood*(.62 if name=='timber' else 1)
    if boards:variation=variation-24*seam+3*np.sin(row*2.3)
    color=np.array(base)+variation[...,None]*np.array([1,.88,.72])
    height=wood/80-(seam*.28 if boards else 0)
    save(name,color,height,.66+broad*.1, .85)
n=512;y,x=np.mgrid[:n,:n]/n;t=2*np.pi
noise=field(n,29);weave=(np.cos(t*x*128)+np.cos(t*y*128))*.5
fiber=weave*3+noise*8
save('linen',np.full((n,n,3),236)+fiber[...,None],fiber/18,np.full((n,n),.94),.16)
noise=field(n,46);speck=np.sin(t*(x*91+y*73))*np.sin(t*(y*89-x*65))
stone=noise*32+speck*2
save('stone',np.array([138,137,126])+stone[...,None],stone/70,.91+noise*.06,.6)
print('Saved 15 seamless PBR maps to',OUT)

# Bake color variants so Blender and glTF render the same tint without custom nodes.
for tile,tints in [('oak',['b7a18d']),('linen',['718466','e4d3b5','fff4da','b37d61','62715b'])]:
    base=np.asarray(Image.open(OUT/(tile+'-color.png')),dtype=float)/255
    for tint in tints:
        rgb=np.array([int(tint[i:i+2],16)/255 for i in (0,2,4)])
        Image.fromarray(np.uint8(np.clip(base*rgb*255,0,255))).save(OUT/(tile+'-'+tint+'-color.png'))

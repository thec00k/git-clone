"""Original coastal illustrations, rendered with deterministic paper grain."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math, random
ROOT=Path(__file__).resolve().parent
random.seed(108)
W,H=768,960
def paper():
    im=Image.new('RGB',(W,H),(237,230,211));p=im.load()
    for y in range(H):
        for x in range(W):
            n=random.randrange(-5,6);p[x,y]=(237+n,230+n,211+n)
    return im
def caption(d,title,sub):
    font=ImageFont.truetype('C:/Windows/Fonts/georgia.ttf',28)
    small=ImageFont.truetype('C:/Windows/Fonts/georgia.ttf',15)
    d.line((100,815,668,815),fill='#a29173',width=2)
    d.text((W/2,849),title,font=font,anchor='mm',fill='#37545a')
    d.text((W/2,884),sub,font=small,anchor='mm',fill='#7d806e')
im=paper();d=ImageDraw.Draw(im)
# A branching fan coral study; each branch tapers and has organically offset tips.
def branch(x,y,angle,length,width,depth):
    steps=12;points=[]
    for i in range(steps+1):
        t=i/steps;points.append((x+math.cos(angle)*length*t+math.sin(t*math.pi)*length*.09,y+math.sin(angle)*length*t))
    for i in range(steps):d.line([points[i],points[i+1]],fill=('#af6850' if depth>1 else '#c78061'),width=max(2,int(width*(1-i/steps*.45))))
    if depth:
        ex,ey=points[-1]
        for spread in [-.52,.18,.57]:branch(ex,ey,angle+spread+random.uniform(-.13,.13),length*random.uniform(.55,.69),width*.57,depth-1)
    else:
        ex,ey=points[-1];d.ellipse((ex-3,ey-3,ex+3,ey+3),fill='#d19772')
for a,l in [(-2.2,157),(-1.8,167),(-1.4,165),(-.96,150)]:branch(385,742,a,l,15,4)
d.ellipse((286,736,488,766),fill='#b8ac8b')
caption(d,'SEA FAN','a small study of the reef');im.save(ROOT/'coral-study.png')
im=paper();d=ImageDraw.Draw(im)
d.rounded_rectangle((68,82,700,769),radius=210,fill='#b7cbd0')
d.ellipse((496,153,576,233),fill='#f4dcad')
for i in range(12):
    y=485+i*24;d.rectangle((68,y,700,min(768,y+25)),fill=(68+i*2,119+i*2,130+i*2))
for i in range(110):
    x=random.randint(80,670);y=random.randint(513,753)
    d.line((x,y,min(690,x+random.randint(8,54)),y-2),fill='#b5cbd0',width=random.choice([1,2,3]))
d.polygon([(219,546),(551,546),(504,590),(270,590)],fill='#74513d')
d.line((231,548,542,548),fill='#e0c79a',width=7)
d.line((377,259,377,548),fill='#665a45',width=6)
d.polygon([(365,279),(365,529),(198,521)],fill='#f3ecda')
d.polygon([(389,307),(534,521),(390,529)],fill='#e1d3b6')
d.line((365,281,204,521),fill='#b7b19c',width=2)
d.line((390,309,532,521),fill='#b7b19c',width=2)
d.line((377,265,551,546),fill='#7a7c6c',width=2)
caption(d,'HOMEWARD','an evening under sail');im.save(ROOT/'boat-study.png')
print('Original coral and sailboat illustrations saved.')

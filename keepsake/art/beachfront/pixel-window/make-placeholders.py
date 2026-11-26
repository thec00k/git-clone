"""Placeholder pixel layers for the Beachfront parallax window prototype.

Stand-ins only, to prove sizes and motion until Ramenya's art arrives. Every colour
comes from beach-palette.hex. Writes the runtime PNGs (480x400, native pixels) to
public/room/beachfront/window/ and a registration template to this folder.
Run: python3 art/beachfront/pixel-window/make-placeholders.py   (from keepsake/)
"""
import math, os
from PIL import Image, ImageDraw

W, H = 480, 400                      # whole canvas, native art pixels
SAFE = (80, 43, 400, 357)            # the window opening as seen from the main view (left, top, right, bottom)
ARCH_CX, ARCH_SPRING, ARCH_R = 240, 203, 160
HORIZON = 286
OUT = 'public/room/beachfront/window'
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
CLEAR = (0, 0, 0, 0)

def gradient(img, y0, y1, stops):
    """Ordered-dither between neighbouring palette colours, banded like pixel art."""
    px = img.load()
    for y in range(y0, y1):
        f = (y - y0) / max(1, y1 - y0 - 1) * (len(stops) - 1)
        i = min(int(f), len(stops) - 2); t = f - i
        for x in range(W):
            px[x, y] = rgb(stops[i + 1] if t * 16 > BAYER[y % 4][x % 4] + 0.5 else stops[i])

PHASES = {
    'day': dict(sky=['618da8', '85a5b8', 'b5d7de', 'c8dedc'], sun='fff0ce', sun_xy=(330, 120), sun_r=14,
                cloud=('f1f1e7', 'cacec0'), far='467289', far_hi='588a94', island='668375', near=['588a94', '618da8'],
                foam='f1f1e7', glint='c8dedc', sand=('dfd3bd', 'cfc0a1', 'b7aa8c'), rock=('736d5a', '474438'), grass='668375'),
    'dusk': dict(sky=['355783', '736794', '9978a0', 'd09e84', 'efa879', 'ffb070'], sun='ffe1b5', sun_xy=(300, 262), sun_r=18,
                 cloud=('efa879', 'd09e84'), far='736794', far_hi='9978a0', island='563b25', near=['736794', '467289'],
                 foam='efa879', glint='ffb070', sand=('d09e84', 'bf9d76', '9978a0'), rock=('563b25', '352a1c'), grass='55645c'),
    'night': dict(sky=['3c3f39', '355783', '467289'], sun='ecece2', sun_xy=(170, 110), sun_r=10,
                  cloud=('697870', '55645c'), far='355783', far_hi='467289', island='3c3f39', near=['355783', '3c3f39'],
                  foam='85a5b8', glint='c8dedc', sand=('6f6a58', '736d5a', '474438'), rock=('3c3f39', '352a1c'), grass='474438'),
}

def sky(p, name):
    img = Image.new('RGBA', (W, H)); gradient(img, 0, H, p['sky'])
    d = ImageDraw.Draw(img)
    if name == 'night':
        for i in range(70):
            x, y = (i * 137 + 43) % W, 8 + (i * 71) % (HORIZON - 30)
            d.point((x, y), fill=rgb('f0ebdd' if i % 3 else 'b5d7de'))
    x, y = p['sun_xy']; r = p['sun_r']
    d.ellipse((x - r, y - r, x + r, y + r), fill=rgb(p['sun']))
    if name == 'night':  # crescent: bite out of the moon with the sky colour
        d.ellipse((x - r + 5, y - r - 3, x + r + 5, y + r - 3), fill=img.getpixel((x + r + 8, y)))
    return img

def blob(d, cx, cy, w, h, fill, shade):
    for k, (dx, dy, rx, ry) in enumerate([(0, 0, w, h), (-w // 2, 3, w // 2, h - 2), (w // 2, 2, w // 2 + 4, h - 3), (-w // 5, -h // 2, w // 2, h // 2 + 2)]):
        d.ellipse((cx + dx - rx, cy + dy - ry, cx + dx + rx, cy + dy + ry), fill=rgb(fill))
    d.rectangle((cx - w - 6, cy + h - 3, cx + w + 6, cy + h - 1), fill=rgb(shade))

def clouds(p):
    img = Image.new('RGBA', (W, H), CLEAR); d = ImageDraw.Draw(img)
    for cx, cy, w, h in [(130, 95, 34, 9), (290, 70, 44, 10), (395, 150, 30, 8), (60, 190, 26, 6)]:
        blob(d, cx, cy, w, h, *p['cloud'])
    return img

def far_sea(p):
    img = Image.new('RGBA', (W, H), CLEAR); d = ImageDraw.Draw(img)
    d.rectangle((0, HORIZON, W, H), fill=rgb(p['far']))
    for y in range(HORIZON + 4, H, 6):
        for x in range((y * 7) % 23, W, 23): d.line((x, y, x + 6, y), fill=rgb(p['far_hi']))
    # A low island on the horizon and a little sailboat, the room's own motifs.
    d.polygon([(20, HORIZON), (48, HORIZON - 10), (72, HORIZON - 14), (100, HORIZON - 8), (128, HORIZON)], fill=rgb(p['island']))
    d.polygon([(352, HORIZON - 2), (352, HORIZON - 22), (366, HORIZON - 2)], fill=rgb(p['foam']))
    d.rectangle((344, HORIZON - 2, 370, HORIZON), fill=rgb(p['rock'][0]))
    return img

def near_water(p, frame):
    """Four-frame loop: wave crests step sideways by a quarter of their spacing each frame."""
    img = Image.new('RGBA', (W, H), CLEAR); d = ImageDraw.Draw(img)
    top = HORIZON + 22
    gradient_img = Image.new('RGBA', (W, H)); gradient(gradient_img, top, H, p['near'])
    img.paste(gradient_img.crop((0, top, W, H)), (0, top))
    sx, sy = p['sun_xy']
    for row, y in enumerate(range(top + 4, H - 20, 7)):
        gap = 18 + row * 4; off = (frame * gap // 4 + row * 11) % gap
        for x in range(-gap + off, W, gap): d.line((x, y, x + 4 + row, y), fill=rgb(p['foam']))
        for x in range(sx - 14 - row * 3 + (frame + row) % 3 * 2, sx + 14 + row * 3, 5):  # sun or moon path
            d.point((x, y + 2), fill=rgb(p['glint']))
    return img

def foreground(p):
    img = Image.new('RGBA', (W, H), CLEAR); d = ImageDraw.Draw(img)
    sand, mid, dark = (rgb(c) for c in p['sand'])
    # A sandy bank in the lower corners; the middle stays open for the sea view.
    d.polygon([(0, 322), (60, 330), (130, 352), (170, 372), (190, H), (0, H)], fill=sand)
    d.polygon([(W, 316), (420, 326), (350, 350), (300, 376), (280, H), (W, H)], fill=sand)
    for x in range(0, 190, 9): d.point((x, 360 + (x * 7) % 30), fill=mid)
    for x in range(290, W, 9): d.point((x, 356 + (x * 5) % 36), fill=mid)
    d.polygon([(26, 340), (44, 316), (78, 310), (98, 330), (92, 350), (40, 352)], fill=rgb(p['rock'][0]))
    d.polygon([(44, 316), (78, 310), (98, 330), (70, 322)], fill=mid)
    d.line((40, 352, 92, 350), fill=rgb(p['rock'][1]))
    for i, x in enumerate(range(400, 470, 6)):  # dune grass
        h = 18 + (i * 7) % 14; d.line((x, 330, x + (i % 3) - 1, 330 - h), fill=rgb(p['grass']))
    d.line((130, 352, 190, 400), fill=dark); d.line((350, 350, 280, 400), fill=dark)
    return img

def template():
    img = Image.new('RGBA', (W, H), rgb('f0ebdd')); d = ImageDraw.Draw(img)
    d.pieslice((ARCH_CX - ARCH_R, ARCH_SPRING - ARCH_R, ARCH_CX + ARCH_R, ARCH_SPRING + ARCH_R), 180, 360, fill=rgb('b5d7de'))
    d.rectangle((ARCH_CX - ARCH_R, ARCH_SPRING, ARCH_CX + ARCH_R, SAFE[3]), fill=rgb('b5d7de'))
    d.line((0, HORIZON, W, HORIZON), fill=rgb('467289'))
    d.rectangle(SAFE, outline=rgb('dc863d'))
    return img

os.makedirs(OUT, exist_ok=True)
for name, p in PHASES.items():
    layers = {'00_sky': sky(p, name), '01_clouds': clouds(p), '02_far-sea': far_sea(p), '04_foreground': foreground(p)}
    for key, img in layers.items(): img.save(f'{OUT}/beach_{name}_{key}.png', optimize=True)
    for f in range(4): near_water(p, f).save(f'{OUT}/beach_{name}_03_near-water_f{f + 1:02d}.png', optimize=True)
here = os.path.dirname(os.path.abspath(__file__))
template().save(os.path.join(here, 'window-template-480x400.png'))
print('placeholders written to', OUT)

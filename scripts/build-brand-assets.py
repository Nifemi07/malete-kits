#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# MALÈTE KITS — build the full brand asset pack from the uploaded brand board.
#
# Produces:
#   public/mk-icon.png           512x512  navy rounded square, white MK (transparent corners)
#   public/apple-touch-icon.png  180x180  full-bleed navy square, white MK (iOS masks it)
#   public/favicon.ico           16/32/48 legacy favicon
#   public/images/og-cover.png   1200x630 WhatsApp/social link preview
#   public/logo-mk.svg           refreshed SVG fallback (new navy/blue brand)
#
# Source: /home/z/my-project/upload/1321a0b8-277e-42b7-bd72-f2100e250feb.png
# Palette (from the board): Pitch Navy #0A192F · Royal Blue #2563EB · Sky Blue
# #3B82F6 · Cloud White #F5F7FA · Ink Black #0B0B0D
# ---------------------------------------------------------------------------
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
import os

SRC = '/home/z/my-project/upload/1321a0b8-277e-42b7-bd72-f2100e250feb.png'
PUB = '/home/z/my-project/public'
NAVY = (10, 25, 47)        # 0A192F
ROYAL = (37, 99, 235)      # 2563EB
SKY = (59, 130, 246)       # 3B82F6
CLOUD = (245, 247, 250)    # F5F7FA

src = Image.open(SRC).convert('RGB')
print('board:', src.size)

# ---------------------------------------------------------------------------
# 1. Extract the high-res MK glyph from the "SYMBOL / APP ICON" tile
#    (navy glyph on cloud-white tile) -> white alpha mask.
# ---------------------------------------------------------------------------
# Tile spans roughly x 93..512, y 748..1198 on the 2400x1694 board; crop the
# interior generously, then auto-trim to the glyph bounding box.
sym = src.crop((100, 755, 505, 1190))
w, h = sym.size
px = sym.load()

# alpha = how "navy" a pixel is (0..255); glyph pixels -> opaque
mask = Image.new('L', (w, h), 0)
mp = mask.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        # distance from navy vs distance from white
        d_navy = abs(r - NAVY[0]) + abs(g - NAVY[1]) + abs(b - NAVY[2])
        d_white = abs(r - 255) + abs(g - 255) + abs(b - 255)
        if d_navy < d_white:
            # closeness to pure navy -> alpha (anti-aliased edges partial)
            a = max(0, 255 - int(d_navy / 3 * 2.2))
            mp[x, y] = min(255, a)
bbox = mask.getbbox()
mask = mask.crop(bbox)

# Drop any caption text below the glyph: find the widest run of empty rows
# in the lower half and cut everything below it.
import numpy as np
arr = np.asarray(mask)
row_ink = (arr > 20).sum(axis=1)
h_mask = len(row_ink)
lower = row_ink[h_mask // 3:]  # scan from upper third down
empty = row_ink == 0
best_start, best_len, cur_start, cur_len = -1, 0, -1, 0
for i, v in enumerate(empty):
    if v:
        if cur_start < 0:
            cur_start = i
        cur_len += 1
        if cur_len > best_len:
            best_len, best_start = cur_len, cur_start
    else:
        cur_start, cur_len = -1, 0
if best_start > h_mask // 3 and best_len >= 8:
    mask = mask.crop((0, 0, mask.width, best_start))
print('MK glyph mask (after caption trim):', mask.size)

# ---------------------------------------------------------------------------
# 2. mk-icon.png — 512x512 rounded square (transparent corners)
# ---------------------------------------------------------------------------
def rounded_icon(size, corner_pct=0.225, glyph_frac=0.60):
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    r = int(size * corner_pct)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=NAVY + (255,))
    g = mask.copy()
    # scale glyph to glyph_frac of icon width, keep aspect
    target_w = int(size * glyph_frac)
    scale = target_w / g.width
    g = g.resize((target_w, int(g.height * scale)), Image.LANCZOS)
    white = Image.new('RGBA', g.size, (255, 255, 255, 255))
    canvas.paste(white, ((size - g.width) // 2, (size - g.height) // 2), g)
    return canvas

icon512 = rounded_icon(512)
icon512.save(f'{PUB}/mk-icon.png')
print('mk-icon.png:', icon512.size)

# ---------------------------------------------------------------------------
# 3. apple-touch-icon.png — 180x180 FULL-BLEED (no rounded corners, opaque)
# ---------------------------------------------------------------------------
apple = Image.new('RGB', (180, 180), NAVY)
g = mask.copy()
target_w = int(180 * 0.56)  # keep inside iOS safe zone
g = g.resize((target_w, int(g.height * target_w / g.width)), Image.LANCZOS)
white = Image.new('RGBA', g.size, (255, 255, 255, 255))
apple.paste(white, ((180 - g.width) // 2, (180 - g.height) // 2), g)
apple.save(f'{PUB}/apple-touch-icon.png')
print('apple-touch-icon.png:', apple.size)

# ---------------------------------------------------------------------------
# 4. favicon.ico — 16/32/48 from the rounded icon
# ---------------------------------------------------------------------------
icon512.save(f'{PUB}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
print('favicon.ico written')

# ---------------------------------------------------------------------------
# 5. og-cover.png — 1200x630 social/WhatsApp preview
# ---------------------------------------------------------------------------
def woff2_to_ttf(src_woff2, out_ttf):
    if os.path.exists(out_ttf):
        return out_ttf
    f = TTFont(src_woff2)
    f.flavor = None
    f.save(out_ttf)
    return out_ttf

FDIR = '/home/z/my-project/scripts/_fonts'
os.makedirs(FDIR, exist_ok=True)
a800 = woff2_to_ttf(f'{PUB}/fonts/archivo-800.woff2', f'{FDIR}/archivo-800.ttf')
a600 = woff2_to_ttf(f'{PUB}/fonts/archivo-600.woff2', f'{FDIR}/archivo-600.ttf')

W, H = 1200, 630
og = Image.new('RGB', (W, H), NAVY)
d = ImageDraw.Draw(og)

# subtle side accents: two royal-blue bars top/bottom (brand frame)
d.rectangle([0, 0, W, 6], fill=ROYAL)
d.rectangle([0, H - 6, W, H], fill=ROYAL)

# wordmark (existing transparent extraction) centered
logo = Image.open(f'{PUB}/logo-mk.png').convert('RGBA')
lw = 660
logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
og.paste(logo, ((W - lw) // 2, 170), logo)

def tracked(draw, xy, text, font, fill, tracking=6, anchor_center=True):
    """Draw text with letter tracking; optionally center on x."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = xy[0] - total / 2 if anchor_center else xy[0]
    y = xy[1]
    for ch, cw in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += cw + tracking
    return total

# rule under wordmark
d.rectangle([(W - 220) // 2, 372, (W + 220) // 2, 378], fill=ROYAL)

# tagline
f_tag = ImageFont.truetype(a800, 40)
tracked(d, (W / 2, 412), 'PREMIUM FOOTBALL JERSEYS', f_tag, (255, 255, 255, 255), tracking=10)

f_sub = ImageFont.truetype(a600, 27)
tracked(d, (W / 2, 480), 'MALETE · KWARA STATE · NIGERIA', f_sub, SKY, tracking=6)

f_foot = ImageFont.truetype(a600, 22)
foot = 'Order online — pay on confirmation · Pickup or delivery around KWASU'
fw = d.textlength(foot, font=f_foot)
d.text(((W - fw) / 2, 548), foot, font=f_foot, fill=(245, 247, 250, 230))

og.save(f'{PUB}/images/og-cover.png')
print('og-cover.png:', og.size)

# ---------------------------------------------------------------------------
# 6. logo-mk.svg — refreshed fallback (stale deployments point here)
# ---------------------------------------------------------------------------
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0A192F"/>
  <g stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="square" fill="none">
    <path d="M11 47 V17 L22.5 36 L34 17 V47"/>
    <path d="M53 17 V47 M53 31.5 L41 17 M46.5 26 L53 31.5 L41 47"/>
  </g>
</svg>
'''
with open(f'{PUB}/logo-mk.svg', 'w') as fh:
    fh.write(svg)
print('logo-mk.svg written')
print('ALL DONE')

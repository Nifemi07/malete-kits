#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# MALÈTE KITS — extract brand logos from the uploaded brand board PNG.
#  - public/logo-mk.png : primary wordmark (dark surfaces) → transparent bg
#  - public/mk-icon.png : app icon (navy rounded square, white MK) → transparent corners
# Method: crop regions from the board, flood-fill the background from the
# edges to transparent (enclosed letters survive), auto-trim, save.
# ---------------------------------------------------------------------------
from PIL import Image, ImageDraw

SRC = '/home/z/my-project/upload/1321a0b8-277e-42b7-bd72-f2100e250feb.png'
OUT_LOGO = '/home/z/my-project/public/logo-mk.png'
OUT_ICON = '/home/z/my-project/public/mk-icon.png'

src = Image.open(SRC).convert('RGB')
print('board:', src.size)

def cut_transparent(box, thresh, pad=14):
    """Crop, flood-fill bg from edge seeds to transparent, trim, pad."""
    im = src.crop(box)
    w, h = im.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    marker = (255, 0, 255)  # magenta sentinel
    for s in seeds:
        try:
            ImageDraw.floodfill(im, s, marker, thresh=thresh)
        except Exception:
            pass
    rgba = im.convert('RGBA')
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r == 255 and g == 0 and b == 255:
                px[x, y] = (0, 0, 0, 0)
    bbox = rgba.split()[3].getbbox()
    if bbox:
        l, t, r, b = bbox
        l, t = max(0, l - pad), max(0, t - pad)
        r, b = min(w, r + pad), min(h, b + pad)
        rgba = rgba.crop((l, t, r, b))
    return rgba

# --- primary wordmark, dark surfaces variant (panel inside the board) -------
logo = cut_transparent((1420, 350, 2190, 540), thresh=50)
logo.save(OUT_LOGO)
print('logo-mk.png:', logo.size)

# --- app icon (navy rounded square on cloud-white tile) ---------------------
icon = cut_transparent((650, 868, 865, 1080), thresh=35)
icon.save(OUT_ICON)
print('mk-icon.png:', icon.size)
print('done')

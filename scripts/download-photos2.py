"""Download the captured product images (JetPack CDN) for the new catalog.

Saves to public/images/products/<slug>.jpg, verifies each file is a real,
non-blank image, and prints a slug->file manifest for the seed merge.
"""
import json
import os
import subprocess

EXT = "/home/z/my-project/scripts/catalog-extension.json"
OUTDIR = "/home/z/my-project/public/images/products"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

ext = json.load(open(EXT))
manifest = {}
for o in ext:
    url = o.get("img_remote")
    if not url:
        continue
    dest = f"{OUTDIR}/{o['slug']}.jpg"
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        manifest[o["slug"]] = dest
        continue
    cmd = ["curl", "-s", "-o", dest, "-w", "%{http_code} %{size_download}",
           "-A", UA, "--max-time", "30", url]
    r = subprocess.run(cmd, capture_output=True, text=True).stdout
    ok = False
    try:
        from PIL import Image
        im = Image.open(dest)
        im.verify()
        from PIL import Image as I2
        im = I2.open(dest).convert("L")
        h = im.histogram()
        nonwhite = 1 - h[255] / sum(h)
        ok = os.path.getsize(dest) > 10000 and nonwhite > 0.02
        if ok:
            manifest[o["slug"]] = dest
    except Exception as e:
        ok = False
    print(f"{r:>16} ok={ok} {o['slug'][:50]}")

with open("/home/z/my-project/scripts/photo-manifest.json", "w") as f:
    json.dump(manifest, f, indent=1)
print(f"\n{len(manifest)} photos downloaded")

"""Verify the expanded catalog end-to-end: API prices vs curated extension,
image availability, and storefront screenshots (shop + a new product page).
"""
import json
import re
import subprocess
import urllib.request

BASE = "http://localhost:3000"
EXT = "/home/z/my-project/scripts/catalog-extension.json"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return json.load(r)


ext = {o["slug"]: o for o in json.load(open(EXT))}
api = get("/api/products")
items = api["products"] if isinstance(api, dict) and "products" in api else api
print(f"API /api/products -> {len(items)} active products")

fails = []
by_slug = {p["slug"]: p for p in items}
for slug, o in ext.items():
    p = by_slug.get(slug)
    if not p:
        fails.append(f"missing from API: {slug}")
        continue
    if int(p["basePrice"]) != o["price"]:
        fails.append(f"price mismatch {slug}: API {p['basePrice']} != curated {o['price']}")
    if o["slug"] in {s for s in json.load(open('/home/z/my-project/scripts/photo-manifest.json'))}:
        img = p.get("imageUrl") or ""
        if not img.endswith(f"{slug}.jpg"):
            fails.append(f"photo not wired {slug}: {img}")

new_in_api = [s for s in by_slug if s in ext]
print(f"new products live: {len(new_in_api)}/100")
print(f"price/photo checks: {'ALL PASS' if not fails else f'{len(fails)} FAIL'}")
for f in fails[:10]:
    print("  FAIL:", f)

# image endpoints
for f in json.load(open('/home/z/my-project/scripts/photo-manifest.json')).values():
    web = f.replace('/home/z/my-project/public', '')
    code = urllib.request.urlopen(BASE + web, timeout=15).status
    if code != 200:
        print("  IMAGE FAIL:", web, code)

# a spot-check block for the report
for slug in ("juventus-2026-27-home-jersey", "chelsea-home-2025-26-authentic-jersey",
             "real-madrid-2026-27-home-player-grade-jersey", "germany-away-1994-retro-jersey"):
    p = by_slug.get(slug)
    if p:
        print(f"  ₦{p['basePrice']:>7}  {p['name'][:60]}")

# screenshots
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={"width": 900, "height": 1400})
    pg.goto(BASE + "/#/shop", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(1500)
    pg.screenshot(path="/tmp/shop-new.png")
    slug = "juventus-2026-27-home-jersey"
    pg.goto(BASE + f"/#/product/{slug}", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(1200)
    pg.screenshot(path="/tmp/product-new.png")
    b.close()
print("screenshots saved")

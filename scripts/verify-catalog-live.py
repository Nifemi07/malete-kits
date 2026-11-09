"""Verify the live catalog: 29 active products, correct prices, images on disk."""
import json
import os
import urllib.request

CATALOG = {  # slug -> (expected price, expected image or None)
    "real-madrid-home-26-27": 24999, "real-madrid-away-26-27": 24999,
    "barcelona-home-26-27": 24950, "arsenal-home-26-27": 28999,
    "arsenal-away-26-27": 24999, "arsenal-jvc-retro-1990": 28999,
    "arsenal-authentic-home-25-26": 32999, "arsenal-authentic-away-25-26": 32999,
    "chelsea-home-26-27": 24999, "chelsea-away-26-27": 24999,
    "liverpool-home-26-27": 28999, "liverpool-away-26-27": 24999,
    "liverpool-third-26-27": 24999, "man-city-home-26-27": 30999,
    "man-city-away-26-27": 28950, "man-city-third-26-27": 24999,
    "man-utd-home-26-27": 24999, "man-utd-retro-02-03": 28950,
    "tottenham-home-25-26": 28999, "ac-milan-home-26-27": 24999,
    "inter-home-26-27": 24999, "bayern-home-26-27": 24999,
    "dortmund-home-26-27": 24999, "psg-home-26-27": 24999,
    "nigeria-stadium-home-26-27": 26999, "argentina-messi-26-27": 28999,
    "brazil-retro-2024": 28999, "england-home-26-27": 24999,
    "england-away-26-27": 24999,
}

prods = json.load(urllib.request.urlopen("http://localhost:3000/api/products"))
if isinstance(prods, dict):
    prods = prods.get("products") or prods.get("items")
print(f"active products: {len(prods)} (expected {len(CATALOG)})")

fails = 0
seen = set()
for p in prods:
    slug, price, img = p["slug"], p["basePrice"], p.get("imageUrl")
    seen.add(slug)
    want = CATALOG.get(slug)
    mark = "OK "
    if want is None:
        mark, fails = "EXTRA", fails + 1
    elif price != want:
        mark, fails = f"PRICE({want})", fails + 1
    if img and not os.path.exists("/home/z/my-project/public" + img):
        mark, fails = "IMG-MISSING", fails + 1
    if mark != "OK ":
        print(f"  {mark:12} {slug} ₦{price:,} img={img}")
    nvar = len(p.get("variants") or [])
    if nvar != 6:
        print(f"  VARIANTS({nvar})  {slug}")
        fails += 1
missing = set(CATALOG) - seen
if missing:
    fails += len(missing)
    print("  MISSING:", ", ".join(sorted(missing)))
print("ALL CHECKS PASSED" if fails == 0 else f"{fails} FAILURES")

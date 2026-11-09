"""Mine every captured mysportskit JSON for unique product candidates.

Sources:
  scripts/mysportskit-product-pages.json  — BFS-crawled product detail pages
  scripts/tiles-men-jerseys.json          — category tiles
  scripts/mysportskit-products.json       — old tile harvest
  scripts/search-harvest.json             — Google-snippet harvest (last turn)

For each unique /product/ URL keep: name, price_lo/hi, img, cats, source list.
Jersey-only filter: name must contain jersey/kit/shirt/retro (case-insens)
and NOT contain shoe/boot/bag/legging/short/t-shirt/tee/cap/ball/sock/jacket/hoodie.
"""
import json
import re

S = "/home/z/my-project/scripts"

JERSEY_RE = re.compile(r"jersey|kit|shirt|retro", re.I)
NON_JERSEY_RE = re.compile(r"shoe|boot|bag|legging|short\b|t-shirt|tee\b|cap\b|ball\b|sock|jacket|hoodie|sandal|slipper|glove|scarf|backpack|track", re.I)


def parse_price(text):
    if not text:
        return None, None
    nums = []
    for chunk in text.replace(",", "").split():
        chunk = chunk.strip("₦–—-")
        if chunk.isascii() and chunk.isdigit():
            nums.append(int(chunk))
    if not nums:
        return None, None
    return min(nums), max(nums)


def add(cands, url, name, price_lo, price_hi, img, cats, src):
    if not url or "/product/" not in url:
        return
    url = url.split("?")[0]
    if not name:
        return
    c = cands.setdefault(url, {"url": url, "name": name, "price_lo": None, "price_hi": None,
                               "img": None, "cats": [], "src": []})
    if name and len(name) > len(c["name"]):
        c["name"] = name
    for k, v in (("price_lo", price_lo), ("price_hi", price_hi)):
        if v is not None and (c[k] is None or (k == "price_lo" and v < c[k]) or (k == "price_hi" and v > c[k])):
            c[k] = v
    if img and not c["img"]:
        c["img"] = img
    for cat in cats or []:
        if cat not in c["cats"]:
            c["cats"].append(cat)
    if src not in c["src"]:
        c["src"].append(src)


cands = {}

try:
    pages = json.load(open(f"{S}/mysportskit-product-pages.json"))
    for p in pages:
        add(cands, p["url"], p.get("name"), p.get("price_lo"), p.get("price_hi"), p.get("img"), p.get("cats"), "pages")
        for r in p.get("related") or []:
            lo, hi = parse_price(r.get("price_text") or "")
            add(cands, r.get("url"), r.get("name"), lo, hi, None, [], "related")
except FileNotFoundError:
    print("no product-pages.json")

for fname, src in (("tiles-men-jerseys.json", "tiles"), ("mysportskit-products.json", "oldtiles")):
    try:
        for t in json.load(open(f"{S}/{fname}")):
            add(cands, t.get("url"), t.get("name"), t.get("price_lo"), t.get("price_hi"), t.get("img"), [], src)
    except FileNotFoundError:
        print(f"no {fname}")

try:
    harvest = json.load(open(f"{S}/search-harvest.json"))
    print("search-harvest.json type:", type(harvest).__name__, "len:", len(harvest))
    rows = harvest if isinstance(harvest, list) else harvest.get("rows") or harvest.get("results") or []
    for h in rows:
        if isinstance(h, dict):
            url = h.get("url") or ""
            name = h.get("name") or h.get("title")
            lo, hi = h.get("price_lo"), h.get("price_hi")
            if lo is None:
                lo, hi = parse_price(h.get("price_text") or h.get("snippet") or "")
            add(cands, url, name, lo, hi, h.get("img"), [], "search")
except FileNotFoundError:
    print("no search-harvest.json")

out = list(cands.values())
jerseys = [c for c in out if JERSEY_RE.search(c["name"]) and not NON_JERSEY_RE.search(c["name"])]
priced = [c for c in jerseys if c["price_lo"]]

with open(f"{S}/candidates-all.json", "w") as f:
    json.dump(out, f, indent=1)

print(f"\ntotal unique product URLs: {len(out)}")
print(f"jersey-named: {len(jerseys)}   with price: {len(priced)}")
print("\n--- sample of priced jerseys (30) ---")
for c in priced[:30]:
    print(f"  ₦{c['price_lo']}-{c['price_hi']} | {c['name'][:70]} | {','.join(c['src'])}")
print("\n--- price distribution ---")
from collections import Counter
print(Counter(c["price_lo"] for c in priced).most_common(15))

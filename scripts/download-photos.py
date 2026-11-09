"""Download real product photos (Jetpack CDN, unblocked) for catalog items
where we captured image URLs — grid tiles + crawled product pages.
Saves to public/images/products/<slug>.jpg and verifies each file.
"""
import json
import re
import urllib.request

TILES = "/home/z/my-project/scripts/mysportskit-products.json"
PAGES = "/home/z/my-project/scripts/mysportskit-product-pages.json"
DEST = "/home/z/my-project/public/images/products/"

WANT = {
    "argentina-messi-2026-jersey": "argentina-messi-26-27.jpg",
    "liverpool-third-kits-2026-2027-jersey": "liverpool-third-26-27.jpg",
    "arsenal-jvc-all-black-1990-home-retro-jersey": "arsenal-retro-1990.jpg",
    "arsenal-authentic-2025-2026-home-jersey": "arsenal-authentic-home-25-26.jpg",
    "arsenal-authentic-2025-2026-away-jersey": "arsenal-authentic-away-25-26.jpg",
}


def fetch(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://mysportskit.com.ng/"})
    data = urllib.request.urlopen(req, timeout=60).read()
    with open(path, "wb") as f:
        f.write(data)
    return len(data)


def main():
    urls = {}
    for r in json.load(open(TILES)):
        slug = r["url"].rstrip("/").split("/product/")[-1]
        if r["img"]:
            urls[slug] = r["img"]
    for r in json.load(open(PAGES)):
        urls.setdefault(r["slug"], r["img"])
        if r["img"]:
            urls[r["slug"]] = r["img"]  # gallery image wins

    from PIL import Image
    for slug, fname in WANT.items():
        raw = urls.get(slug)
        if not raw:
            print(f"MISS  {slug}")
            continue
        orig = re.sub(r"\?.*$", "", raw)  # drop ?resize=300x340 — original is 705x800
        path = DEST + fname
        n = fetch(orig, path)
        im = Image.open(path)
        ok = im.size[0] >= 500 and n > 20000
        print(f"{'OK ' if ok else 'BAD'}  {fname:38} {im.size} {n:,} bytes")


if __name__ == "__main__":
    main()

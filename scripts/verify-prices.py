"""Verify curated catalog prices against harvest evidence.

For every curated product, show the snippet price fragments that mention its
slug — so a human can confirm the chosen price is the product's own range and
not a related product's. Prints PASS/FAIL per product.
"""
import json
import re

HARVEST = "/home/z/my-project/scripts/search-harvest.json"
TILES = "/home/z/my-project/scripts/mysportskit-products.json"
PAGES = "/home/z/my-project/scripts/mysportskit-product-pages.json"

PRICE = re.compile(r"₦\s?([\d,]{4,9})(?:\s?[–—-]\s?₦\s?([\d,]{4,9}))?")

# (slug-fragment, chosen price, season, kit, team, league, cat)
CATALOG = [
    ("real-madrid-home-2026-2027-jersey", 24999, "26/27", "HOME", "Real Madrid", "La Liga", "CLUB"),
    ("real-madrid-away-2026-2027-jersey", 24999, "26/27", "AWAY", "Real Madrid", "La Liga", "CLUB"),
    ("barcelona-home-2026-27-jersey", 24950, "26/27", "HOME", "FC Barcelona", "La Liga", "CLUB"),
    ("arsenal-2026-27-home-jersey", 28999, "26/27", "HOME", "Arsenal", "Premier League", "CLUB"),
    ("arsenal-2026-27-away-jersey", 24999, "26/27", "AWAY", "Arsenal", "Premier League", "CLUB"),
    ("arsenal-authentic-2026-2027-home-jersey", 24999, "25/26", "HOME", "Arsenal", "Premier League", "CLUB"),
    ("arsenal-jvc-all-black-1990-home-retro-jersey", 28999, "90", "HOME", "Arsenal", "Premier League", "CLUB"),
    ("arsenal-authentic-2025-2026-home-jersey", 32999, "25/26", "HOME", "Arsenal", "Premier League", "CLUB"),
    ("arsenal-authentic-2025-2026-away-jersey", 32999, "25/26", "AWAY", "Arsenal", "Premier League", "CLUB"),
    ("chelsea-home-2026-27-jersey", 24999, "26/27", "HOME", "Chelsea", "Premier League", "CLUB"),
    ("chelsea-away-2026-27-jersey-2", 24999, "26/27", "AWAY", "Chelsea", "Premier League", "CLUB"),
    ("liverpool-home-2026-2027-jersey", 28999, "26/27", "HOME", "Liverpool", "Premier League", "CLUB"),
    ("liverpool-away-2026-2027-jersey", 24999, "26/27", "AWAY", "Liverpool", "Premier League", "CLUB"),
    ("liverpool-third-kits-2026-2027-jersey", 24999, "26/27", "THIRD", "Liverpool", "Premier League", "CLUB"),
    ("manchester-city-2026-2027-home-jersey", 30999, "26/27", "HOME", "Manchester City", "Premier League", "CLUB"),
    ("manchester-city-2026-2027-away-jersey", 28950, "26/27", "AWAY", "Manchester City", "Premier League", "CLUB"),
    ("manchester-city-2026-2027-third-kits-jersey", 24999, "26/27", "THIRD", "Manchester City", "Premier League", "CLUB"),
    ("manchester-united-home-2026-2027-jersey", 24999, "26/27", "HOME", "Manchester United", "Premier League", "CLUB"),
    ("manchester-united-2002-2003-away-jersey", 28950, "02/03", "AWAY", "Manchester United", "Premier League", "CLUB"),
    ("tottenham-hotspur-home-2025-2026-jersey", 28999, "25/26", "HOME", "Tottenham Hotspur", "Premier League", "CLUB"),
    ("ac-milan-26-27-home-jersey", 24999, "26/27", "HOME", "AC Milan", "Serie A", "CLUB"),
    ("inter-milan-26-27-home-jersey", 24999, "26/27", "HOME", "Inter Milan", "Serie A", "CLUB"),
    ("bayern-munich-2026-27-home-jersey", 24999, "26/27", "HOME", "Bayern Munich", "Bundesliga", "CLUB"),
    ("borussia-dortmund-2026-27-home-jersey", 24999, "26/27", "HOME", "Borussia Dortmund", "Bundesliga", "CLUB"),
    ("paris-saint-germain-home-2026-2027-jersey", 24999, "26/27", "HOME", "Paris Saint-Germain", "Ligue 1", "CLUB"),
    ("nigeria-2026-stadium-home-jersey", 26999, "26/27", "HOME", "Nigeria", "Super Eagles", "NATIONAL"),
    ("argentina-messi-2026-jersey", 28999, "26/27", "HOME", "Argentina", "World Champions", "NATIONAL"),
    ("brazil-2024-home-retro-soccer-jersey", 28999, "24", "HOME", "Brazil", "Seleção", "NATIONAL"),
    ("england-home-2026-2027-jersey", 24999, "26/27", "HOME", "England", "Three Lions", "NATIONAL"),
    ("england-away-2026-2027-jersey", 24999, "26/27", "AWAY", "England", "Three Lions", "NATIONAL"),
]


def main():
    rows = json.load(open(HARVEST))
    tiles = json.load(open(TILES))
    pages = json.load(open(PAGES))
    pass1 = json.load(open("/home/z/my-project/scripts/search-harvest-pass1-digest.json"))
    tile_lo = {r["url"].rstrip("/").split("/product/")[-1]: r["price_lo"] for r in tiles}
    page_lo = {r["slug"]: r["price_lo"] for r in pages}

    ok = 0
    for frag, price, *_rest in CATALOG:
        evid = []
        for r in rows:
            if frag in (r["url"] or "") or frag in (r["name"] or "").lower().replace(" ", "-"):
                nums = {int(a.replace(",", "")) for a, _b in PRICE.findall(r["snippet"])}
                pairs = PRICE.findall(r["snippet"])
                if price in nums or any(int(a.replace(",", "")) == price for a, _b in pairs):
                    evid.append(r["url"].rstrip("/").split("/product/")[-1])
        if frag in pass1:
            for lo, hi in pass1[frag]:
                if lo == price or (hi == price):
                    evid.append("pass1-snippet")
        src = "tile" if tile_lo.get(frag) == price else ("page" if page_lo.get(frag) == price else "")
        status = "PASS" if (evid or src) else "FAIL"
        ok += status == "PASS"
        print(f"{status}  ₦{price:>6,}  {frag[:48]:50} evidence: {src or 'snippet'} {evid[:2]}")
    print(f"\n{ok}/{len(CATALOG)} products verified")


if __name__ == "__main__":
    main()

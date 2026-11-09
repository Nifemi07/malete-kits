#!/usr/bin/env python3
"""50-club plan: map every harvested club candidate to home/away slots; list gaps."""
import sys, json, re, collections
sys.path.insert(0, '/home/z/my-project/scripts')
import importlib.util as _u
_spec = _u.spec_from_file_location("curate_100", "/home/z/my-project/scripts/curate-100.py")
C = _u.module_from_spec(_spec)
_spec.loader.exec_module(C)

cands = json.load(open('/home/z/my-project/scripts/candidates-all.json'))
seeds = C.existing_seeds()
have = set(seeds.keys())

# prepared pass (same as curate main)
prepared = []
fan_price = {}
for c in cands:
    name = C.clean_name(c["name"] or "")
    url = c["url"].split("?")[0]
    if "mysportskit.com.ng" not in url:
        continue
    slug = re.sub(r"^/?product/", "", url.split("mysportskit.com.ng/")[-1]).strip("/")
    if not slug or slug in have:
        continue
    team = C.detect_team(name)
    if not team or team[2] != "CLUB":
        continue
    season = C.detect_season(name)
    kit = C.detect_kit(name)
    tag = C.tag_name(name)
    price, evidence = C.pick_price(c)
    if not C.JERSEY_RE.search(name) or C.NON_JERSEY_RE.search(name):
        continue
    prepared.append({"slug": slug, "name": name, "team": team[0], "season": season,
                     "kit": kit, "tag": tag, "price": price, "evidence": evidence,
                     "lo": c.get("price_lo"), "hi": c.get("price_hi"),
                     "src": set(c["src"]), "img": c.get("img")})
    if price and evidence in ("page", "tile", "snippet") and tag is None:
        key = (team[0], season, kit)
        if key not in fan_price or price < fan_price[key]:
            fan_price[key] = price

# dedupe by slug
seen = {}
for p in prepared:
    seen[p["slug"]] = p
prepared = list(seen.values())

by_team = collections.defaultdict(lambda: collections.defaultdict(list))
for p in prepared:
    by_team[p["team"]][p["kit"]].append(p)

print(f"club candidates not in catalog: {len(prepared)} across {len(by_team)} teams\n")
for t in sorted(by_team):
    print(f"== {t}")
    for kit in ("HOME", "AWAY", "THIRD"):
        items = by_team[t].get(kit, [])
        for i in items:
            print(f"   {kit:5s} {i['season']:5s} ₦{i['price']} [{i['evidence']}] tag={i['tag']}  {i['slug'][:58]}")

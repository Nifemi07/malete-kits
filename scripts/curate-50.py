"""Curate the harvest into a 50-club home+away extension.

For every club, fill the HOME and AWAY slots (26/27 preferred, then 25/26),
keeping tagged editions (kids/female/authentic/...) only when no plain kit
exists for the slot. Skips anything already in seed.ts by signature.

Price rules (same as curate-100): captured page > tile > snippet; plain fan
kits without a captured price use the site's uniform ₦24,999 class price
(flagged 'inferred'); player-grade = fan + 4,500; authentic/retro without a
captured price are not invented.

Output: scripts/catalog-extension-50.json
"""
import importlib.util as _u
import json
import re
import collections

_spec = _u.spec_from_file_location("curate_100", "/home/z/my-project/scripts/curate-100.py")
C = _u.module_from_spec(_spec)
_spec.loader.exec_module(C)

S = "/home/z/my-project/scripts"
CURRENT = {"26/27", "25/26"}
# slot preference: plain kit beats tagged; newer season beats older;
# better evidence beats worse; captured price beats inferred
EV_RANK = {"page": 0, "tile": 1, "snippet": 2, "inferred": 3}
TAG_RANK = {None: 0, "kids": 1, "female": 1, "stadium": 1, "long sleeve": 1,
            "lifestyle": 2, "player": 2, "authentic": 2, "retro": 3,
            "anniversary": 3, "terrace icons": 3, "icons": 3}


def load_prepared():
    cands = json.load(open(f"{S}/candidates-all.json"))
    seeds = C.existing_seeds()
    have = set(seeds.keys())
    signatures = set(seeds.values())
    prepared, fan_price = [], {}
    for c in cands:
        name = C.clean_name(c["name"] or "")
        url = c["url"].split("?")[0]
        if "mysportskit.com.ng" not in url:
            continue
        slug = re.sub(r"^/?product/", "", url.split("mysportskit.com.ng/")[-1]).strip("/")
        if not slug:
            continue
        team = C.detect_team(name)
        if not team or team[2] != "CLUB":
            continue
        if not C.JERSEY_RE.search(name) or C.NON_JERSEY_RE.search(name):
            continue
        season = C.detect_season(name)
        kit = C.detect_kit(name)
        tag = C.tag_name(name)
        price, evidence = C.pick_price(c)
        prepared.append({"slug": slug, "name": name, "url": url, "team": team,
                         "season": season, "kit": kit, "tag": tag,
                         "price": price, "evidence": evidence,
                         "src": set(c["src"]), "img": c.get("img")})
        if price and evidence in ("page", "tile", "snippet") and tag is None:
            key = (team[0], season, kit)
            if key not in fan_price or price < fan_price[key]:
                fan_price[key] = price
    # dedupe by slug (keep first = best-evidence ordering upstream)
    seen = {}
    for p in prepared:
        seen.setdefault(p["slug"], p)
    return list(seen.values()), fan_price, have, signatures


def price_for(p, fan_price):
    """Resolve a price for slot candidate p; returns (price, evidence) or None."""
    if p["price"] is not None:
        return p["price"], p["evidence"]
    low = p["name"].lower()
    team, season, kit, tag = p["team"][0], p["season"], p["kit"], p["tag"]
    if "player" in low:
        fp = fan_price.get((team, season, kit))
        return (fp + 4500, "inferred") if fp else None
    if "authentic" in low or "retro" in low:
        return None
    if tag in (None, "kids", "female", "stadium", "lifestyle", "long sleeve"):
        return 24999, "inferred"
    return None


def slot_score(p):
    return (TAG_RANK.get(p["tag"], 3), C.SEASON_UNUSED if False else (0 if p["season"] == "26/27" else 1),
            EV_RANK.get(p["evidence"], 4), 0 if p["price"] is not None else 1)


def main():
    prepared, fan_price, have, signatures = load_prepared()
    print(f"club candidates: {len(prepared)}")

    # group by club x kit (only current seasons; skip retro for slots)
    slots = collections.defaultdict(list)
    for p in prepared:
        if p["season"] not in CURRENT:
            continue
        if p["kit"] not in ("HOME", "AWAY"):
            continue
        slots[(p["team"][0], p["kit"])].append(p)

    clubs = sorted({t for (t, k) in slots})
    print(f"clubs with current-season home/away candidates: {len(clubs)}")

    out = []
    # pick best candidate per slot
    for (team, kit), items in sorted(slots.items()):
        # prefer a season where BOTH kits exist (pair consistency)
        seasons_for_team = {}
        for k2 in ("HOME", "AWAY"):
            seasons_for_team[k2] = {i["season"] for i in slots.get((team, k2), [])}
        pair_seasons = seasons_for_team["HOME"] & seasons_for_team["AWAY"]
        candidates = []
        for p in items:
            price_ev = price_for(p, fan_price)
            if price_ev is None:
                continue
            p = dict(p, fprice=price_ev[0], fevidence=price_ev[1])
            candidates.append(p)
        if not candidates:
            continue
        # prefer pair seasons, then slot score
        candidates.sort(key=lambda p: (0 if (pair_seasons and p["season"] in pair_seasons) else 1,) + slot_score(p))
        best = candidates[0]
        teamName, league, cat = best["team"]
        sig = (teamName, best["season"], kit, best["tag"] or "")
        if sig in signatures or best["slug"] in have:
            continue  # already covered by catalog
        display = C.display_for(best["name"], best["tag"], best["season"])
        out.append({
            "slug": best["slug"], "name": display, "teamName": teamName,
            "season": best["season"], "kitType": kit, "league": league,
            "categoryType": cat, "price": best["fprice"], "evidence": best["fevidence"],
            "img_remote": best["img"], "tag": best["tag"],
            "flavor": C.FLAVOR.get(teamName),
        })

    with open(f"{S}/catalog-extension-50.json", "w") as f:
        json.dump(out, f, indent=1)

    # report coverage
    by_team = collections.defaultdict(set)
    for o in out:
        by_team[o["teamName"]].add(o["kitType"])
    print(f"\nkept {len(out)} slot fills across {len(by_team)} clubs")
    full = sorted(t for t, ks in by_team.items() if {"HOME", "AWAY"} <= ks)
    print(f"clubs reaching BOTH slots via new fills: {len(full)}")
    for t in full:
        print("  +", t)
    from collections import Counter
    print("\nevidence:", Counter(o["evidence"] for o in out))
    print("seasons:", Counter(o["season"] for o in out))


if __name__ == "__main__":
    main()

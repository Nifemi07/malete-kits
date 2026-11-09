"""Harvest round 3: fill the gaps from rounds 1-2.

Query sources:
  a) jersey slugs in candidates-all.json with NO plausible price (snippet had
     no ₦ or garbage) — re-query with slug words + 'price naira'
  b) club/nation x variant combos not yet covered (third/kids/authentic for
     later clubs, kids/stadium for later nations, player version, long sleeve,
     retro per big team)
Merges into search-harvest.json like round 2.
"""
import json
import re
import subprocess
import time

OUT = "/home/z/my-project/scripts/search-harvest.json"
S = "/home/z/my-project/scripts"

JERSEY_RE = re.compile(r"jersey|kit|shirt|retro", re.I)
NON_JERSEY_RE = re.compile(r"shoe|boot|bag|legging|\bshorts?\b|t-shirt|tee\b|cap\b|ball\b|sock|jacket|hoodie|sandal|slipper|glove|scarf|backpack|track|bib", re.I)
PLAUSIBLE = (15000, 50000)

CLUBS_LATE = ["ac milan", "inter milan", "juventus", "napoli", "as roma", "atletico madrid",
              "bayern munich", "borussia dortmund", "paris saint-germain", "ajax",
              "benfica", "fc porto", "galatasaray", "al nassr", "al hilal", "al ahly"]
NATIONS_LATE = ["italy", "netherlands", "belgium", "croatia", "senegal", "egypt",
                "ivory coast", "algeria", "cameroon", "mali", "tunisia",
                "south africa", "uruguay", "colombia", "mexico", "usa", "japan", "canada"]
BIG = ["arsenal", "real madrid", "barcelona", "chelsea", "liverpool",
       "manchester city", "manchester united", "liverpool", "tottenham", "napoli",
       "ac milan", "inter milan", "bayern munich", "borussia dortmund", "psg"]


def run_query(q):
    cmd = ["z-ai", "function", "-n", "web_search", "-a", json.dumps({"query": q, "num": 10})]
    try:
        raw = subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout
    except Exception as e:
        print("ERR", q, e, flush=True)
        return []
    m = re.search(r"\[\s*\{.*\}\s*\]", raw, re.S)
    if not m:
        return []
    try:
        return json.loads(m.group(0))
    except Exception:
        return []


def plausible(p):
    return isinstance(p, int) and PLAUSIBLE[0] <= p <= PLAUSIBLE[1]


def main():
    cands = json.load(open(f"{S}/candidates-all.json"))
    harvest = json.load(open(OUT))
    keys = {(r.get("url"), r.get("name")) for r in harvest}

    # (a) priced-slug gaps: jersey-named, no plausible bound anywhere
    queries = []
    seen_slug = set()
    for c in cands:
        url = (c.get("url") or "").split("?")[0]
        if "mysportskit.com.ng/product/" not in url:
            continue
        slug = url.rstrip("/").split("/product/")[-1]
        if slug in seen_slug:
            continue
        seen_slug.add(slug)
        name = c.get("name") or ""
        has_price = plausible(c.get("price_lo")) or plausible(c.get("price_hi"))
        if not has_price and JERSEY_RE.search(name) and not NON_JERSEY_RE.search(name):
            queries.append(f"mysportskit.com.ng {' '.join(slug.split('-')[:7])} price naira")

    # (b) uncovered variants
    for club in CLUBS_LATE:
        queries.append(f"mysportskit.com.ng {club} third jersey price")
        queries.append(f"mysportskit.com.ng {club} kids jersey price")
        queries.append(f"mysportskit.com.ng {club} authentic jersey price")
    for nat in NATIONS_LATE:
        queries.append(f"mysportskit.com.ng {nat} kids jersey price")
        queries.append(f"mysportskit.com.ng {nat} home jersey price")
    for team in BIG[:10]:
        queries.append(f"mysportskit.com.ng {team} player version jersey price")
        queries.append(f"mysportskit.com.ng {team} long sleeve jersey price")
        queries.append(f"mysportskit.com.ng {team} retro jersey price")

    # dedupe queries
    queries = [q for q in dict.fromkeys(queries)]
    print(f"{len(queries)} queries ({len([q for q in queries if 'price naira' in q])} gap-fill)", flush=True)

    new = 0
    for i, q in enumerate(queries):
        items = run_query(q)
        added = 0
        for it in items:
            k = (it.get("url"), it.get("name"))
            if k in keys or not (it.get("url") or "").startswith("http"):
                continue
            keys.add(k)
            harvest.append({"q": q, "url": it.get("url"), "name": it.get("name"),
                            "snippet": (it.get("snippet") or "")[:400]})
            added += 1
        new += added
        if i % 10 == 9 or i == len(queries) - 1:
            with open(OUT, "w") as f:
                json.dump(harvest, f, indent=1)
            print(f"[{i + 1}/{len(queries)}] +{added} ({len(harvest)} total)", flush=True)
        time.sleep(1.2)

    with open(OUT, "w") as f:
        json.dump(harvest, f, indent=1)
    print(f"DONE: +{new} rows, {len(harvest)} total", flush=True)


if __name__ == "__main__":
    main()

"""Harvest-search round 2: systematic sweep for 100+ mysportskit jerseys.

Same trick as harvest-search.py (Google snippets carry "₦24,999 – ₦32,999"
fragments), but:
  - ~90 queries: clubs x kit variants, national teams x variants, retros
  - MERGES into scripts/search-harvest.json (dedupe by url+name), never overwrites
"""
import json
import re
import subprocess
import time

CLUBS = [
    "real madrid", "barcelona", "arsenal", "chelsea", "liverpool",
    "manchester city", "manchester united", "tottenham hotspur", "newcastle united",
    "ac milan", "inter milan", "juventus", "napoli", "as roma", "atletico madrid",
    "bayern munich", "borussia dortmund", "paris saint-germain", "ajax",
    "benfica", "fc porto", "galatasaray", "al nassr", "al hilal", "al ahly",
    "miami", "sunderland", "aston villa", "everton", "west ham",
]
NATIONS = [
    "nigeria", "argentina", "brazil", "england", "france", "portugal", "spain",
    "germany", "italy", "netherlands", "belgium", "croatia", "morocco", "ghana",
    "senegal", "egypt", "ivory coast", "algeria", "cameroon", "mali", "tunisia",
    "south africa", "uruguay", "colombia", "mexico", "usa", "japan", "canada",
]
VARIANTS = ["home jersey", "away jersey", "third jersey", "kids jersey", "authentic jersey"]
EXTRA = [
    "mysportskit.com.ng retro jersey 1990 1994 price",
    "mysportskit.com.ng retro classic jersey price naira",
    "mysportskit.com.ng long sleeve jersey 2026-27 price",
    "mysportskit.com.ng female jersey 2026-27 price",
    "mysportskit.com.ng women jersey price",
    "mysportskit.com.ng player version jersey price",
    "mysportskit.com.ng stadium edition jersey price",
    "mysportskit.com.ng goalkeeper jersey price",
    "mysportskit.com.ng training jersey price",
    "mysportskit.com.ng 2026-27 jersey price naira",
    "mysportskit.com.ng new arrival jersey price",
    "mysportskit.com.ng super eagles jersey price naira",
    "mysportskit.com.ng world cup 2026 jersey price",
    "mysportskit.com.ng champions league jersey price",
]

OUT = "/home/z/my-project/scripts/search-harvest.json"


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


def build_queries():
    qs = []
    for club in CLUBS:
        qs.append(f"mysportskit.com.ng {club} home jersey 2026-27 price")
        qs.append(f"mysportskit.com.ng {club} away jersey price")
    for i, club in enumerate(CLUBS):  # third/kids/authentic for the first half
        if i >= 16:
            break
        qs.append(f"mysportskit.com.ng {club} third jersey price")
        qs.append(f"mysportskit.com.ng {club} kids jersey price")
        qs.append(f"mysportskit.com.ng {club} authentic jersey price")
    for nat in NATIONS:
        qs.append(f"mysportskit.com.ng {nat} home jersey price")
        qs.append(f"mysportskit.com.ng {nat} away jersey price")
    for i, nat in enumerate(NATIONS):
        if i >= 12:
            break
        qs.append(f"mysportskit.com.ng {nat} kids jersey price")
        qs.append(f"mysportskit.com.ng {nat} stadium jersey price")
    qs += EXTRA
    # dedupe, keep order
    seen = set()
    return [q for q in qs if not (q in seen or seen.add(q))]


def main():
    queries = build_queries()
    print(f"{len(queries)} queries", flush=True)
    try:
        merged = json.load(open(OUT))
        keys = {(r.get("url"), r.get("name")) for r in merged}
        print(f"merging with {len(merged)} existing rows", flush=True)
    except FileNotFoundError:
        merged, keys = [], set()

    new = 0
    for i, q in enumerate(queries):
        items = run_query(q)
        added = 0
        for it in items:
            k = (it.get("url"), it.get("name"))
            if k in keys or not (it.get("url") or "").startswith("http"):
                continue
            keys.add(k)
            merged.append({"q": q, "url": it.get("url"), "name": it.get("name"),
                           "snippet": (it.get("snippet") or "")[:400]})
            added += 1
        new += added
        print(f"[{i + 1}/{len(queries)}] +{added} ({len(merged)} total)  {q[:60]}", flush=True)
        if i % 8 == 7:
            with open(OUT, "w") as f:
                json.dump(merged, f, indent=1)
        time.sleep(1.2)

    with open(OUT, "w") as f:
        json.dump(merged, f, indent=1)
    n_prod = sum(1 for r in merged if "/product/" in (r.get("url") or ""))
    print(f"DONE: +{new} rows, {len(merged)} total, {n_prod} mysportskit product URLs", flush=True)


if __name__ == "__main__":
    main()

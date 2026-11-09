"""Harvest round 7 (diff-driven): query only the combos still missing.

For the 12 biggest teams, enumerate (kit x variant) combos for 26/27 + 25/26
and query mysportskit only for those whose signature is neither in the seed
catalog nor in the current keeps.
"""
import json
import re
import subprocess
import time

S = "/home/z/my-project/scripts"
OUT = f"{S}/search-harvest.json"
SEED = "/home/z/my-project/prisma/seed.ts"

BIG_TEAMS = [
    "real madrid", "barcelona", "arsenal", "chelsea", "liverpool",
    "manchester city", "manchester united", "tottenham hotspur",
    "ac milan", "inter milan", "bayern munich", "borussia dortmund",
    "paris saint-germain", "nigeria", "argentina", "brazil", "england",
    "al nassr", "juventus", "napoli",
]
KITS = ["home", "away", "third"]
VARIANTS = ["", "kids", "female", "authentic", "long sleeve"]
SEASONS = ["2026-27", "2025-26"]


def run_query(q):
    cmd = ["z-ai", "function", "-n", "web_search", "-a", json.dumps({"query": q, "num": 10})]
    try:
        raw = subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout
    except Exception as e:
        return []
    m = re.search(r"\[\s*\{.*\}\s*\]", raw, re.S)
    if not m:
        return []
    try:
        return json.loads(m.group(0))
    except Exception:
        return []


def main():
    # signatures already covered: seed + kept
    seed_text = open(SEED).read()
    covered = set()
    for slug in re.findall(r"slug:\s*'([^']+)'", seed_text):
        covered.add(slug)
    ext = json.load(open(f"{S}/catalog-extension.json"))
    for o in ext:
        covered.add((o["teamName"].lower(), o["season"], o["kitType"].lower(), o["tag"] or ""))

    def is_covered(team, season, kit, tag):
        s = f"{m.group(1)}/{m.group(2)}" if (m := re.fullmatch(r"(20\d{2})-(\d{2})", season)) else season
        return ((team, s, kit, tag) in covered)

    queries = []
    for team in BIG_TEAMS:
        for season in SEASONS:
            for kit in KITS:
                for var in VARIANTS:
                    words = " ".join(w for w in (team, kit, var, "kit", season) if w)
                    queries.append((team, season, kit, var, f"mysportskit.com.ng {words} price"))

    # keep only queries for uncovered combos
    todo = []
    for team, season, kit, var, q in queries:
        if not is_covered(team, season, kit, var):
            todo.append(q)
    todo = list(dict.fromkeys(todo))
    print(f"{len(todo)} uncovered-combo queries", flush=True)

    harvest = json.load(open(OUT))
    keys = {(r.get("url"), r.get("name")) for r in harvest}
    new = 0
    for i, q in enumerate(todo):
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
        if i % 10 == 9 or i == len(todo) - 1:
            with open(OUT, "w") as f:
                json.dump(harvest, f, indent=1)
            print(f"[{i + 1}/{len(todo)}] +{added} ({len(harvest)} total)", flush=True)
        time.sleep(1.0)

    with open(OUT, "w") as f:
        json.dump(harvest, f, indent=1)
    print(f"DONE: +{new} rows, {len(harvest)} total", flush=True)


if __name__ == "__main__":
    main()

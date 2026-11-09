"""Harvest round 8 (v2): build toward 50 clubs x (home + away).

Phase A: one 26/27 query per club x kit (new clubs + missing kits of existing
clubs). Phase B (separate run): 25/26 fallbacks for whatever is still missing.

429-aware: probe-able, retries with backoff, logs failures per query.
"""
import json
import re
import subprocess
import time
import sys

S = "/home/z/my-project/scripts"
OUT = f"{S}/search-harvest.json"

NEW_CLUBS = [
    # La Liga
    "atletico madrid", "sevilla", "villarreal", "athletic bilbao", "real betis",
    "real sociedad", "valencia", "girona", "celta vigo", "rayo vallecano",
    "osasuna", "mallorca", "espanyol", "getafe", "levante", "elche",
    # Serie A
    "roma", "lazio", "atalanta", "fiorentina", "bologna", "como", "torino",
    "udinese", "genoa", "cagliari",
    # Bundesliga
    "bayer leverkusen", "rb leipzig", "eintracht frankfurt", "stuttgart",
    "freiburg", "hoffenheim", "werder bremen", "mainz", "union berlin", "wolfsburg",
    # Ligue 1
    "marseille", "monaco", "lyon", "lille", "nice", "lens", "rennes",
    "strasbourg", "brest", "nantes", "toulouse",
    # Rest of Europe / others
    "porto", "benfica", "sporting cp", "braga", "psv", "feyenoord",
    "fenerbahce", "besiktas", "al hilal", "al ahly", "zamalek",
    # EPL mid/lower
    "brighton", "crystal palace", "fulham", "bournemouth", "brentford",
    "wolves", "nottingham forest", "sunderland", "leeds united", "burnley",
]

MISSING_KITS = [
    "tottenham hotspur away", "west ham away", "everton away", "aston villa away",
    "borussia dortmund away", "paris saint-germain away", "inter milan away",
    "napoli home", "ajax home", "inter miami home", "bayern munich away",
    "newcastle away", "manchester united away", "al nassr away",
]


def run_query(q, tries=3):
    cmd = ["z-ai", "function", "-n", "web_search", "-a", json.dumps({"query": q, "num": 10})]
    for attempt in range(tries):
        try:
            raw = subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout
        except Exception:
            time.sleep(5)
            continue
        m = re.search(r"\[\s*\{.*\}\s*\]", raw, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return []
        if "429" in raw or "Too many requests" in raw:
            time.sleep(10 * (attempt + 1))
            continue
        return []
    return ["__RATE_LIMITED__"]


def phase(queries, label, harvest, keys, sleep_s=5.0):
    new, failed = 0, 0
    for i, q in enumerate(queries):
        items = run_query(q)
        if items and items[0] == "__RATE_LIMITED__":
            failed += 1
            print(f"[{i + 1}/{len(queries)}] RATE-LIMITED  {q[:60]}", flush=True)
            if failed >= 3:
                print("quota exhausted — stopping phase early", flush=True)
                with open(OUT, "w") as f:
                    json.dump(harvest, f, indent=1)
                return new, False
            time.sleep(30)
            continue
        failed = 0
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
        time.sleep(sleep_s)
    with open(OUT, "w") as f:
        json.dump(harvest, f, indent=1)
    print(f"{label} DONE: +{new} rows, {len(harvest)} total", flush=True)
    return new, True


def main():
    season = sys.argv[1] if len(sys.argv) > 1 else "2026-27"
    queries = []
    for club in NEW_CLUBS:
        for kit in ("home", "away"):
            queries.append(f"mysportskit.com.ng {club} {kit} jersey {season} price")
    for mk in MISSING_KITS:
        queries.append(f"mysportskit.com.ng {mk} jersey {season} price")
    queries = list(dict.fromkeys(queries))
    print(f"phase season={season}: {len(queries)} queries", flush=True)

    harvest = json.load(open(OUT))
    keys = {(r.get("url"), r.get("name")) for r in harvest}
    phase(queries, f"round8-{season}", harvest, keys)


if __name__ == "__main__":
    main()

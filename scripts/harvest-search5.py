"""Harvest round 5: the long tail — smaller clubs, more nations, league sweeps."""
import json
import re
import subprocess
import time

OUT = "/home/z/my-project/scripts/search-harvest.json"

CLUBS = [
    "lazio", "fiorentina", "atalanta", "brentford", "fulham", "crystal palace",
    "wolverhampton", "nottingham forest", "bournemouth", "brighton", "burnley",
    "wolves", "leicester", "southampton", "celtic", "rangers", "club brugge",
    "anderlecht", "ajax amsterdam", "feyenoord", "monaco", "marseille", "lyon",
    "al ittihad", "al ettifaq", "al shabab", "sevilla", "valencia", "villarreal",
    "real sociedad", "real betis", "athletic bilbao", "real sociadad", "celta vigo",
    "levante", "elche", "getafe", "osasuna", "rayo", "mallorca", "eibar",
]
NATIONS = [
    "zambia", "zimbabwe", "angola", "benin", "libya", "sudan", "gabon", "togo",
    "burkina faso", "guinea", "niger", "chad", "kenya", "tanzania", "uganda",
    "poland", "austria", "switzerland", "denmark", "sweden", "norway", "scotland",
    "wales", "ireland", "turkey", "russia", "ukraine", "serbia", "romania",
    "greece", "hungary", "israel", "qatar", "saudi arabia", "australia", "new zealand",
    "chile", "peru", "paraguay", "venezuela", "bolivia", "panama", "costa rica",
    "honduras", "jamaica", "haiti",
]
LEAGUE_SWEEPS = [
    "mysportskit.com.ng serie a jersey price",
    "mysportskit.com.ng serie a 2026-27 jersey price naira",
    "mysportskit.com.ng premier league jersey 2025-26 price",
    "mysportskit.com.ng la liga jersey price",
    "mysportskit.com.ng laliga jersey 2026 price",
    "mysportskit.com.ng bundesliga jersey price",
    "mysportskit.com.ng ligue 1 jersey price",
    "mysportskit.com.ng eredivisie jersey price",
    "mysportskit.com.ng liga mx jersey price",
    "mysportskit.com.ng retro 1998 jersey price",
    "mysportskit.com.ng retro 2002 jersey price",
    "mysportskit.com.ng retro jersey 90s price naira",
    "mysportskit.com.ng classic jersey price",
    "mysportskit.com.ng vintage jersey price",
    "mysportskit.com.ng Legends jersey price",
    "mysportskit.com.ng maradona jersey price",
    "mysportskit.com.ng ronaldinho jersey price",
    "mysportskit.com.ng zidane jersey price",
    "mysportskit.com.ng beckham jersey price",
    "mysportskit.com.ng ronaldo brazil jersey price",
    "mysportskit.com.ng kante jersey price",
    "mysportskit.com.ng osimhen jersey price",
    "mysportskit.com.ng lookman jersey price",
    "mysportskit.com.ng special edition jersey price",
    "mysportskit.com.ng pre match jersey price",
    "mysportskit.com.ng anniversary jersey price",
    "mysportskit.com.ng away kit 2026-27 price",
    "mysportskit.com.ng third kit price naira",
    "mysportskit.com.ng home kit 2026-27 price naira",
]


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


def main():
    queries = list(LEAGUE_SWEEPS)
    for club in CLUBS:
        queries.append(f"mysportskit.com.ng {club} jersey price")
    for nat in NATIONS:
        queries.append(f"mysportskit.com.ng {nat} jersey price")
    queries = list(dict.fromkeys(queries))
    print(f"{len(queries)} queries", flush=True)

    try:
        harvest = json.load(open(OUT))
        keys = {(r.get("url"), r.get("name")) for r in harvest}
    except FileNotFoundError:
        harvest, keys = [], set()

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

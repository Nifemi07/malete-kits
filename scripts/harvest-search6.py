"""Harvest round 6 (final): num=20, phrasing without 'price' — deeper result pools."""
import json
import re
import subprocess
import time

S = "/home/z/my-project/scripts"
OUT = f"{S}/search-harvest.json"

JERSEY_RE = re.compile(r"jersey|kit|shirt|retro", re.I)
NON_JERSEY_RE = re.compile(r"shoe|boot|bag|legging|\bshorts?\b|t-shirt|tee\b|cap\b|ball\b|sock|jacket|hoodie|sandal|slipper|glove|scarf|backpack|track|bib", re.I)


def run_query(q):
    cmd = ["z-ai", "function", "-n", "web_search", "-a", json.dumps({"query": q, "num": 20})]
    try:
        raw = subprocess.run(cmd, capture_output=True, text=True, timeout=120).stdout
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
    return isinstance(p, int) and 15000 <= p <= 220000


def main():
    cands = json.load(open(f"{S}/candidates-all.json"))
    harvest = json.load(open(OUT))
    keys = {(r.get("url"), r.get("name")) for r in harvest}

    targets, seen = [], set()
    for c in cands:
        url = (c.get("url") or "").split("?")[0]
        if "mysportskit.com.ng/product/" not in url:
            continue
        slug = url.rstrip("/").split("/product/")[-1]
        if slug in seen:
            continue
        seen.add(slug)
        name = c.get("name") or ""
        has_price = plausible(c.get("price_lo")) or plausible(c.get("price_hi"))
        if not has_price and JERSEY_RE.search(name) and not NON_JERSEY_RE.search(name):
            targets.append(slug)

    queries = []
    for slug in targets:
        words = " ".join(slug.rstrip("/").split("-")[:8])
        queries.append(f"mysportskit {words}")
        queries.append(f"\"mysportskit\" {words} jersey price range")
    queries = list(dict.fromkeys(queries))
    print(f"{len(targets)} targets -> {len(queries)} queries", flush=True)

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
        time.sleep(1.0)

    with open(OUT, "w") as f:
        json.dump(harvest, f, indent=1)
    print(f"DONE: +{new} rows, {len(harvest)} total", flush=True)


if __name__ == "__main__":
    main()

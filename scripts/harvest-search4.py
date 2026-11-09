"""Harvest round 4: price the 47 no-price jersey products.

Two query shapes per product, both tuned to surface ₦-bearing snippets:
  "mysportskit <slug words> price naira naira"  (already used in round 3 — vary it)
  "mysportskit.com.ng <slug words> ₦"
Merges into search-harvest.json.
"""
import json
import re
import subprocess
import time

S = "/home/z/my-project/scripts"
OUT = f"{S}/search-harvest.json"

JERSEY_RE = re.compile(r"jersey|kit|shirt|retro", re.I)
NON_JERSEY_RE = re.compile(r"shoe|boot|bag|legging|\bshorts?\b|t-shirt|tee\b|cap\b|ball\b|sock|jacket|hoodie|sandal|slipper|glove|scarf|backpack|track|bib", re.I)


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
    return isinstance(p, int) and 15000 <= p <= 50000


def main():
    cands = json.load(open(f"{S}/candidates-all.json"))
    harvest = json.load(open(OUT))
    keys = {(r.get("url"), r.get("name")) for r in harvest}

    targets = []
    seen = set()
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

    print(f"{len(targets)} no-price targets", flush=True)
    queries = []
    for slug in targets:
        words = " ".join(slug.rstrip("/").split("-")[:8])
        queries.append(f"mysportskit.com.ng {words} current price")
        queries.append(f"mysportskit {words} ₦ naira")
    queries = list(dict.fromkeys(queries))
    print(f"{len(queries)} queries", flush=True)

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

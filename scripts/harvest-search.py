"""Harvest mysportskit product URLs + prices via z-ai web_search snippets.

The site's WAF blocks our sandbox IPs, but Google has indexed its product
pages (often with "₦24,999 – ₦32,999 Price range" fragments in snippets).
One query per team; saves scripts/search-harvest.json.
"""
import json
import re
import subprocess
import time

QUERIES = [
    "mysportskit.com.ng chelsea home jersey 2026-27 price",
    "mysportskit.com.ng chelsea away jersey price",
    "mysportskit.com.ng manchester united home jersey 2026-27 price",
    "mysportskit.com.ng manchester united away jersey price",
    "mysportskit.com.ng real madrid away jersey 2026-2027 price",
    "mysportskit.com.ng nigeria home jersey price naira",
    "mysportskit.com.ng super eagles home jersey price",
    "mysportskit al nassr home jersey 2026 price naira",
    "mysportskit.com.ng brazil canarinho jersey price",
    "mysportskit.com.ng portugal home jersey 2026 price",
    "mysportskit.com.ng napoli home jersey 2026-27 price",
    "mysportskit.com.ng england away jersey 2026-2027 price",
    "mysportskit.com.ng tottenham hotspur jersey price",
    "mysportskit.com.ng atletico madrid jersey price",
    "mysportskit.com.ng morocco atlas lions jersey price",
    "mysportskit.com.ng ghana black stars jersey price",
    "mysportskit.com.ng arsenal 2026-27 home jersey price",
    "mysportskit.com.ng egypt mali senegal jersey price",
]

PRICE = re.compile(r"₦\s?([\d,]{4,9})(?:\s?[–—-]\s?₦\s?([\d,]{4,9}))?")
OUT = "/home/z/my-project/scripts/search-harvest.json"


def run_query(q):
    cmd = ["z-ai", "function", "-n", "web_search", "-a", json.dumps({"query": q, "num": 10})]
    try:
        raw = subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout
    except Exception as e:
        print("ERR", q, e)
        return []
    m = re.search(r"\[\s*\{.*\}\s*\]", raw, re.S)
    if not m:
        return []
    try:
        return json.loads(m.group(0))
    except Exception:
        return []


def main():
    out = []
    for q in QUERIES:
        items = run_query(q)
        print(f"{q[:52]:54} -> {len(items)} results", flush=True)
        for it in items:
            url = it.get("url") or ""
            name = it.get("name") or ""
            snippet = it.get("snippet") or ""
            row = {"q": q, "url": url, "name": name, "snippet": snippet}
            out.append(row)
        time.sleep(1.5)
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1)
    # quick digest: product pages + clean price ranges
    digest = {}
    for r in out:
        u = r["url"]
        if "/product/" not in u:
            continue
        slug = u.rstrip("/").split("/product/")[-1]
        prices = [(int(a.replace(",", "")), int(b.replace(",", "")) if b else None) for a, b in PRICE.findall(r["snippet"])]
        digest.setdefault(slug, {"name": r["name"], "url": u, "prices": []})
        digest[slug]["prices"] += prices
    print(f"\n{len(digest)} unique product URLs:")
    for slug, d in sorted(digest.items()):
        prices = ", ".join(f"{a}{('-' + str(b)) if b else ''}" for a, b in d["prices"][:3]) or "(no price in snippet)"
        print(f"  {slug[:58]:60} {prices}")


if __name__ == "__main__":
    main()

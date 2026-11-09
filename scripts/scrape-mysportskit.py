"""Scrape jerseys + prices from mysportskit.com.ng (WAF-resilient).

The site's WAF (bot verification) randomly challenges sessions and hard-403s
deep links. Strategy:
  - bootstrap: retry page 1 in FRESH browser contexts until it renders
  - walk pages by clicking the pagination "next" link (Referer keeps WAF calm)
  - on a block mid-walk: cool down, restart from page 1, click forward again
    (dedupe by URL skips already-captured rows)
  - never overwrite the output JSON with fewer rows than it already had
"""
import json
import sys
import time

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://mysportskit.com.ng/product-category/men/clothing/jerseys/"
TAG = sys.argv[2] if len(sys.argv) > 2 else "men-jerseys"
MAX_PAGES = 30
OUT = f"/home/z/my-project/scripts/tiles-{TAG}.json"
TIME_BUDGET = 3300
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
)

EXTRACT = """() => {
    // sidebar widgets + main grid are all ul.products — take every tile and
    // dedupe by URL in Python (widgets repeat grid items on the same page)
    return Array.from(document.querySelectorAll('ul.products li.product')).map(t => {
        const title = t.querySelector('.woocommerce-loop-product__title, h2');
        const link = t.querySelector('a.woocommerce-LoopProduct-link')
            || (title && title.closest('a'))
            || t.querySelector('h2 a')
            || t.querySelector('a[href*="/product/"]');
        const img = t.querySelector('img[src*="wp-content"], img[data-src], img');
        const priceEl = t.querySelector('.price');
        const del = priceEl ? priceEl.querySelector('del') : null;
        const ins = priceEl ? priceEl.querySelector('ins') : null;
        return {
            name: title ? title.textContent.trim() : null,
            url: link ? link.href : null,
            img: img ? (img.currentSrc || img.src || img.getAttribute('data-src')) : null,
            price_text: priceEl ? priceEl.textContent.replace(/\\s+/g, ' ').trim() : null,
            price_del: del ? del.textContent.trim() : null,
            price_ins: ins ? ins.textContent.trim() : null,
        };
    });
}"""


def parse_price(text: str):
    """'₦98,950 – ₦204,950' -> (98950, 204950); '₦79,950' -> (79950, 79950)."""
    nums = []
    for chunk in text.replace(",", "").split():
        chunk = chunk.strip("₦–—-")
        if chunk.isdigit():
            nums.append(int(chunk))
    if not nums:
        return None, None
    return min(nums), max(nums)


def save(products):
    try:
        old = json.load(open(OUT))
    except Exception:
        old = []
    if len(products) >= len(old):
        with open(OUT, "w") as f:
            json.dump(products, f, indent=1)


def main():
    try:
        seen = {r["url"] for r in json.load(open(OUT))}
        products = json.load(open(OUT))
        print(f"resuming with {len(products)} saved rows", flush=True)
    except Exception:
        seen, products = set(), []

    start = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        def wait_tiles(page) -> bool:
            for _ in range(12):  # ~30s max
                if page.evaluate("() => document.querySelectorAll('ul.products li.product').length") > 0:
                    page.wait_for_timeout(1500)
                    return True
                page.wait_for_timeout(2500)
            return False

        def extract_current(page):
            fresh = 0
            for t in page.evaluate(EXTRACT):
                if not t["name"] or not t["url"] or t["url"] in seen:
                    continue
                seen.add(t["url"])
                lo, hi = parse_price(t["price_text"] or "")
                t["price_lo"], t["price_hi"] = lo, hi
                products.append(t)
                fresh += 1
            return fresh

        page = None
        for attempt in range(6):  # bootstrap: fresh sessions until one renders
            if time.time() - start > TIME_BUDGET - 120:
                break
            ctx = browser.new_context(user_agent=UA, viewport={"width": 1366, "height": 768})
            page = ctx.new_page()
            try:
                page.goto(BASE, wait_until="domcontentloaded", timeout=60000)
            except Exception as e:
                print(f"bootstrap {attempt + 1}: goto error {str(e)[:60]}", flush=True)
                page.close()
                ctx.close()
                time.sleep(15)
                continue
            if wait_tiles(page):
                print(f"bootstrap {attempt + 1}: OK", flush=True)
                break
            print(f"bootstrap {attempt + 1}: challenged, retrying…", flush=True)
            page.close()
            ctx.close()
            time.sleep(15)

        if page is None:
            print("could not bootstrap any session", flush=True)
            browser.close()
            save(products)
            return

        ctx_page = page
        n = 1
        while n <= MAX_PAGES and time.time() - start < TIME_BUDGET:
            fresh = extract_current(page)
            print(f"page {n}: +{fresh} new (total {len(products)})", flush=True)
            save(products)
            if not page.query_selector("a.next.page-numbers"):
                print("no next link — done", flush=True)
                break
            page.wait_for_timeout(6000)  # human-like pacing
            clicked = False
            for _ in range(2):
                try:
                    page.click("a.next.page-numbers", timeout=10000)
                    clicked = True
                    break
                except Exception:
                    try:
                        page.evaluate("document.querySelector('a.next.page-numbers').click()")
                        clicked = True
                        break
                    except Exception:
                        page.wait_for_timeout(6000)
            page.wait_for_load_state("domcontentloaded", timeout=60000)
            if clicked and wait_tiles(page):
                n += 1
                continue
            # blocked mid-walk: cool down, restart from page 1 and click forward
            print(f"blocked at page {n + 1} — cooling down and restarting walk", flush=True)
            page.wait_for_timeout(30000)
            try:
                page.close()
            except Exception:
                pass
            ctx = browser.new_context(user_agent=UA, viewport={"width": 1366, "height": 768})
            page = ctx.new_page()
            page.goto(BASE, wait_until="domcontentloaded", timeout=60000)
            if not wait_tiles(page):
                print("restart blocked too — keeping partial data", flush=True)
                break
            n = 1  # resume clicking forward; dedupe skips captured rows
        browser.close()

    save(products)
    print(f"DONE: {len(products)} rows -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

"""BFS-crawl mysportskit product pages for catalog data.

Product detail pages load fine; their "related products" sections reveal more
product URLs. Start from known jersey URLs, visit new /product/ URLs breadth-
first, and for each page extract: title, price range, main image, sizes,
product-category links (club/national detection), related product URLs.

Saves scripts/mysportskit-product-pages.json (merge-safe, same rules as the
tile scraper).
"""
import json
import re
import time

from playwright.sync_api import sync_playwright

OUT = "/home/z/my-project/scripts/mysportskit-product-pages.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
)
MAX_PAGES = 170
TIME_BUDGET = 3300  # seconds

SEEDS = [
    "https://mysportskit.com.ng/product/argentina-messi-2026-jersey/",
    "https://mysportskit.com.ng/product/liverpool-third-kits-2026-2027-jersey/",
    "https://mysportskit.com.ng/product/barcelona-home-long-sleeve-2026-27-jersey/",
    "https://mysportskit.com.ng/product/arsenal-jvc-all-black-1990-home-retro-jersey/",
    "https://mysportskit.com.ng/product/arsenal-2026-27-third-kits-female-jersey/",
    "https://mysportskit.com.ng/product/real-madrid-away-2026-2027-kids-jersey/",
    "https://mysportskit.com.ng/product/liverpool-home-kids-2026-2027-jersey/",
]


def load_seeds():
    """Seed the queue with every product URL already captured anywhere."""
    try:
        cands = json.load(open("/home/z/my-project/scripts/candidates-all.json"))
        urls = [c["url"] for c in cands if "/product/" in c.get("url", "")]
        if urls:
            print(f"seeding queue with {len(urls)} known URLs", flush=True)
            return SEEDS + [u for u in urls if u not in SEEDS]
    except FileNotFoundError:
        pass
    return SEEDS

EXTRACT = """() => {
    const title = document.querySelector('h1.product_title, .product_title, h1');
    // scope to the product summary block FIRST — sidebar widgets have .price too
    const priceEl = document.querySelector('.summary .price')
        || document.querySelector('form.cart .price')
        || document.querySelector('[class*="product-info"] .price')
        || document.querySelector('.price');
    const img = document.querySelector('.woocommerce-product-gallery img, figure.woocommerce-product-gallery__wrapper img, .flex-viewport img, .summary img');
    const cats = Array.from(document.querySelectorAll('.posted_in a, .product-meta a[href*="product_cat"]')).map(a => a.textContent.trim());
    const related = Array.from(document.querySelectorAll('section.related ul.products li.product, .related.products ul.products li.product, ul.products li.product'))
        .map(t => {
            const tt = t.querySelector('.woocommerce-loop-product__title, h2');
            const ll = t.querySelector('a.woocommerce-LoopProduct-link, h2 a, a[href*="/product/"]');
            return (tt && ll) ? {name: tt.textContent.trim(), url: ll.href} : null;
        }).filter(Boolean);
    const sizes = Array.from(document.querySelectorAll('form.cart .variations select option, form.cart .swatch label, form.cart [data-wvss-value], .variations_form td.value option'))
        .map(o => (o.textContent || o.getAttribute('data-wvss-value') || '').trim())
        .filter(s => s && /^(XS|S|M|L|XL|XXL|3XL|2XL)$/i.test(s));
    const desc = document.querySelector('.woocommerce-Tabs-panel--description, #tab-description, .product-description');
    return {
        title: title ? title.textContent.trim() : null,
        price_text: priceEl ? priceEl.textContent.replace(/\\s+/g, ' ').trim() : null,
        img: img ? (img.currentSrc || img.src) : null,
        cats,
        related,
        sizes: Array.from(new Set(sizes)),
        desc: desc ? desc.textContent.replace(/\\s+/g, ' ').trim().slice(0, 400) : null,
    };
}"""


def parse_price(text: str):
    nums = []
    for chunk in text.replace(",", "").split():
        chunk = chunk.strip("₦–—-")
        if chunk.isdigit():
            nums.append(int(chunk))
    if not nums:
        return None, None
    return min(nums), max(nums)


def load_json():
    try:
        data = json.load(open(OUT))
        return data, {r["url"] for r in data}
    except Exception:
        return [], set()


def main():
    pages, seen = load_json()
    print(f"resuming with {len(pages)} pages", flush=True)
    queue = [u for u in load_seeds() if u not in seen]
    requeue = set()
    failed = set()
    start = time.time()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        def fresh_page():
            ctx = browser.new_context(user_agent=UA, viewport={"width": 1366, "height": 768})
            return ctx, ctx.new_page()

        ctx, page = fresh_page()
        holder = {"ctx": ctx, "page": page}

        def visit(url):
            for i in range(2):
                try:
                    holder["page"].goto(url, wait_until="domcontentloaded", timeout=60000)
                    for _ in range(8):
                        t = holder["page"].title()
                        if holder["page"].evaluate("() => !!document.querySelector('h1')") and "403" not in t and "Verificat" not in t and "Forbidden" not in t:
                            holder["page"].wait_for_timeout(1200)
                            return True
                        holder["page"].wait_for_timeout(2500)
                except Exception as e:
                    print(f"  goto error: {str(e)[:60]}", flush=True)
                if i == 0:
                    time.sleep(12)
                    try:
                        holder["ctx"].close()
                    except Exception:
                        pass
                    nctx, npage = fresh_page()
                    holder["ctx"], holder["page"] = nctx, npage
            return False

        while queue and len(pages) < MAX_PAGES and time.time() - start < TIME_BUDGET:
            url = queue.pop(0)
            if url in seen:
                continue
            ok = visit(url)
            if not ok:
                print(f"SKIP (blocked, requeued): {url}", flush=True)
                failed.add(url)
                if url not in requeue:  # one retry pass at the end
                    requeue.add(url)
                    queue.append(url)
                continue
            d = holder["page"].evaluate(EXTRACT)
            if not d or not d.get("title"):
                print(f"SKIP (no data): {url}", flush=True)
                continue
            lo, hi = parse_price(d.get("price_text") or "")
            slug = re.sub(r"^/product/|/$", "", url.split("mysportskit.com.ng")[-1])
            rec = {
                "url": url,
                "slug": slug,
                "name": d["title"],
                "price_lo": lo,
                "price_hi": hi,
                "img": d.get("img"),
                "cats": d.get("cats") or [],
                "sizes": d.get("sizes") or [],
                "desc": d.get("desc"),
            }
            pages.append(rec)
            seen.add(url)
            for r in d.get("related") or []:
                ru = r.get("url") or ""
                if "/product/" in ru and ru not in seen:
                    queue.append(ru)
            print(f"[{len(pages)}/{MAX_PAGES}] {d['title'][:58]} | {lo}-{hi} | cats={','.join((d.get('cats') or [])[:3])} | queue={len(queue)}", flush=True)
            with open(OUT, "w") as f:
                json.dump(pages, f, indent=1)
            time.sleep(7)  # pacing
            if time.time() - start > TIME_BUDGET - 60:
                break
        try:
            holder["ctx"].close()
        except Exception:
            pass
        browser.close()

    with open(OUT, "w") as f:
        json.dump(pages, f, indent=1)
    print(f"DONE: {len(pages)} pages -> {OUT}", flush=True)


if __name__ == "__main__":
    main()

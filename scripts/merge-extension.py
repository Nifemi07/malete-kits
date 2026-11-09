"""Merge catalog-extension.json (100 products) into prisma/seed.ts.

Image priority: downloaded per-slug photo > team's local photo (modern kits
only) > null (placeholder). Heritage lines (retro / lifestyle / anniversary /
terrace icons) never get a modern team photo — wrong era.

Idempotent: skips slugs already in seed.ts. Inserts before the closing ']' of
PRODUCTS; refreshes the CATALOG comment.
"""
import json
import re
import datetime

SEED = "/home/z/my-project/prisma/seed.ts"
EXT = "/home/z/my-project/scripts/catalog-extension.json"
MANIFEST = "/home/z/my-project/scripts/photo-manifest.json"

TEAM_IMAGE = {
    "Real Madrid": "/images/products/realmadrid-home.webp",
    "FC Barcelona": "/images/products/barcelona-home.webp",
    "Arsenal": "/images/products/arsenal-home.webp",
    "Chelsea": "/images/products/chelsea-home.webp",
    "Liverpool": "/images/products/liverpool-home.webp",
    "Manchester City": "/images/products/mancity-home.webp",
    "Manchester United": "/images/products/manutd-home.webp",
    "AC Milan": "/images/products/acmilan-home.webp",
    "Inter Milan": "/images/products/inter-home.webp",
    "Bayern Munich": "/images/products/bayern-home.webp",
    "Paris Saint-Germain": "/images/products/psg-home.webp",
    "Nigeria": "/images/products/nigeria-home.webp",
    "Argentina": "/images/products/argentina-home.webp",
    "Brazil": "/images/products/brazil-home.webp",
    "England": "/images/products/england-home.webp",
    "France": "/images/products/france-home.webp",
    "Portugal": "/images/products/portugal-home.webp",
    "Spain": "/images/products/spain-home.webp",
    "Al Nassr": "/images/products/alnassr-home.webp",
}
HERITAGE_TAGS = {"retro", "lifestyle", "anniversary", "terrace icons"}
KIT_WORD = {"HOME": "Home", "AWAY": "Away", "THIRD": "Third"}


def ts_quote(s: str) -> str:
    return s.replace("'", "’").replace("\n", "\\n")


def blurb_for(o):
    team = o["teamName"]
    flavor = o.get("flavor") or f"For every {team} fan in Malete."
    kit = KIT_WORD[o["kitType"]].lower()
    tag = o["tag"]
    if tag == "kids":
        return (f"The {team} {kit} shirt sized for the young ones — same colours, same badge, "
                f"built for schoolyard matches. {flavor}")
    if tag == "female":
        return (f"The {team} {kit} shirt cut for the female fan — same colours, same badge, "
                f"a fit that actually fits. {flavor}")
    if tag == "long sleeve":
        return (f"Long-sleeve edition of the {team} {kit} shirt — for cold Harmattan mornings "
                f"and defenders who slide. {flavor}")
    if tag == "player":
        return (f"The {team} {kit} shirt in Player Grade — the on-pitch spec fit and fabric. "
                f"Slim cut; consider one size up. {flavor}")
    if tag == "retro":
        return f"A cult classic reborn. {flavor}"
    if tag == "stadium":
        return f"The stadium-edition {team} {kit} shirt — the one the crowd wears on matchday. {flavor}"
    if tag == "lifestyle":
        return f"The {team} lifestyle piece — collared, clean and matchday-adjacent. {flavor}"
    if tag == "anniversary":
        return f"A milestone edition for the collectors. {flavor}"
    if tag == "terrace icons":
        return f"Terrace-icons heritage line — the shirt that never leaves rotation. {flavor}"
    return flavor


def desc_for_authentic(o):
    team = o["teamName"]
    kit = KIT_WORD[o["kitType"]].lower()
    season = o["season"]
    return ts_quote(
        f"The AUTHENTIC (player-spec) {team} {kit} shirt {season} — the exact fit, fabric "
        f"and heat-pressed details the players wear on the pitch, not the fan replica. "
        f"Slim athletic fit; consider one size up.\n\n"
        f"Want your name and favourite number printed in the official font? Add customisation "
        f"at checkout.\n\n"
        f"Ordering is simple: place your order, we confirm availability on WhatsApp, you pay by "
        f"transfer or cash, then pick up in Malete or get it delivered to your hostel.")


def image_for(o, manifest):
    if o["slug"] in manifest:
        return f"/images/products/{o['slug']}.jpg"
    if o["tag"] in HERITAGE_TAGS:
        return None
    return TEAM_IMAGE.get(o["teamName"])


def ts_entry(o, manifest):
    name = o.get("name")
    image = image_for(o, manifest)
    img = "null" if image is None else f"'{image}'"
    head = (f"  {{ slug: '{o['slug']}', "
            + (f"name: '{ts_quote(name)}', " if name else "")
            + f"teamName: '{o['teamName']}', season: '{o['season']}', kitType: '{o['kitType']}', "
              f"league: '{o['league']}', categoryType: '{o['categoryType']}', price: {o['price']}, "
              f"image: {img},\n")
    if o["tag"] == "authentic":
        return head + f"    desc: '{desc_for_authentic(o)}' }},"
    blurb = ts_quote(blurb_for(o))
    return head + f"    blurb: '{blurb}' }},"


def main():
    import sys
    ext_path = sys.argv[1] if len(sys.argv) > 1 else EXT
    section = sys.argv[2] if len(sys.argv) > 2 else "Nov 2026 catalog expansion"
    ext = json.load(open(ext_path))
    manifest = json.load(open(MANIFEST))
    seed = open(SEED).read()

    have = set(re.findall(r"slug:\s*'([^']+)'", seed))
    ext = [o for o in ext if o["slug"] not in have]
    if not ext:
        print("nothing new to merge")
        return

    clubs = [o for o in ext if o["categoryType"] == "CLUB"]
    nations = [o for o in ext if o["categoryType"] == "NATIONAL"]
    chunks = []
    if clubs:
        chunks.append(f"  // ---------- CLUB TEAMS — {section} ----------\n"
                      + "\n".join(ts_entry(o, manifest) for o in clubs))
    if nations:
        chunks.append(f"  // ---------- NATIONAL TEAMS — {section} ----------\n"
                      + "\n".join(ts_entry(o, manifest) for o in nations))
    insert = "\n" + "\n".join(chunks) + "\n"

    anchor = "]\n\nconst SIZES"
    assert seed.count(anchor) == 1, f"anchor count = {seed.count(anchor)}"
    seed = seed.replace(anchor, insert + "]\n\nconst SIZES")

    total = len(re.findall(r"\{ slug: '", seed))
    seed = re.sub(
        r"// CATALOG — mirrors mysportskit\.com\.ng jerseys and prices \(captured [^)]*\)",
        f"// CATALOG — mirrors mysportskit.com.ng jerseys and prices (captured "
        f"{datetime.date.today().strftime('%-d %b %Y')} from their listings, product pages and "
        f"indexed snippets; prices checked in scripts/verify-prices.py).",
        seed,
    )
    open(SEED, "w").write(seed)
    print(f"merged {len(ext)} products ({len(clubs)} club, {len(nations)} national); seed now lists {total} entries")


if __name__ == "__main__":
    main()

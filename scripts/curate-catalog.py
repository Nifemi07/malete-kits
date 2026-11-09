"""Merge tile + product-page scrapes into a curated MALÈTE KITS catalog.

Filters to adult team jerseys, maps names to the seed schema (teamName,
kitType, season, league, categoryType), and prints the PRODUCTS array for
prisma/seed.ts plus a summary table.

Price rule: use the site's "from" price (price_lo). Grid (tile) prices are
trusted over product-page prices when both exist (two sidebar-price bugs
slipped into the first two product-page rows).
"""
import json
import re

TILES = "/home/z/my-project/scripts/mysportskit-products.json"
PAGES = "/home/z/my-project/scripts/mysportskit-product-pages.json"

EXCLUDE = re.compile(
    r"\b(boot|slide|bag|legging|t-?shirt|hoodie|shorts|socks?|ball|sandal|crocs?|"
    r"bottle|cap|scarf|glove|shin|tracksuit|jacket|pants|backpack|sneaker|shoe|"
    r"trainings?|bib|kids?|female|women|lady|long sleeve|long-sleeve)\b",
    re.I,
)
IS_JERSEY = re.compile(r"\b(jersey|kit|shirt)\b", re.I)
AFFORDABLE = 50000  # student store ceiling — ₦98k+ retro stays out

# slug fragment -> (teamName, league, categoryType, featured, blurb)
TEAMS = {
    "real-madrid": ("Real Madrid", "La Liga", "CLUB", True,
        "Los Blancos never go out of style. Instantly recognisable on campus, matchday or class."),
    "barcelona": ("FC Barcelona", "La Liga", "CLUB", True,
        "Blaugrana pride in its purest form — for every culer in KWASU. Més que un club."),
    "arsenal": ("Arsenal", "Premier League", "CLUB", True,
        "North London standard, Malete approved. COYG!"),
    "chelsea": ("Chelsea", "Premier League", "CLUB", False,
        "Blues forever — a staple for any Stamford Bridge faithful."),
    "liverpool": ("Liverpool", "Premier League", "CLUB", True,
        "You'll Never Walk Alone in red. Bold, bright and built to last."),
    "man-city": ("Manchester City", "Premier League", "CLUB", False,
        "Sky Blue royalty — the colours of the Pep era, now on the streets of Malete."),
    "man-utd": ("Manchester United", "Premier League", "CLUB", True,
        "Theatre, tradition and that famous crest. A campus classic every season."),
    "manchester-city": ("Manchester City", "Premier League", "CLUB", False,
        "Sky Blue royalty — the colours of the Pep era, now on the streets of Malete."),
    "manchester-united": ("Manchester United", "Premier League", "CLUB", True,
        "Theatre, tradition and that famous crest. A campus classic every season."),
    "tottenham": ("Tottenham Hotspur", "Premier League", "CLUB", False,
        "To Dare Is To Do — Spurs colours for the true north London loyalist."),
    "psg": ("Paris Saint-Germain", "Ligue 1", "CLUB", False,
        "Ici c'est Paris. Parisian style for KWASU streets."),
    "paris-saint": ("Paris Saint-Germain", "Ligue 1", "CLUB", False,
        "Ici c'est Paris. Parisian style for KWASU streets."),
    "bayern": ("Bayern Munich", "Bundesliga", "CLUB", False,
        "Mia san mia — Bavarian power, Bundesliga standard."),
    "inter-milan": ("Inter Milan", "Serie A", "CLUB", False,
        "The Nerazzurri stripes never miss. Timeless Milanese design."),
    "ac-milan": ("AC Milan", "Serie A", "CLUB", False,
        "Rossoneri red and black. For the Milanista who knows style is non-negotiable."),
    "napoli": ("Napoli", "Serie A", "CLUB", False,
        "Partenopei pride from the foot of Vesuvius — Diego's city, Diego's colours."),
    "juventus": ("Juventus", "Serie A", "CLUB", False,
        "Fino alla fine — the Old Lady's black and white stripes, pure Italian class."),
    "atletico": ("Atlético Madrid", "La Liga", "CLUB", False,
        "Atleti gravel and fight — the Colchoneros' red and white stripes."),
    "dortmund": ("Borussia Dortmund", "Bundesliga", "CLUB", False,
        "Echte Liebe — the Yellow Wall's colours, loud as the Signal Iduna Park."),
    "al-nassr": ("Al Nassr", "Saudi Pro League", "CLUB", True,
        "SIUUU! CR7's club colours — one of the most requested shirts in Malete."),
    "al-hilal": ("Al Hilal", "Saudi Pro League", "CLUB", False,
        "The Blues of Riyadh — Saudi giants with a continental pedigree."),
    "al-ahly": ("Al Ahly", "Egyptian Premier League", "CLUB", False,
        "The Red Devils of Cairo — Africa's club of the century."),
    "nigeria": ("Nigeria", "Super Eagles", "NATIONAL", True,
        "UP SUPER EAGLES! Rep your country on campus — the most patriotic shirt in Malete."),
    "argentina": ("Argentina", "World Champions", "NATIONAL", True,
        "Albiceleste stripes with champions' energy — Messi's colours, three stars on the chest."),
    "brazil": ("Brazil", "Seleção", "NATIONAL", False,
        "O amarelinho! Five stars, endless flair. Joga bonito in Malete."),
    "portugal": ("Portugal", "Seleção das Quinas", "NATIONAL", True,
        "Deep red with the iconic crest — for CR7 fans who already own the Al Nassr one."),
    "england": ("England", "Three Lions", "NATIONAL", False,
        "It's coming home — or at least it's coming to Malete."),
    "france": ("France", "Les Bleus", "NATIONAL", False,
        "World-champion navy with two stars and a golden rooster."),
    "spain": ("Spain", "La Roja", "NATIONAL", False,
        "European champions' colours with that unmistakable Spanish flair."),
    "germany": ("Germany", "Die Mannschaft", "NATIONAL", False,
        "Four stars, zero drama — German efficiency in kit form."),
    "netherlands": ("Netherlands", "Oranje", "NATIONAL", False,
        "Total Football orange — Clockwork Orange style for the synthetics."),
    "italy": ("Italy", "Azzurri", "NATIONAL", False,
        "Azzurri blue — four stars of defending beauty."),
    "morocco": ("Morocco", "Atlas Lions", "NATIONAL", False,
        "The Atlas Lions — history makers of African football."),
    "ghana": ("Ghana", "Black Stars", "NATIONAL", False,
        "The Black Stars — Ghana's red, gold and green with pride."),
    "cameroon": ("Cameroon", "Indomitable Lions", "NATIONAL", False,
        "The Indomitable Lions — the pride of African football."),
    "senegal": ("Senegal", "Lions of Teranga", "NATIONAL", False,
        "The Lions of Teranga — West African power."),
    "ivory-coast": ("Ivory Coast", "Les Éléphants", "NATIONAL", False,
        "Les Éléphants — AFCON champions' colours."),
    "egypt": ("Egypt", "The Pharaohs", "NATIONAL", False,
        "The Pharaohs — seven-time AFCON kings."),
    "mali": ("Mali", "Les Aigles", "NATIONAL", False,
        "Les Aigles — the Eagles of Mali in gold and green."),
}


def season_of(text):
    t = text.lower()
    m = re.search(r"20(\d{2})\s*[-/]\s*20?(\d{2})", t)  # 2026-2027 / 2026/27 / 2025-26
    if m:
        return f"{m.group(1)}/{m.group(2)}"
    m = re.search(r"\b(19\d{2})\b", t)  # retro years
    if m:
        return m.group(1)[2:] + "/" + m.group(1)[2:]
    m = re.search(r"\b(20\d{2})\b", t)
    if m:
        y = m.group(1)[2:]
        return f"{y}/{int(m.group(1)) + 1 - 2000:02d}"
    return "25/26"


def kit_of(text):
    t = text.lower()
    if "third" in t:
        return "THIRD"
    if "away" in t or "second" in t:
        return "AWAY"
    return "HOME"


def team_of(slug_name):
    s = slug_name.lower()
    best = None
    best_len = 0
    for frag, meta in TEAMS.items():
        if re.search(r"(^|[-/ ])" + re.escape(frag) + r"([-/ ]|$)", s.replace("fc", "")) or frag in s:
            if len(frag) > best_len:
                best, best_len = frag, len(frag)
    return best


def upscale(img):
    """Grid thumbnails come as 300x340 Jetpack variants — request the original."""
    if img and "i0.wp.com" in img:
        return re.sub(r"\?.*$", "", img)
    return img


def main():
    tiles = json.load(open(TILES))
    pages = json.load(open(PAGES))

    merged = {}
    for r in tiles:
        slug = r["url"].rstrip("/").split("/product/")[-1]
        merged[slug] = {
            "name": r["name"], "lo": r["price_lo"], "hi": r["price_hi"],
            "img": upscale(r["img"]), "cats": [], "from": "tile",
        }
    for r in pages:
        slug = r["slug"]
        if slug in merged:
            # page gallery image is higher-res than the grid thumbnail
            merged[slug]["img"] = r["img"] or merged[slug]["img"]
            merged[slug]["cats"] = r["cats"] or merged[slug]["cats"]
            # keep tile price (grid) — page rows 1-2 had a sidebar-price bug
        else:
            merged[slug] = {
                "name": r["name"], "lo": r["price_lo"], "hi": r["price_hi"],
                "img": upscale(r["img"]), "cats": r["cats"], "from": "page",
            }

    kept, dropped = [], []
    for slug, m in merged.items():
        name = m["name"] or ""
        text = slug + " " + name
        if not IS_JERSEY.search(text) or EXCLUDE.search(text):
            dropped.append((slug, "not-adult-jersey"))
            continue
        if not m["lo"] or m["lo"] > AFFORDABLE:
            dropped.append((slug, f"price {m['lo']}"))
            continue
        frag = team_of(slug)
        if not frag:
            dropped.append((slug, "unknown team"))
            continue
        teamName, league, catType, featured, blurb = TEAMS[frag]
        kit = kit_of(slug)
        season = season_of(slug)
        kept.append({
            "slug": "mk-" + re.sub(r"^mk-", "", slug),
            "name": name,
            "teamName": teamName,
            "season": season,
            "kitType": kit,
            "league": league,
            "categoryType": catType,
            "price": m["lo"],
            "image": m["img"],
            "badge": "NEW" if season in ("26/27",) else None,
            "featured": featured,
            "blurb": blurb,
            "source": m["from"],
        })

    # dedupe: one product per (team, season, kitType) — keep the first (cheapest URL)
    seen_keys, final = set(), []
    for p in sorted(kept, key=lambda x: (x["teamName"], x["season"], x["kitType"], x["price"])):
        key = (p["teamName"], p["season"], p["kitType"])
        if key in seen_keys:
            dropped.append((p["slug"], "duplicate team/season/kit"))
            continue
        seen_keys.add(key)
        final.append(p)

    clubs = [p for p in final if p["categoryType"] == "CLUB"]
    nat = [p for p in final if p["categoryType"] == "NATIONAL"]
    print(f"kept {len(final)} ({len(clubs)} club / {len(nat)} national); dropped {len(dropped)}")
    for slug, why in dropped:
        print(f"  drop: {slug[:55]:57} {why}")
    print()
    for p in final:
        print(f"  {p['categoryType']:8} {p['teamName']:20} {p['kitType']:5} {p['season']} ₦{p['price']:,}  {p['slug'][:48]} [{p['source']}]")

    with open("/home/z/my-project/scripts/catalog-curated.json", "w") as f:
        json.dump(final, f, indent=1)

    # emit TS PRODUCTS array for prisma/seed.ts
    def ts(p):
        badge = f", badge: '{p['badge']}'" if p["badge"] else ""
        feat = ", featured: true" if p["featured"] else ""
        return (
            "  { slug: '%s', teamName: '%s', season: '%s', kitType: '%s', league: '%s', "
            "categoryType: '%s', price: %d, image: %s%s%s,\n    blurb: '%s' },"
            % (p["slug"], p["teamName"].replace("'", "\\'"), p["season"], p["kitType"],
               p["league"].replace("'", "\\'"), p["categoryType"], p["price"],
               ("'" + p["image"] + "'") if p["image"] else "null",
               badge, feat, p["blurb"].replace("'", "\\'"))
        )

    out = ["  // ---------- CLUB TEAMS ----------"]
    out += [ts(p) for p in final if p["categoryType"] == "CLUB"]
    out.append("  // ---------- NATIONAL TEAMS ----------")
    out += [ts(p) for p in final if p["categoryType"] == "NATIONAL"]
    with open("/home/z/my-project/scripts/catalog-products.ts.snippet", "w") as f:
        f.write("\n".join(out) + "\n")
    print("\nwrote scripts/catalog-products.ts.snippet")


if __name__ == "__main__":
    main()

"""Curate mysportskit candidates into a Malete Kits seed extension.

Reads scripts/candidates-all.json (built by mine-candidates.py AFTER the BFS
crawl) and produces scripts/catalog-extension.json: verified, jersey-only,
non-duplicate products not already in prisma/seed.ts, mapped to ProductSeed
fields.

Price evidence hierarchy: page visit ('pages') > tile ('tiles'/'oldtiles') >
search snippet ('search'). Plausible fan-jersey band: ₦15,000–₦50,000.
"""
import json
import re

S = "/home/z/my-project/scripts"
SEED = "/home/z/my-project/prisma/seed.ts"

# ---------- team detection ----------------------------------------------------
# keyword -> (teamName, league, categoryType)
TEAMS = {
    "real madrid": ("Real Madrid", "La Liga", "CLUB"),
    "barcelona": ("FC Barcelona", "La Liga", "CLUB"),
    "arsenal": ("Arsenal", "Premier League", "CLUB"),
    "chelsea": ("Chelsea", "Premier League", "CLUB"),
    "liverpool": ("Liverpool", "Premier League", "CLUB"),
    "manchester city": ("Manchester City", "Premier League", "CLUB"),
    "manchester united": ("Manchester United", "Premier League", "CLUB"),
    "man city": ("Manchester City", "Premier League", "CLUB"),
    "man utd": ("Manchester United", "Premier League", "CLUB"),
    "tottenham": ("Tottenham Hotspur", "Premier League", "CLUB"),
    "spurs": ("Tottenham Hotspur", "Premier League", "CLUB"),
    "ac milan": ("AC Milan", "Serie A", "CLUB"),
    "inter milan": ("Inter Milan", "Serie A", "CLUB"),
    "inter miami": ("Inter Miami", "MLS", "CLUB"),
    "bayern": ("Bayern Munich", "Bundesliga", "CLUB"),
    "dortmund": ("Borussia Dortmund", "Bundesliga", "CLUB"),
    "bvb": ("Borussia Dortmund", "Bundesliga", "CLUB"),
    "paris saint": ("Paris Saint-Germain", "Ligue 1", "CLUB"),
    "psg": ("Paris Saint-Germain", "Ligue 1", "CLUB"),
    "atletico": ("Atletico Madrid", "La Liga", "CLUB"),
    "athletico": ("Atletico Madrid", "La Liga", "CLUB"),
    "juventus": ("Juventus", "Serie A", "CLUB"),
    "napoli": ("Napoli", "Serie A", "CLUB"),
    "roma": ("AS Roma", "Serie A", "CLUB"),
    "newcastle": ("Newcastle United", "Premier League", "CLUB"),
    "aston villa": ("Aston Villa", "Premier League", "CLUB"),
    "west ham": ("West Ham United", "Premier League", "CLUB"),
    "everton": ("Everton", "Premier League", "CLUB"),
    "leeds": ("Leeds United", "Premier League", "CLUB"),
    "sunderland": ("Sunderland", "Premier League", "CLUB"),
    "benfica": ("Benfica", "Primeira Liga", "CLUB"),
    "porto": ("FC Porto", "Primeira Liga", "CLUB"),
    "sporting": ("Sporting CP", "Primeira Liga", "CLUB"),
    "ajax": ("Ajax", "Eredivisie", "CLUB"),
    "psv": ("PSV", "Eredivisie", "CLUB"),
    "galatasaray": ("Galatasaray", "Süper Lig", "CLUB"),
    "fenerbahce": ("Fenerbahçe", "Süper Lig", "CLUB"),
    "al nassr": ("Al Nassr", "Saudi Pro League", "CLUB"),
    "al hilal": ("Al Hilal", "Saudi Pro League", "CLUB"),
    "al ahly": ("Al Ahly", "Egyptian Premier League", "CLUB"),
    "zamalek": ("Zamalek", "Egyptian Premier League", "CLUB"),
    "kaizer": ("Kaizer Chiefs", "Prem Soccer League", "CLUB"),
    "orlando pirates": ("Orlando Pirates", "Prem Soccer League", "CLUB"),
    "enyimba": ("Enyimba", "NPFL", "CLUB"),
    "kano pillars": ("Kano Pillars", "NPFL", "CLUB"),
    # national teams
    "nigeria": ("Nigeria", "Super Eagles", "NATIONAL"),
    "argentina": ("Argentina", "World Champions", "NATIONAL"),
    "brazil": ("Brazil", "Seleção", "NATIONAL"),
    "england": ("England", "Three Lions", "NATIONAL"),
    "france": ("France", "Les Bleus", "NATIONAL"),
    "portugal": ("Portugal", "Seleção das Quinas", "NATIONAL"),
    "spain": ("Spain", "La Roja", "NATIONAL"),
    "germany": ("Germany", "Die Mannschaft", "NATIONAL"),
    "italy": ("Italy", "Azzurri", "NATIONAL"),
    "netherlands": ("Netherlands", "Oranje", "NATIONAL"),
    "belgium": ("Belgium", "Red Devils", "NATIONAL"),
    "croatia": ("Croatia", "Vatreni", "NATIONAL"),
    "uruguay": ("Uruguay", "La Celeste", "NATIONAL"),
    "colombia": ("Colombia", "Los Cafeteros", "NATIONAL"),
    "mexico": ("Mexico", "El Tri", "NATIONAL"),
    "usa": ("USA", "USMNT", "NATIONAL"),
    "canada": ("Canada", "CanMNT", "NATIONAL"),
    "japan": ("Japan", "Samurai Blue", "NATIONAL"),
    "korea": ("South Korea", "Taeguk Warriors", "NATIONAL"),
    "morocco": ("Morocco", "Atlas Lions", "NATIONAL"),
    "ghana": ("Ghana", "Black Stars", "NATIONAL"),
    "senegal": ("Senegal", "Lions of Teranga", "NATIONAL"),
    "egypt": ("Egypt", "Pharaohs", "NATIONAL"),
    "ivory coast": ("Ivory Coast", "Éléphants", "NATIONAL"),
    "cote d": ("Ivory Coast", "Éléphants", "NATIONAL"),
    "algeria": ("Algeria", "Desert Foxes", "NATIONAL"),
    "tunisia": ("Tunisia", "Eagles of Carthage", "NATIONAL"),
    "cameroon": ("Cameroon", "Indomitable Lions", "NATIONAL"),
    "mali": ("Mali", "Eagles", "NATIONAL"),
    "south africa": ("South Africa", "Bafana Bafana", "NATIONAL"),
    "ecuador": ("Ecuador", "La Tri", "NATIONAL"),
}

LEAGUE_ORDER = [  # longest keys first to avoid 'man city' matching 'manchester city'
    "manchester city", "manchester united", "real madrid", "ac milan", "inter milan",
]

FLAVOR = {
    "Real Madrid": "Los Blancos all the way.",
    "FC Barcelona": "Més que un club.",
    "Arsenal": "North London standard, Malete approved.",
    "Chelsea": "Blue blood, Stamford Bridge standard.",
    "Liverpool": "You’ll Never Walk Alone.",
    "Manchester City": "Sky Blue royalty.",
    "Manchester United": "Theatre, tradition and that famous crest.",
    "Tottenham Hotspur": "To Dare Is To Do.",
    "AC Milan": "Rossoneri style is non-negotiable.",
    "Inter Milan": "The Nerazzurri stripes never miss.",
    "Bayern Munich": "Mia san mia.",
    "Borussia Dortmund": "Echte Liebe — loud as the Yellow Wall.",
    "Paris Saint-Germain": "Ici c’est Paris.",
    "Nigeria": "UP SUPER EAGLES! The most patriotic shirt in Malete.",
    "Argentina": "Three stars and Messi’s number 10 energy.",
    "Brazil": "Joga bonito in the canary yellow.",
    "England": "It’s coming home — or at least to Malete.",
}

# ---------- helpers ------------------------------------------------------------
JERSEY_RE = re.compile(r"jersey|kit|shirt|retro", re.I)
NON_JERSEY_RE = re.compile(r"shoe|boot|bag|legging|\bshorts?\b|t-shirt|tee\b|cap\b|ball\b|sock|jacket|hoodie|sandal|slipper|glove|scarf|backpack|track|bib", re.I)

WORD_FIX = {"Jvc": "JVC", "Fc": "FC", "Cfc": "CFC", "Afc": "AFC", "Ucl": "UCL", "Iii": "III", "Ii": "II", "Fifa": "FIFA", "Utd": "UTD"}

# One documented inference: Chelsea's home authentic 26/27 was captured at
# ₦38,999 (harvest snippet "₦38,999 – ₦44,999"); the 25/26 edition of the same
# product line is priced at that same captured class price.
SPECIAL_PRICES = {"chelsea-home-2025-26-authentic-jersey": (38999, "inferred")}


def clean_name(name: str) -> str:
    n = re.sub(r"\s*[-–|]\s*Mysportskit\s*NG\s*$", "", name, flags=re.I).strip()
    n = re.sub(r"\s+", " ", n)
    # title-case ALL-CAPS or all-lower words
    words = []
    for w in n.split(" "):
        if len(w) > 3 and (w.isupper() or w.islower()):
            w = w.capitalize()
        words.append(WORD_FIX.get(w, w))
    return " ".join(words)


def detect_team(name: str):
    low = re.sub(r"[-_]", " ", name.lower())  # "Al-Nassr" -> "al nassr"
    for club in LEAGUE_ORDER:  # check multi-word keys before substrings
        if club in low:
            return TEAMS[club]
    for k, v in TEAMS.items():
        if re.search(rf"\b{re.escape(k)}\b", low):
            return v
    return None


def detect_season(name: str) -> str:
    low = name.lower().replace("–", "-").replace("/", "-")
    m = re.search(r"\b((?:19|20)\d{2})\s*-\s*((?:19|20)?\d{2})\b", low)
    if m:
        return f"{m.group(1)[-2:]}/{m.group(2)[-2:]}"
    # short form "24/25", "23-24" (no century prefix)
    m = re.search(r"\b(\d{2})\s*-\s*(\d{2})\b", low)
    if m and 20 <= int(m.group(1)) <= 35 and 20 <= int(m.group(2)) <= 35:
        return f"{m.group(1)}/{m.group(2)}"
    m = re.search(r"\b(19|20)(\d{2})\b", low)
    if m:
        return f"{m.group(1)}{m.group(2)}"
    return "26/27"


def detect_kit(name: str):
    low = name.lower()
    if "third" in low:
        return "THIRD"
    if "away" in low:
        return "AWAY"
    return "HOME"


def tag_name(name: str) -> str | None:
    """Marker phrase to keep in the display name, or None for a plain kit."""
    low = name.lower()
    for t in ("authentic", "long sleeve", "longsleeve", "long-sleeve", "kids",
              "female", "women", "stadium", "lifestyle", "retro", "player",
              "anniversary", "terrace icons", "icons"):
        if t in low:
            if "sleeve" in t:
                return "long sleeve"
            return "player" if t == "player" else t
    return None


def plausible(p) -> int | None:
    # page/tile evidence is scraped from the site itself — premium authentic
    # retros legitimately reach ₦204,950; snippets are contamination-prone so
    # they stay in the fan-jersey band
    if isinstance(p, int) and 15000 <= p <= 220000:
        return p
    return None


def pick_price(c: dict):
    """Prefer page-verified lo; fall back to tile lo, then any plausible bound."""
    srcs = set(c["src"])
    if "pages" in srcs and plausible(c["price_lo"]):
        return c["price_lo"], "page"
    for bound in (c["price_lo"], c["price_hi"]):
        if plausible(bound):
            if srcs == {"search"}:
                # snippet bounds above the fan band are contamination — reject
                return (bound, "snippet") if bound <= 50000 else (None, None)
            return bound, "tile"
    return None, None


def existing_seeds():
    """Parse prisma/seed.ts PRODUCTS entries -> {slug: (team, season, kit, tag)}."""
    text = open(SEED).read()
    seeds = {}
    pat = re.compile(
        r"\{ slug: '(?P<slug>[^']+)'.*?"
        r"(?:name: '(?P<name>[^']+)'.*?)?"
        r"teamName: '(?P<team>[^']+)'.*?"
        r"season: '(?P<season>[^']+)'.*?"
        r"kitType: '(?P<kit>[A-Z]+)'",
        re.S,
    )
    for m in pat.finditer(text):
        blob = m.group(0)
        name = m.group("name") or ""
        joined = f"{name} {m.group('slug')}".lower()
        tag = next((t for t in ("authentic", "long sleeve", "kids", "female", "women",
                                "stadium", "retro", "lifestyle") if t in joined), "")
        seeds[m.group("slug")] = (m.group("team"), m.group("season"), m.group("kit"), tag)
    return seeds


def existing_slugs():
    return set(existing_seeds().keys())


def display_for(name: str, tag: str | None, season: str) -> str | None:
    """Tagged items keep the cleaned scraped name (season appended if absent);
    plain kits return None so the seed generates 'Team Home Shirt 26/27'."""
    if tag is None:
        return None
    if not re.search(r"\b(19|20)\d{2}\b", name):
        name = f"{name} {season}"
    return name


def main():
    cands = json.load(open(f"{S}/candidates-all.json"))
    seeds = existing_seeds()
    have = set(seeds.keys())
    signatures = set(seeds.values())
    out, dropped = [], []

    # sort: page-verified first so they win dedupe collisions
    cands.sort(key=lambda c: (0 if "pages" in c["src"] else 1, c["name"]))

    # --- pre-pass: classify every candidate and map captured fan-kit prices ---
    prepared = []
    fan_price = {}
    for c in cands:
        name = clean_name(c["name"] or "")
        url = c["url"].split("?")[0]
        if "mysportskit.com.ng" not in url:
            continue
        slug = re.sub(r"^/?product/", "", url.split("mysportskit.com.ng/")[-1]).strip("/")
        if not slug:
            continue
        team = detect_team(name)
        season = detect_season(name)
        kit = detect_kit(name)
        tag = tag_name(name)
        price, evidence = pick_price(c)
        prepared.append({"c": c, "name": name, "slug": slug, "team": team,
                         "season": season, "kit": kit, "tag": tag,
                         "price": price, "evidence": evidence})
        if price and evidence in ("page", "tile", "snippet") and tag is None and team:
            # snippet fan prices are clean here (they passed the 15k-50k band);
            # they feed the player-grade inference (fan + 4,500)
            key = (team[0], season, kit)
            cur = fan_price.get(key)
            if cur is None or price < cur:
                fan_price[key] = price

    for p in prepared:
        c, name, slug, team, season, kit, tag = (p["c"], p["name"], p["slug"],
                                                 p["team"], p["season"], p["kit"], p["tag"])
        if slug in have:
            continue
        if not JERSEY_RE.search(name) or NON_JERSEY_RE.search(name):
            dropped.append((slug, "not jersey", name)); continue
        if not team:
            dropped.append((slug, "no team", name)); continue
        price, evidence = p["price"], p["evidence"]
        if price is None:
            # No captured price. Fan/kids/stadium kits are a UNIFORM ₦24,999 on
            # the site across every captured club; player-grade = fan + ₦4,500
            # (the site's own delta). Authentic/retro prices vary wildly — no
            # inference for those. Inferred prices are flagged for the report.
            low = name.lower()
            special = SPECIAL_PRICES.get(slug)
            if special:
                price, evidence = special
            elif "player" in low:
                fp = fan_price.get((team[0], season, kit))
                if fp:
                    price, evidence = fp + 4500, "inferred"
                else:
                    dropped.append((slug, "no fan base for player grade", name)); continue
            elif "authentic" in low or "retro" in low:
                dropped.append((slug, "no price (variable class)", name)); continue
            elif kit in ("HOME", "AWAY", "THIRD") and tag in (None, "kids", "female", "stadium", "lifestyle", "long sleeve"):
                price, evidence = 24999, "inferred"
            else:
                dropped.append((slug, "no plausible price", f"{c['price_lo']}-{c['price_hi']}")); continue
        # search-truncated URL that a kept candidate already covers?
        if any(o["slug"] != slug and o["slug"].startswith(slug) and len(slug) >= 18 for o in out):
            dropped.append((slug, "truncated dup", name)); continue
        teamName, league, cat = team
        sig = (teamName, season, kit, tag or "")
        # same team+season+kit(+tag) as an existing seed? same product, new URL
        if sig in signatures:
            dropped.append((slug, "already in catalog", name)); continue
        # same signature already kept from a better-evidenced candidate?
        if sig in {(o["teamName"], o["season"], o["kitType"], o["tag"] or "") for o in out}:
            dropped.append((slug, "dup of kept", name)); continue
        display = display_for(name, tag, season)
        sizes = c.get("sizes") or []
        out.append({
            "slug": slug,
            "name": display,
            "teamName": teamName,
            "season": season,
            "kitType": kit,
            "league": league,
            "categoryType": cat,
            "price": price,
            "evidence": evidence,
            "img_remote": c.get("img"),
            "sizes": sizes,
            "tag": tag,
            "flavor": FLAVOR.get(teamName),
        })

    with open(f"{S}/catalog-extension.json", "w") as f:
        json.dump(out, f, indent=1)

    print(f"kept {len(out)}  (need 100+)")
    from collections import Counter
    print("evidence:", Counter(o["evidence"] for o in out))
    print("teams:", Counter(o["teamName"] for o in out).most_common(20))
    print("tags:", Counter(o["tag"] for o in out))
    print("\ndrops:", Counter(d[1] for d in dropped))
    for d in dropped[:12]:
        print("  ", d[1], "|", d[2][:60])
    print("\n--- first 15 ---")
    for o in out[:15]:
        nm = o["name"] or "(generated name)"
        print(f"  ₦{o['price']} [{o['evidence']}] {nm[:66]}  ({o['slug'][:44]})")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Mine candidates-all.json (180 mysportskit product URLs): group by team x kitType with price evidence."""
import json, re, collections

rows = json.load(open('/home/z/my-project/scripts/candidates-all.json'))

def team_of(cats, name, url):
    for c in cats or []:
        if c.endswith(' FC') and c != 'Mysportskit FC':
            return c[:-3].strip()
        if c in ('Arsenal FC',):
            return c[:-3].strip()
    return None

def kit_of(name, url):
    s = f"{name} {url}".lower()
    if re.search(r'\bthird\b', s): return 'THIRD'
    if re.search(r'\baway\b', s): return 'AWAY'
    if re.search(r'\bhome\b', s): return 'HOME'
    return None

def variant_of(name, url):
    s = f"{name} {url}".lower()
    tags = []
    if re.search(r'\bkids?\b', s): tags.append('kids')
    if re.search(r'\b(female|women)\b', s): tags.append('female')
    if re.search(r'long[- ]sleeve', s): tags.append('LS')
    if re.search(r'\b(authentic|player)\b', s) and not re.search(r'\bfan\b', s): tags.append('auth')
    if re.search(r'\bretro\b|199\d|19\d\d[-/]', s): tags.append('retro')
    return '+'.join(tags) or 'std'

def season_of(name, url):
    s = f"{name} {url}"
    if re.search(r'2026[-/ .?]-?2027|26[-/]27', s, re.I): return '26/27'
    if re.search(r'2025[-/ .?]-?2026|25[-/]26', s, re.I): return '25/26'
    if re.search(r'2024[-/ .?]-?2025|24[-/]25', s, re.I): return '24/25'
    return '?'

grouped = collections.defaultdict(list)
for r in rows:
    team = team_of(r.get('cats'), r.get('name'), r.get('url'))
    kit = kit_of(r.get('name') or '', r.get('url') or '')
    if not team or not kit: continue
    grouped[(team, kit)].append(dict(
        name=r.get('name'), url=r.get('url'), lo=r.get('price_lo'), hi=r.get('price_hi'),
        var=variant_of(r.get('name') or '', r.get('url') or ''), season=season_of(r.get('name') or '', r.get('url') or '')))

teams = sorted(set(t for t, k in grouped))
print(f"teams with home/away/third signals: {len(teams)}\n")
for t in teams:
    line = f"{t:24s}"
    for k in ('HOME', 'AWAY', 'THIRD'):
        items = grouped.get((t, k), [])
        seas = sorted(set(i['season'] for i in items))
        prices = sorted(set(f"{i['lo']}" for i in items if i['lo']))
        line += f"  {k}:{len(items)} {seas} {prices[:3]}"
    print(line)

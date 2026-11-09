#!/usr/bin/env python3
"""Coverage analysis: which clubs have home / away kits in the current catalog?"""
import re, collections

seed = open('/home/z/my-project/prisma/seed.ts').read()
start = seed.index('const PRODUCTS')
end = seed.index('\n]', start)
body = seed[start:end]

rows = []
for blk in re.finditer(r"\{ slug: '([^']+)',(?: name: '([^']*)',)? teamName: '([^']+)', season: '([^']+)', kitType: '([^']+)', league: '([^']+)', categoryType: '([^']+)', price: (\d+)", body):
    rows.append(dict(zip(('slug','name','teamName','season','kitType','league','categoryType','price'), blk.groups())))

clubs = [r for r in rows if r['categoryType'] == 'CLUB']
by_team = collections.defaultdict(lambda: collections.defaultdict(list))
for r in clubs:
    by_team[r['teamName']][r['kitType']].append(r['season'])

print(f"products={len(rows)} club_products={len(clubs)} club_teams={len(by_team)}")

both, partial = [], []
for t in sorted(by_team):
    kits = {k: sorted(v) for k, v in by_team[t].items()}
    has_h, has_a = 'HOME' in kits, 'AWAY' in kits
    line = f"  {t:22s} HOME:{','.join(kits.get('HOME', ['-']))}  AWAY:{','.join(kits.get('AWAY', ['-']))}  extras={','.join(sorted(set(kits) - {'HOME','AWAY'})) or '-'}"
    (both if has_h and has_a else partial).append(line)

print(f"\n== clubs with BOTH home+away ({len(both)}) ==")
print('\n'.join(both))
print(f"\n== clubs MISSING one of home/away ({len(partial)}) ==")
print('\n'.join(partial))

print("\n== club products by season ==")
for s, c in sorted(collections.Counter(r['season'] for r in clubs).items()):
    print(f"  {s}: {c}")

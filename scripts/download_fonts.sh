#!/bin/bash
# Download self-hosted fonts (Archivo + Oswald latin subsets) and generate local @font-face CSS
cd /home/z/my-project/public/fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"

curl -sL --max-time 20 "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Archivo:wght@400;500;600;700;800;900&display=swap" -H "User-Agent: $UA" -o fonts.css

# extract latin subset URLs (the block right after "/* latin */") for each family/weight
python3 <<'EOF'
import re

css = open('fonts.css').read()
blocks = re.findall(r'/\* latin \*/\s*@font-face\s*\{(.*?)\}', css, re.S)
out_css = []
seen = set()
for b in blocks:
    fam = re.search(r"font-family:\s*'([^']+)'", b).group(1)
    weight = re.search(r"font-weight:\s*(\d+)", b).group(1)
    url = re.search(r"url\((https://[^)]+\.woff2)\)", b).group(1)
    key = f"{fam}-{weight}"
    if key in seen:
        continue
    seen.add(key)
    fname = f"{fam.lower().replace(' ', '-')}-{weight}.woff2"
    out_css.append((fname, url, fam, weight))
    print(f"{fname} {url}")

with open('download_list.txt', 'w') as f:
    for fname, url, fam, weight in out_css:
        f.write(f"{fname}|{url}|{fam}|{weight}\n")

# write local fonts css
with open('local-fonts.css', 'w') as f:
    for fname, url, fam, weight in out_css:
        f.write(f"""@font-face {{
  font-family: '{fam}';
  font-style: normal;
  font-weight: {weight};
  font-display: swap;
  src: url('/fonts/{fname}') format('woff2');
}}
""")
EOF

while IFS='|' read -r fname url fam weight; do
  curl -sL --max-time 30 "$url" -o "$fname" && echo "OK $fname ($(stat -c%s "$fname") bytes)" || echo "FAIL $fname"
done < download_list.txt
rm -f download_list.txt fonts.css
echo "FONTS DONE"

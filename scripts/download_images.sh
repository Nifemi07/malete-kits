#!/bin/bash
# Extract best image URL per team from search results and download to public/images
cd /home/z/my-project/scripts/imgsearch

get_url() {
  # takes file, prints first original_url (strips CLI banner before JSON)
  python3 - "$1" <<'EOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        raw = f.read()
    start = raw.find('{')
    if start < 0:
        sys.exit(0)
    data = json.loads(raw[start:])
    results = data.get("results", [])
    results.sort(key=lambda r: int(str(r.get("original_width", "0")).replace("px", "") or 0), reverse=True)
    if results:
        print(results[0]["original_url"])
except Exception:
    pass
EOF
}

declare -A MAP=(
  [real_madrid]="realmadrid-home"
  [barcelona]="barcelona-home"
  [arsenal]="arsenal-home"
  [chelsea]="chelsea-home"
  [liverpool]="liverpool-home"
  [mancity]="mancity-home"
  [manutd]="manutd-home"
  [psg]="psg-home"
  [bayern]="bayern-home"
  [inter]="inter-home"
  [acmilan]="acmilan-home"
  [alnassr]="alnassr-home"
  [nigeria]="nigeria-home"
  [argentina]="argentina-home"
  [portugal]="portugal-home"
  [brazil]="brazil-home"
  [england]="england-home"
  [france]="france-home"
  [spain]="spain-home"
)

mkdir -p /home/z/my-project/public/images/products
for key in "${!MAP[@]}"; do
  url=$(get_url "$key.json")
  name="${MAP[$key]}"
  if [ -n "$url" ]; then
    ext="jpg"
    case "$url" in *.webp) ext="webp";; *.png) ext="png";; *.jpeg) ext="jpg";; esac
    curl -sL --max-time 60 "$url" -o "/home/z/my-project/public/images/products/$name.$ext" && \
      echo "DOWNLOADED $name.$ext <- $url" || echo "FAILED $name"
  else
    echo "NO URL for $key"
  fi
done

# hero image (2nd result of hero.json for variety, largest first)
url=$(get_url "hero.json")
if [ -n "$url" ]; then
  ext="jpg"; case "$url" in *.webp) ext="webp";; *.png) ext="png";; esac
  curl -sL --max-time 60 "$url" -o "/home/z/my-project/public/images/hero.$ext" && echo "DOWNLOADED hero.$ext <- $url"
fi
echo "DONE"

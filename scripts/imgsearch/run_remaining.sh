#!/bin/bash
# Sequential-with-small-concurrency image search runner
cd /home/z/my-project/scripts/imgsearch

run() {
  local q="$1" out="$2" c="${3:-3}"
  if [ -s "$out" ] && grep -q '"success": true' "$out" 2>/dev/null; then
    echo "SKIP $out (already ok)"
    return 0
  fi
  for attempt in 1 2 3; do
    z-ai image-search -q "$q" -c "$c" --gl us --no-rank > "$out" 2>/dev/null
    if [ -s "$out" ] && grep -q '"success": true' "$out"; then
      echo "OK $out (attempt $attempt)"
      return 0
    fi
    echo "RETRY $out (attempt $attempt failed)"
    sleep 4
  done
  echo "FAIL $out"
}

run_batch() {
  local pids=()
  for spec in "$@"; do
    IFS='|' read -r q out c <<< "$spec"
    run "$q" "$out" "${c:-3}" &
    pids+=($!)
  done
  wait
}

run_batch \
  "Real Madrid home football jersey 2025 product photo|real_madrid.json" \
  "FC Barcelona home football jersey 2025 product photo|barcelona.json" \
  "Arsenal home football jersey 2025 product photo|arsenal.json"

run_batch \
  "Chelsea FC home football jersey 2025 product photo|chelsea.json" \
  "Liverpool FC home football jersey 2025 product photo|liverpool.json" \
  "Manchester United home football jersey 2025 product photo|manutd.json"

run_batch \
  "Nigeria national team football jersey Super Eagles product photo|nigeria.json" \
  "Argentina national team football jersey 2025 product photo|argentina.json" \
  "Portugal national team football jersey product photo|portugal.json"

run_batch \
  "Brazil national team yellow football jersey product photo|brazil.json" \
  "Bayern Munich home football jersey 2025 product photo|bayern.json" \
  "Inter Milan home football jersey 2025 product photo|inter.json"

run_batch \
  "AC Milan home football jersey 2025 product photo|acmilan.json" \
  "Al Nassr football jersey 2025 product photo|alnassr.json" \
  "football jerseys hanging rack dark background sporty store|hero.json" "4"

run_batch \
  "England national football team jersey 2025 product photo|england.json" \
  "France national football team jersey 2025 product photo|france.json" \
  "Spain national football team jersey 2025 product photo|spain.json"

echo "ALL SEARCHES COMPLETE"

#!/bin/bash
# Lädt fehlende Video-Vorschaubilder einmalig von YouTube und legt sie in assets/vorschaubilder/ ab.
# So fragt die App beim Stöbern nicht mehr bei Google an. Läuft auf dem Mac (curl und sips).
# Aufruf im App-Ordner:  bash scripts/update-vorschaubilder.sh
set -u
cd "$(dirname "$0")/.."
target="assets/vorschaubilder"
mkdir -p "$target"
ids=$(grep -hoE '(i\.ytimg\.com/vi/|youtu\.be/|watch\?v=|/live/|/embed/)[A-Za-z0-9_-]{11}' data/*.json \
  | grep -oE '[A-Za-z0-9_-]{11}$' | sort -u)
neu=0; vorhanden=0; fehler=""
for id in $ids; do
  file="$target/$id.jpg"
  if [ -s "$file" ]; then vorhanden=$((vorhanden+1)); continue; fi
  tmp=$(mktemp)
  if curl -fsS --max-time 20 -o "$tmp" "https://i.ytimg.com/vi/$id/hqdefault.jpg"; then
    # 480×360 mit schwarzen Balken -> 480×270 (16:9, wie die Karten), etwas stärker komprimiert.
    if command -v sips >/dev/null; then
      sips --cropToHeightWidth 270 480 -s format jpeg -s formatOptions 70 "$tmp" --out "$file" >/dev/null 2>&1 || cp "$tmp" "$file"
    else
      cp "$tmp" "$file"
    fi
    neu=$((neu+1))
  else
    fehler="$fehler $id"
  fi
  rm -f "$tmp"
done
echo "Vorschaubilder: $neu neu, $vorhanden schon vorhanden."
[ -n "$fehler" ] && echo "Nicht gefunden (Video privat oder gelöscht?):$fehler"
du -sh "$target" | awk '{print "Ordnergröße: " $1}'
exit 0

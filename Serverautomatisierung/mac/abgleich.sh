#!/bin/bash
# Täglicher Inhalts-Abgleich der MO-Ni-App (Vorlage; liegt auf dem Mac unter work/Werkzeuge/MO-Ni-App-Abgleich/).
# Braucht nur Node.js (nodejs.org) und das vorinstallierte python3 – kein Codex, kein Homebrew.
set -euo pipefail
W="$(cd "$(dirname "$0")" && pwd)"
export TMPDIR="$W/.lokal.nosync/tmp"; mkdir -p "$TMPDIR"
export PDFTOTEXT_BIN="$W/programm/scripts/pdftotext.py"
NODE="$(command -v node || true)"
for candidate in /usr/local/bin/node /opt/homebrew/bin/node; do [ -z "$NODE" ] && [ -x "$candidate" ] && NODE="$candidate"; done
if [ -z "$NODE" ]; then echo "Node.js fehlt – bitte einmal von https://nodejs.org installieren (LTS, macOS-Installer)." >&2; exit 3; fi
if [ "${1:-}" = "--rueckpruefen" ]; then exec "$NODE" "$W/programm/scripts/inhalte-abgleichen.mjs" --rueckpruefen="$W/heute/bericht.json"; fi
"$NODE" "$W/programm/scripts/inhalte-abgleichen.mjs" --ausgabe="$W/heute"
rm -f "$TMPDIR"/mo-ni-knobelreise-*.lock

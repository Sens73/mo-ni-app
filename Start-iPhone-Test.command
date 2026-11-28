#!/bin/zsh
set -euo pipefail

PROJECT_DIR="${0:A:h}"
PROJECT_ROOT="${PROJECT_DIR:h:h}"
NODE_BIN="$(command -v node || true)"
CODEX_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"

if [[ -z "$NODE_BIN" && -x "$CODEX_NODE" ]]; then
  NODE_BIN="$CODEX_NODE"
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js wurde nicht gefunden. Bitte die Entwicklungsumgebung zuerst in Codex einrichten lassen."
  read -r "?Zum Schließen die Eingabetaste drücken. "
  exit 1
fi

PRIMARY_INTERFACE="$(/sbin/route -n get default 2>/dev/null | /usr/bin/awk '/interface:/{print $2; exit}' || true)"
LAN_IP=""

if [[ -n "$PRIMARY_INTERFACE" ]]; then
  LAN_IP="$(/sbin/ifconfig "$PRIMARY_INTERFACE" 2>/dev/null | /usr/bin/awk '$1 == "inet" {print $2; exit}' || true)"
fi

if [[ -z "$LAN_IP" ]]; then
  for interface in en0 en1 en2 en3 en4 en5 en6 en7 en8 en9 en10; do
    LAN_IP="$(/sbin/ifconfig "$interface" 2>/dev/null | /usr/bin/awk '$1 == "inet" && $2 !~ /^127\./ {print $2; exit}' || true)"
    [[ -n "$LAN_IP" ]] && break
  done
fi

if [[ -z "$LAN_IP" ]]; then
  echo "Es wurde keine WLAN-Adresse des Macs gefunden. Bitte verbinde Mac und iPhone mit demselben WLAN und starte diese Datei erneut."
  read -r "?Zum Schließen die Eingabetaste drücken. "
  exit 1
fi

cd "$PROJECT_DIR"

CURRENT_VERSION="0.14.0"
CURRENT_RELEASE="v0.14.0-release-6"
IPHONE_PORT="4216"

show_instructions() {
  local iphone_url="http://$LAN_IP:$1/?version=$CURRENT_VERSION&release=$CURRENT_RELEASE&autoupdate=1&view=more&install=1&iphone-test=1"
  local encoded_url
  local qr_page

  encoded_url="$("$NODE_BIN" -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$iphone_url")"
  qr_page="http://localhost:$1/iphone-install.html?target=$encoded_url"
  print -rn -- "$iphone_url" | /usr/bin/pbcopy
  /usr/bin/open -na "Google Chrome" --args --new-window "$qr_page"
  echo ""
  echo "MO-Ni ist für dein iPhone bereit."
  echo ""
  echo "1. Mac und iPhone müssen im selben WLAN sein."
  echo "2. Scanne den automatisch geöffneten QR-Code mit der iPhone-Kamera."
  echo ""
  echo "   $iphone_url"
  echo ""
  echo "3. Tippe auf die eingeblendete Internetadresse."
  echo "4. Tippe in Safari auf Teilen, dann auf ‚Zum Home-Bildschirm hinzufügen‘."
  echo "5. Aktiviere ‚Als Web-App öffnen‘ und bestätige mit ‚Hinzufügen‘."
  echo ""
  echo "Das MO-Ni-Symbol erscheint danach auf dem Home-Bildschirm."
  echo "Dieses Terminalfenster muss während des lokalen Tests geöffnet bleiben."
  echo "Solange es geöffnet ist, bleibt der Mac für den iPhone-Test automatisch erreichbar; der Bildschirm darf sich ausschalten."
}

lan_health="$(/usr/bin/curl -fsS --max-time 1 "http://$LAN_IP:$IPHONE_PORT/api/health" 2>/dev/null || true)"
local_health="$(/usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:$IPHONE_PORT/api/health" 2>/dev/null || true)"
health="$lan_health"
[[ -z "$health" ]] && health="$local_health"

listener_pid="$(/usr/sbin/lsof -nP -tiTCP:"$IPHONE_PORT" -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1 || true)"
listener_dir=""
if [[ -n "$listener_pid" ]]; then
  listener_dir="$(/usr/sbin/lsof -a -p "$listener_pid" -d cwd -Fn 2>/dev/null | /usr/bin/awk '/^n/{sub(/^n/, ""); print; exit}')"
fi

if [[ "$lan_health" == *"\"version\":\"$CURRENT_VERSION\""* && "$lan_health" == *"\"release\":\"$CURRENT_RELEASE\""* && "$listener_dir" == "$PROJECT_DIR" ]]; then
  show_instructions "$IPHONE_PORT"
  read -r "?Zum Schließen die Eingabetaste drücken. "
  exit 0
fi

if [[ "$health" == *"\"service\":\"MO-Ni Inhaltsdienst\""* ]]; then
  if [[ -n "$listener_pid" && "$listener_dir" == "$PROJECT_ROOT"/Versionen/* ]]; then
    echo "Die bisherige MO-Ni-iPhone-Version wird durch Version $CURRENT_VERSION ersetzt."
    kill "$listener_pid"
    for attempt in {1..20}; do
      /usr/sbin/lsof -nP -iTCP:"$IPHONE_PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
      sleep 0.15
    done
  fi
fi

if /usr/sbin/lsof -nP -iTCP:"$IPHONE_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Die feste iPhone-Adresse ist durch einen anderen Dienst belegt. Bitte das zugehörige Programm schließen und den iPhone-Test erneut starten."
  read -r "?Zum Schließen die Eingabetaste drücken. "
  exit 1
fi

(sleep 1; show_instructions "$IPHONE_PORT") &
exec /usr/bin/caffeinate -i /usr/bin/env MONI_BIND_ADDRESS="0.0.0.0" MONI_PUBLIC_HOST="$LAN_IP" "$NODE_BIN" scripts/dev-server.mjs "$IPHONE_PORT"

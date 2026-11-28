#!/bin/zsh
set -euo pipefail

PROJECT_DIR="${0:A:h}"
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

cd "$PROJECT_DIR"

CURRENT_VERSION="0.14.0"
CURRENT_RELEASE="v0.14.0-release-6b"
SELECTED_PORT=""
PORT_CANDIDATES=(4213 4214 4215 4216)

open_app() {
  local app_url="http://localhost:$1/?version=$CURRENT_VERSION&release=$CURRENT_RELEASE&autoupdate=1&view=home"
  if [[ "${MONI_SKIP_BROWSER:-0}" == "1" ]]; then
    echo "MO-Ni Version $CURRENT_VERSION ist bereit: $app_url"
  elif [[ -d "/Applications/Google Chrome.app" ]]; then
    /usr/bin/open -na "Google Chrome" --args --new-window "$app_url"
  else
    /usr/bin/open "$app_url"
  fi
}

for candidate in "${PORT_CANDIDATES[@]}"; do
  health="$(/usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:$candidate/api/health" 2>/dev/null || true)"
  if [[ "$health" == *"\"version\":\"$CURRENT_VERSION\""* && "$health" == *"\"release\":\"$CURRENT_RELEASE\""* ]]; then
    listener_pid="$(/usr/sbin/lsof -nP -tiTCP:"$candidate" -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1 || true)"
    listener_dir=""
    if [[ -n "$listener_pid" ]]; then
      listener_dir="$(/usr/sbin/lsof -a -p "$listener_pid" -d cwd -Fn 2>/dev/null | /usr/bin/awk '/^n/{sub(/^n/, ""); print; exit}')"
    fi
    if [[ "$listener_dir" == "$PROJECT_DIR" ]]; then
      open_app "$candidate"
      exit 0
    fi
  fi
done

for candidate in "${PORT_CANDIDATES[@]}"; do
  if ! /usr/sbin/lsof -nP -iTCP:"$candidate" -sTCP:LISTEN >/dev/null 2>&1; then
    SELECTED_PORT="$candidate"
    break
  fi
done

if [[ -z "$SELECTED_PORT" ]]; then
  echo "Für die Vorschau ist gerade kein freier lokaler Anschluss verfügbar. Bitte ein älteres MO-Ni-Terminalfenster schließen und erneut starten."
  read -r "?Zum Schließen die Eingabetaste drücken. "
  exit 1
fi

(sleep 1; open_app "$SELECTED_PORT") &
exec "$NODE_BIN" scripts/dev-server.mjs "$SELECTED_PORT"

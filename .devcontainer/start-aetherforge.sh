#!/usr/bin/env bash
# Start only the trusted local workbench. Never pull images or execute uploaded code here.
set -euo pipefail
cd "$(dirname "$(dirname "$(readlink -f "$0")")")"
LOG_DIR="${HOME}/.local/state/aetherforge"
DATA_DIR="${HOME}/.local/share/aetherforge/assets"
mkdir -p "$LOG_DIR" "$DATA_DIR"
if node --input-type=module -e 'fetch("http://127.0.0.1:4545/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
  echo "[ÆTHERFORGE] Workbench already running on port 4545."
  exit 0
fi
if [ "${CODESPACES:-}" != "true" ]; then
  echo "[ÆTHERFORGE] This automatic cloud startup runs only inside GitHub Codespaces." >&2
  exit 2
fi
echo "[ÆTHERFORGE] Starting the GitHub-connected companion on private port 4545."
nohup env AETHERFORGE_PORT=4545 AETHERFORGE_CODESPACES_BIND=1 AETHERFORGE_DATA_DIR="$DATA_DIR" node apps/aetherforge-workbench/server.mjs > "$LOG_DIR/server.log" 2>&1 </dev/null &
for attempt in $(seq 1 25); do
  if node --input-type=module -e 'fetch("http://127.0.0.1:4545/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    echo "[ÆTHERFORGE] Ready: open the private port 4545 from the Codespaces Ports tab."
    echo "[ÆTHERFORGE] For Docker checks, run node .devcontainer/check-environment.mjs"
    exit 0
  fi
  sleep 1
done
echo "[ÆTHERFORGE] Startup failed; review $LOG_DIR/server.log" >&2
exit 1

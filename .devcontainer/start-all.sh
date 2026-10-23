#!/usr/bin/env bash
# ÆTHERFORGE cloud startup: reuse existing private Codespace, no rebuild, no auto pulls.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ "${CODESPACES:-}" != true ]]; then
  echo '[ÆTHERFORGE] This launcher is for your private GitHub Codespace.' >&2
  exit 2
fi
case "${1:-}" in
  '') commercial_mode='' ;;
  '--restart') commercial_mode='--restart' ;;
  *) echo 'Usage: bash .devcontainer/start-all.sh [--restart]' >&2; exit 2 ;;
esac
if [[ ! -f apps/aetherforge-workbench/server.mjs || ! -f apps/aetherforge-commercial/server.mjs ]]; then
  echo '[ÆTHERFORGE] Missing committed source. Verify the existing development branch and pull with git pull --ff-only.' >&2
  exit 2
fi
bash .devcontainer/start-aetherforge.sh
if [[ -n "$commercial_mode" ]]; then
  bash .devcontainer/start-commercial.sh "$commercial_mode"
else
  bash .devcontainer/start-commercial.sh
fi
echo '[ÆTHERFORGE] Both services launched/reused. Checking readiness...'
if ! node .devcontainer/check-environment.mjs; then
  echo '[ÆTHERFORGE] UI may still run; review the specific readiness checks above. No images are pulled automatically.' >&2
fi
echo '[ÆTHERFORGE] Open the PRIVATE Codespaces Ports tab: 4546 Commercial IDE; 4545 Companion.'
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  echo "[ÆTHERFORGE] Commercial: https://${CODESPACE_NAME}-4546.app.github.dev/"
  echo "[ÆTHERFORGE] Companion:  https://${CODESPACE_NAME}-4545.app.github.dev/"
fi
echo '[ÆTHERFORGE] Keep both ports Private. Browser projects are not pushed to GitHub automatically.'

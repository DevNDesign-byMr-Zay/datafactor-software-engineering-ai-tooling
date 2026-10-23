#!/usr/bin/env bash
# Commercial workbench is an opt-in Codespaces service; never a rebuild lifecycle prerequisite.
set -euo pipefail
cd "$(dirname "$(dirname "$(readlink -f "$0")")")"
if [ ! -f apps/aetherforge-commercial/server.mjs ]; then echo '[ÆTHERFORGE] Import the verified cloud ZIP first.' >&2; exit 2; fi
if [ "$CODESPACES" != 'true' ]; then echo '[ÆTHERFORGE] This launcher requires GitHub Codespaces.' >&2; exit 2; fi
mkdir -p "$HOME/.local/state/aetherforge" /workspaces/.aetherforge-data/assets /workspaces/.aetherforge-data/workspaces
if node -e 'fetch("http://127.0.0.1:4546/api/health").then(async r=>{const j=await r.json();process.exit(r.ok&&j.version==="1.5.0-cloud"?0:1)}).catch(()=>process.exit(1))' >/dev/null 2>&1; then echo '[ÆTHERFORGE] Commercial IDE already online: private port 4546'; exit 0; fi
if node -e 'fetch("http://127.0.0.1:4546/").then(()=>process.exit(0)).catch(()=>process.exit(1))' >/dev/null 2>&1; then echo '[ÆTHERFORGE] Port 4546 occupied by a different service.' >&2; exit 3; fi
nohup env AETHERFORGE_PORT=4546 AETHERFORGE_CODESPACES_BIND=1 AETHERFORGE_DATA_DIR=/workspaces/.aetherforge-data/assets AETHERFORGE_WORKSPACE_DIR=/workspaces/.aetherforge-data/workspaces node apps/aetherforge-commercial/server.mjs > "$HOME/.local/state/aetherforge/commercial.log" 2>&1 </dev/null &
for i in $(seq 1 25); do
 if node -e 'fetch("http://127.0.0.1:4546/api/health").then(async r=>{const j=await r.json();process.exit(r.ok&&j.version==="1.5.0-cloud"?0:1)}).catch(()=>process.exit(1))' >/dev/null 2>&1; then echo '[ÆTHERFORGE] Commercial IDE ready — open PRIVATE port 4546 in Codespaces Ports.'; exit 0; fi
 sleep 1
done
echo '[ÆTHERFORGE] Startup failed; see ~/.local/state/aetherforge/commercial.log' >&2
exit 1

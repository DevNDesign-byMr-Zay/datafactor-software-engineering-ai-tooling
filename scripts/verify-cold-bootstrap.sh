#!/usr/bin/env bash
# Run inside Dockerfile.bootstrap, before project dependencies have ever been installed.
set -euo pipefail

if [[ -e node_modules || -L node_modules ]]; then
  echo 'Refusing preinstalled node_modules in clean bootstrap' >&2
  exit 1
fi
for cache in "${NPM_CONFIG_CACHE:-/tmp/aetherforge-empty-npm}" "${PIP_CACHE_DIR:-/tmp/aetherforge-empty-pip}"; do
  if [[ -d "$cache" ]] && [[ -n "$(find "$cache" -mindepth 1 -print -quit)" ]]; then
    echo 'Registry cache must be empty before clean bootstrap' >&2
    exit 1
  fi
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)'
python - <<'PY'
import importlib.metadata
import sys
if sys.version_info < (3, 11):
    raise SystemExit('Python 3.11 or newer is required')
installed = {d.metadata['Name'].lower().replace('_', '-') for d in importlib.metadata.distributions()}
unexpected = installed - {'pip', 'setuptools', 'wheel'}
if unexpected:
    raise SystemExit('Refusing preinstalled Python project dependencies: ' + ', '.join(sorted(unexpected)))
PY
echo "Clean bootstrap starting: $(node --version); $(python --version); no project dependencies or registry caches"
make verify-fresh
echo "PASS: clean bootstrap verified from empty project dependencies and caches (${GITHUB_SHA:-local checkout})"

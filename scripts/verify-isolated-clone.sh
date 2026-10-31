#!/usr/bin/env bash
# Verify the exact tracked source snapshot in an independently built, network-isolated container.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
sha="$(git -C "$root" rev-parse HEAD)"
if [[ -n "${GITHUB_SHA:-}" && "$sha" != "$GITHUB_SHA" ]]; then
  echo "isolated checkout: expected GITHUB_SHA does not match checked-out HEAD" >&2
  exit 1
fi

tmp="$(mktemp -d)"
snapshot="$tmp/source"
image="aetherforge-isolated:${sha:0:12}-$$"
cleanup() {
  docker image rm --force "$image" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
mkdir -p "$snapshot"

# git archive excludes unstaged, ignored and untracked local files and does not copy .git.
git -C "$root" archive --format=tar "$sha" | tar -xf - -C "$snapshot"
test ! -e "$snapshot/.git"
for required in Dockerfile Makefile package-lock.json requirements.txt jest.config.js; do
  test -f "$snapshot/$required" || { echo "Missing tracked snapshot file: $required" >&2; exit 1; }
done
echo "Building a self-contained tracked checkout of $sha"

# Downloads happen only during the build. The maintained checks must all pass
# after Docker removes external network connectivity from the running container.
docker build --pull=false --tag "$image" "$snapshot"
docker run --rm --network none "$image" sh -ec 'test ! -e .git && make verify-offline'
echo "PASS: archived checkout verified without a runtime network connection ($sha)"

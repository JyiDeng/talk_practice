#!/bin/sh

set -eu

ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

echo "[auto-build] Checking dependency lock changes..."

NEED_INSTALL=0
if [ -f "pnpm-lock.yaml" ]; then
  if ! git diff --quiet HEAD@{1} HEAD -- pnpm-lock.yaml 2>/dev/null; then
    NEED_INSTALL=1
  fi
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  echo "[auto-build] Lockfile changed, running pnpm install..."
  pnpm install
fi

echo "[auto-build] Running build..."
pnpm run build
echo "[auto-build] Build finished. dist has been updated."

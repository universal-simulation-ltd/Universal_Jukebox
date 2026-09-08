#!/usr/bin/env bash
# Launch a local preview of Universal Jukebox.
# Runs the dev server in the foreground — press Ctrl-C to stop.
# macOS/Linux equivalent of preview.ps1.
#
#   Usage:  ./scripts/preview.sh [port]      (default 5204)
#
# 5204 is this app's port in the registry (Docs_UNI_SIM/dev-preview.md).
# --strictPort means a port clash fails loudly instead of silently serving
# this app on another app's port.
# First run installs deps if node_modules is missing.
#
# NOTE — nothing here needs the internet. The app reads music off your own disk
# and has no API of its own; only the shared navbar's sign-in state talks to
# anything, and it degrades to signed-out without complaint.
#
# ⚠️ To see anything you need a folder with music in it. Run this, then
# "Choose your music folder". On Chrome/Edge the folder is remembered between
# runs; on Firefox/Safari it is not, which is the app's central design
# constraint and worth checking on purpose rather than by accident.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PORT="${1:-5204}"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies (first run)…"
  npm install
fi

echo "Universal Jukebox → http://localhost:$PORT"
exec npm run dev -- --port "$PORT" --strictPort

# Launch a local preview of Universal Jukebox.
# Runs the dev server in the foreground — press Ctrl-C to stop.
# Windows equivalent of preview.sh.
#
#   Usage:  .\scripts\preview.ps1 [port]     (default 5204)
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
# ⚠️ To see anything you need a folder with music in it. `npm run dev` then
# "Choose your music folder". On Chrome/Edge the folder is remembered between
# runs; on Firefox/Safari it is not, which is the app's central design
# constraint and worth checking on purpose rather than by accident.

$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    $port = if ($args.Count -ge 1) { $args[0] } else { '5204' }

    if (-not (Test-Path 'node_modules')) {
        Write-Host "Installing dependencies (first run)..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }

    Write-Host "Universal Jukebox -> http://localhost:$port" -ForegroundColor Green
    npm run dev -- --port $port --strictPort
} finally {
    Pop-Location
}

#!/bin/bash
# The Apple Watch screenshots (store-assets/out/<locale>/watch/), from a paired
# iPhone + Apple Watch Ultra simulator — 422×514, Apple's APP_WATCH_ULTRA size.
#
#   store-assets/watch-capture.sh <iphone-sim-udid> <watch-sim-udid> <path/to/Debug-iphonesimulator/App.app>
#
# The phone app must be a DEBUG simulator build (its `-JukeboxTryExample` and
# `-JukeboxLanguage` launch arguments, JukeboxViewController.swift), and so must
# the watch app (`-JukeboxWatchScreen` / `-JukeboxWatchScript`, DebugRun.swift).
# Build with `npm run cap:sync` then
#   xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug \
#     -destination 'generic/platform=iOS Simulator' -derivedDataPath <dd> build
# Pair the two first: xcrun simctl pair <watch> <iphone>, and boot both.
#
# EVERYTHING ON SCREEN IS THE EXAMPLE LIBRARY (invented artists, records and
# sleeves — src/lib/exampleLibrary.ts), sent to the watch through the real
# phone ↔ watch path. Each language is a fresh install of the phone app run in
# that language, so the starter shelf is named in it too. The watch shows the
# Mac's clock: watchOS simulators refuse `simctl status_bar`.
set -u
P=$1; W=$2; APP=$3
OUT_ROOT=$(cd "$(dirname "$0")" && pwd)/out
wrun() { # screen script [args…] — the watch app, relaunched
  local screen=$1 script=$2; shift 2
  xcrun simctl terminate "$W" uk.co.unisim.jukebox.watchkitapp 2>/dev/null; sleep 1
  xcrun simctl launch "$W" uk.co.unisim.jukebox.watchkitapp -JukeboxWatchScreen "$screen" -JukeboxWatchScript "$script" "$@" >/dev/null
}
shoot() { xcrun simctl io "$W" screenshot "$1" >/dev/null 2>&1; }

for spec in "en-GB en-gb en-GB en_GB" "fr-FR fr fr fr_FR" "es-ES es es es_ES" "it-IT it it it_IT" \
            "de-DE de de de_DE" "pt-PT pt-PT pt-PT pt_PT" "pt-BR pt-BR pt-BR pt_BR" "tr-TR tr tr tr_TR"; do
  set -- $spec; LOC=$1; APPLANG=$2; WL=$3; WLOC=$4
  OUT=$OUT_ROOT/$LOC/watch; mkdir -p "$OUT"
  xcrun simctl uninstall "$P" uk.co.unisim.jukebox
  xcrun simctl install "$P" "$APP"; sleep 3
  xcrun simctl install "$W" "$APP/Watch/JukeboxWatch.app"
  xcrun simctl terminate "$W" uk.co.unisim.jukebox.watchkitapp 2>/dev/null; sleep 2
  # A watch app's message can have woken the phone app already, without these arguments.
  xcrun simctl terminate "$P" uk.co.unisim.jukebox 2>/dev/null; sleep 1
  xcrun simctl launch "$P" uk.co.unisim.jukebox -JukeboxLanguage "$APPLANG" -JukeboxTryExample YES >/dev/null
  sleep 6
  wrun home ""   # its hello tells the phone there is a watch to send to
  for _ in $(seq 1 30); do
    sleep 3
    LIB="$(xcrun simctl get_app_container "$P" uk.co.unisim.jukebox data)/Library/Application Support/jukebox-watch/library.json"
    node -e "process.exit(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).albums.length?0:1)" "$LIB" 2>/dev/null && break
  done
  sleep 8
  L=(-AppleLanguages "($WL)" -AppleLocale "$WLOC")
  wrun home "" "${L[@]}"; sleep 14
  wrun nowPlaying "album:4;wait:30" "${L[@]}"; sleep 15   # Quiet Rooms, ten seconds in
  shoot "$OUT/01-now-playing.png"
  for pair in home:02-home albums:03-albums artists:04-artists shelves:05-shelves; do
    wrun "${pair%%:*}" "" "${L[@]}"; sleep 8
    shoot "$OUT/${pair##*:}.png"
  done
  echo "$LOC done"
done

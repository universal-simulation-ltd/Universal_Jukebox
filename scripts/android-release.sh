#!/usr/bin/env bash
# Build the Google Play bundle for Universal Jukebox, signed with the upload
# key, and check it before it goes anywhere near the Play Console.
#
#   cd /Users/jamesmarkey/Github/UNISIM/Universal_Apps/Universal_Jukebox && npm run android:release
#
# Output: android/app/build/outputs/bundle/release/Universal-Jukebox-<version>-<code>.aab
#
# ⚠️ Run `npm run cap:sync` first, or the bundle carries the web assets from
# the last sync rather than your current build. This script does not sync,
# because syncing silently is how you ship yesterday's app.
#
# ⚠️ Bump the version in package.json (`npm version patch`) before every
# upload. build.gradle derives versionCode from it (major*10000 + minor*100 +
# patch), and Play refuses a code it has already seen — permanently, even from
# a deleted draft. This script never changes it.
#
# ⚠️ It signs with UNIVERSAL PDF's upload key, not a Jukebox one. Every suite
# app shares PDF's Play app-signing key so they can share the Android sign-in,
# and Play then expects PDF's upload key too: Ergo tried its own and the upload
# was refused as "signed with the wrong key" (2026-09-15). Never make another
# key.
#
# The upload key lives outside the repo, in ~/.unisim-keys (backed up to the
# ProtonDrive vault, "0. VAULT/Key Stores/"). Google re-signs what reaches users
# with its own app-signing key (Play App Signing), so a lost upload key can be
# reset through Play support, but that takes days.
set -euo pipefail

KEY_DIR="${UNISIM_KEYS:-$HOME/.unisim-keys}"
JKS="$KEY_DIR/universal-pdf-upload.jks"
PW_FILE="$KEY_DIR/universal-pdf-upload.password"
KEY_ALIAS=universal-pdf
if [[ ! -f "$JKS" || ! -f "$PW_FILE" ]]; then
  echo "Missing $JKS or $PW_FILE. Restore both from the ProtonDrive vault." >&2
  exit 1
fi

# The system JDK (25) breaks this Gradle with a bare "25.0.2"; Android Studio's
# bundled JBR 21 works.
STUDIO_JBR="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
if [[ -z "${JAVA_HOME:-}" && -d "$STUDIO_JBR" ]]; then
  export JAVA_HOME="$STUDIO_JBR"
fi

ANDROID_DIR="$(cd "$(dirname "$0")/../android" && pwd)"
cd "$ANDROID_DIR"

# local.properties (sdk.dir) is per-machine and gitignored, so a fresh checkout
# has none. Fall back to the SDK where Android Studio puts it on a Mac.
if [[ -z "${ANDROID_HOME:-}" && ! -f local.properties && -d "$HOME/Library/Android/sdk" ]]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

export ANDROID_KEYSTORE_PATH="$JKS"
ANDROID_KEYSTORE_PASSWORD="$(cat "$PW_FILE")"
export ANDROID_KEYSTORE_PASSWORD
export ANDROID_KEY_PASSWORD="$ANDROID_KEYSTORE_PASSWORD"
export ANDROID_KEY_ALIAS="$KEY_ALIAS"

./gradlew --no-daemon :app:bundleRelease

VERSION_NAME="$(node -p "require('../package.json').version")"
VERSION_CODE="$(node -p "const [a,b,c]=require('../package.json').version.split('.').map(Number); a*10000+b*100+c")"
OUT_DIR="app/build/outputs/bundle/release"
AAB="$OUT_DIR/Universal-Jukebox-$VERSION_NAME-$VERSION_CODE.aab"
cp "$OUT_DIR/app-release.aab" "$AAB"

# 1. Signed with the upload key, and nothing else.
"$JAVA_HOME/bin/jarsigner" -verify "$AAB" >/dev/null
CERT="$("$JAVA_HOME/bin/keytool" -printcert -jarfile "$AAB" | sed -n 's/^.*SHA256: //p' | head -1)"
KEY_CERT="$("$JAVA_HOME/bin/keytool" -list -v -keystore "$JKS" -storepass "$ANDROID_KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" | sed -n 's/^.*SHA256: //p' | head -1)"
if [[ "$CERT" != "$KEY_CERT" ]]; then
  echo "The bundle is not signed with the upload key ($CERT)." >&2
  exit 1
fi

# 2. The web assets are in there, and the app can actually start. A Capacitor
#    bundle whose assets/public is missing or empty opens to a white screen,
#    and nothing in the Gradle build says a word about it.
#
# 3. Every 64-bit native library supports 16 KB pages. Play rejects a bundle
#    whose .so files have 4 KB LOAD segments, and nothing warns about it. This
#    app ships few native libraries of its own, but Capacitor's dependencies
#    change under it, so the check stays.
python3 - "$AAB" <<'EOF'
import struct, sys, zipfile
bad = []
with zipfile.ZipFile(sys.argv[1]) as z:
    names = z.namelist()
    if 'base/assets/public/index.html' not in names:
        sys.exit('The bundle has no base/assets/public/index.html: run npm run cap:sync.')
    public = [n for n in names if n.startswith('base/assets/public/')]
    if len(public) < 5:
        sys.exit(f'Only {len(public)} files under base/assets/public — the web build did not go in.')
    for name in names:
        if not name.endswith('.so'):
            continue
        d = z.read(name)
        if d[4] != 2:  # 32-bit: no 16 KB requirement
            continue
        phoff = struct.unpack_from('<Q', d, 0x20)[0]
        size, count = struct.unpack_from('<HH', d, 0x36)
        for i in range(count):
            p = phoff + i * size
            if struct.unpack_from('<I', d, p)[0] == 1:  # PT_LOAD
                align = struct.unpack_from('<Q', d, p + 0x30)[0]
                if align < 0x4000:
                    bad.append(f'{name} (LOAD align {hex(align)})')
                    break
    print(f'   web assets: {len(public)} files under base/assets/public')
if bad:
    sys.exit('Not 16 KB-aligned:\n  ' + '\n  '.join(bad))
EOF

echo
echo "✅ $ANDROID_DIR/$AAB"
echo "   version $VERSION_NAME ($VERSION_CODE), upload cert SHA-256 $CERT"
echo "   64-bit native libraries: 16 KB-aligned"

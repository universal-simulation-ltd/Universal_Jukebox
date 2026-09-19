import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor wraps the same Vite build that ships to the web.
//
// ⚠️ `webDir` is the Vite output, and it must hold a `--mode desktop` build —
// NOT the production one. Capacitor serves this directory at the ROOT of its
// own origin, so the hosted `/jukebox/` base path makes every asset a 404 and
// the app never mounts. Build with `npm run cap:sync`, which does the right
// build and then verifies it (`scripts/verify-mobile-bundle.mjs`).
const config: CapacitorConfig = {
  appId: 'uk.co.unisim.jukebox',
  appName: 'Universal Jukebox',
  webDir: 'dist',
  // Android 15+ lays the window out under the status bar and the camera
  // cutout (edge-to-edge is enforced from targetSdk 35, with no opt-out at 36),
  // and no viewport meta tag moves an Android window. This margins the web
  // view by the system bars and the cutout. "auto", not "force": Android 14 and
  // below aren't edge-to-edge and would take a second inset. The margin shows
  // the WINDOW background, which is why values/styles.xml pins it light.
  android: { adjustMarginsForEdgeToEdge: 'auto' },
  ios: {
    // ⚠️ The web app is a full-bleed player with its own chrome, and it already
    // ships `viewport-fit=cover` in index.html. `contentInset: 'never'` stops
    // WKWebView adding its own inset on top of the safe-area padding the CSS is
    // already paying, which otherwise leaves a dead band under the player bar.
    contentInset: 'never',
  },
}

export default config

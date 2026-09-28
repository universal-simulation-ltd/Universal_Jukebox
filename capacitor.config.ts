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
  // cutout (edge-to-edge is enforced from targetSdk 35, with no opt-out at 36).
  // Capacitor 8 removed `android.adjustMarginsForEdgeToEdge` in favour of its
  // core SystemBars plugin, which reads index.html's `viewport-fit=cover`: on a
  // WebView from Chromium 140 the page is drawn edge-to-edge and
  // `env(safe-area-inset-*)` carries the real insets — which this app already
  // pads by, exactly as on iOS. On an older WebView, where those env values
  // read 0, it pads the web view natively instead and the strips show the
  // WINDOW background, which values/styles.xml pins light.
  plugins: {
    SystemBars: {
      // Dark glyphs, for the light default theme ("LIGHT" means "for a light
      // background"). Left at DEFAULT it would follow the phone's dark mode —
      // white glyphs on the white strip.
      style: 'LIGHT',
      // index.html says cover; saying so here spares a layout jump on start.
      initialViewportFitValueHint: 'cover',
    },
  },
  ios: {
    // ⚠️ The web app is a full-bleed player with its own chrome, and it already
    // ships `viewport-fit=cover` in index.html. `contentInset: 'never'` stops
    // WKWebView adding its own inset on top of the safe-area padding the CSS is
    // already paying, which otherwise leaves a dead band under the player bar.
    contentInset: 'never',
  },
}

export default config

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
  ios: {
    // ⚠️ The web app is a full-bleed player with its own chrome, and it already
    // ships `viewport-fit=cover` in index.html. `contentInset: 'never'` stops
    // WKWebView adding its own inset on top of the safe-area padding the CSS is
    // already paying, which otherwise leaves a dead band under the player bar.
    contentInset: 'never',
  },
}

export default config

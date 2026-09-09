import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// Served at opensource.unisim.co.uk/jukebox/ behind the portal Worker, so
// production assets live under /jukebox/.
//
// The PWA makes the SHELL work offline, and here that is close to the whole
// app: the library index and the artwork live in IndexedDB and the audio is
// read off the local disk, so a Jukebox tab with its folder permission still
// granted plays music with the network unplugged. Nothing in this app has a
// server to be offline FROM — there is no API, no sync and no upload.
export default defineConfig(({ mode }) => {
  // ⚠️ `desktop` is the CAPACITOR/native build, and the name is inherited from
  // the rest of the suite (Universal QR, PDF, Images…) rather than chosen here.
  // It differs from the production web build in exactly two ways, and both are
  // load-bearing:
  //
  //   1. `base` is './' — relative. Capacitor serves the copied bundle from the
  //      ROOT of `capacitor://localhost`, so the production `/jukebox/` prefix
  //      makes every asset URL a 404, no module script runs, and the app is a
  //      white screen that Xcode reports as BUILD SUCCEEDED. `npm run
  //      check:mobile-bundle` exists to catch exactly that.
  //   2. No service worker. VitePWA is skipped entirely: a worker inside the
  //      app bundle would cache the HOSTED origin's URLs into the native app,
  //      and its presence in the copied directory is the tell that a web build
  //      was shipped by mistake.
  const isDesktop = mode === 'desktop';
  const BASE_PATH = isDesktop ? './' : mode === 'production' ? '/jukebox/' : '/';
  return {
    base: BASE_PATH,
    // 5204 is this app's slot in the registry (Docs_UNI_SIM/dev-preview.md), and
    // `strictPort` means a clash fails loudly rather than silently serving this
    // app on another one's port — which is how two apps end up sharing a
    // localStorage origin and each wondering why its settings keep changing.
    server: { port: 5204, strictPort: true },
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: {
      exclude: ['@unisim/sdk'],
      // ⚠️ Dev only, and REQUIRED — copied from PalsPayIn, where the reason is
      // written out at length. The SDK's QR component reaches qr-code-styling
      // through a dynamic import; that package ships UMD with no ESM build, and
      // with @unisim/sdk excluded above Vite serves it raw, where the UMD
      // wrapper dies on "Cannot set properties of undefined". The component
      // catches it, so the only symptom is a plate that never draws.
      include: ['qr-code-styling'],
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(isDesktop ? [] : [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'unisim-icon.png', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Universal Jukebox',
          short_name: 'Jukebox',
          // ⚠️ The name never travels alone. See the note in the SDK catalogue
          // entry: every surface carrying "Universal Jukebox" says what it DOES
          // in the same breath, so the product reads as the utility it is.
          description: 'Plays your whole music library, in your browser. Nothing uploaded, no account.',
          theme_color: '#0f172a',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: BASE_PATH,
          scope: BASE_PATH,
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'unisim-icon.png', sizes: '128x128', type: 'image/png' },
          ],
        },
        workbox: {
          navigateFallback: `${BASE_PATH}index.html`,
        },
        devOptions: { enabled: false },
      })]),
    ],
  };
});

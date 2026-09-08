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
  const BASE_PATH = mode === 'production' ? '/jukebox/' : '/';
  return {
    base: BASE_PATH,
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
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'unisim-icon.png', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Universal Jukebox',
          short_name: 'Jukebox',
          // ⚠️ The name never travels alone. See the note in the SDK catalogue
          // entry: every surface carrying "Universal Jukebox" says what it DOES
          // in the same breath, so the product reads as the utility it is.
          description: 'Plays the music already on your device. Nothing uploaded, no account.',
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
      }),
    ],
  };
});

import React from 'react'
import ReactDOM from 'react-dom/client'
import { UniversalProvider } from '@unisim/sdk'
import App from './App'
import { startApplyingSettings } from './lib/applySettings'
import { logNativeDiagnostics } from './lib/nativeDiagnostics'
import './index.css'
import { installShortcuts } from './lib/shortcuts'

// Universal Jukebox never sends a byte of anyone's music anywhere. We still
// mount <UniversalProvider> so the shared navbar works and, when the visitor is
// signed in on .unisim.co.uk, the navbar shows their profile.
//
// The fallback is the REAL public suite project (publishable anon key — safe to
// ship; RLS is the security boundary). Env overrides.
//
// ⚠️ 'jukebox' AND THE product_code ENUM — read before shipping.
//
// `useUsageTracker()` inserts into usage_events with `product: config.product`,
// and product_code is a Postgres ENUM. A value that isn't in the enum makes
// every insert FAIL — silently, and only for SIGNED-IN visitors, so the app
// looks perfect in the state most people use it in. Universal Converter and
// Universal USB both shipped that way and lost every usage event from launch
// until migration 0107 caught it.
//
// Both halves were done BEFORE any of this app existed, which is why there is
// no cast on the `product` line below:
//
//   1. `alter type product_code add value if not exists 'jukebox';` is
//      migration `0150_product_code_jukebox.sql` in backoffice/universal-platform.
//      (It has to be its own migration — Postgres will not let a newly added
//      enum value be USED in the transaction that adds it.)
//   2. 'jukebox' is in `ProductCode` (packages/sdk/src/types.ts), in
//      `SuiteProductId` and `DEFAULT_UNIVERSAL_APPS_PRODUCTS`
//      (packages/sdk/src/SuiteSwitcher.tsx), and in `UNIVERSAL_APP_PRODUCTS`
//      (packages/sdk/src/provider.tsx — the list that keeps this app's language
//      preference from being shared with the Assess suite).
//
// So `product: 'jukebox'` type-checks *because the union really contains it* —
// not because a cast talked the compiler out of an objection. Never write
// `as unknown as ProductCode` in this repo: that cast is exactly what let the
// Converter/USB bug survive to production. If the type ever fights you here,
// the type is telling you the enum is missing a value — go add it.

const universalConfig = {
  supabaseUrl: import.meta.env.VITE_PLATFORM_SUPABASE_URL || 'https://rygfxgalojojppxmhddo.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z2Z4Z2Fsb2pvanBweG1oZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTY4MjUsImV4cCI6MjA5NDMzMjgyNX0.hLy_vt9vY_rdPKF3nL32yAuMCD604E3CH5VM7D7CaNE',
  product: 'jukebox' as const,
  cookieDomain: import.meta.env.PROD ? '.unisim.co.uk' : undefined,
}

// Settings reach the audio layer through one subscription, set up before the
// first render so a boost or a fade chosen last visit is already in force when
// the first track plays.
startApplyingSettings()

// Inside the native shell only, and no-ops everywhere else. See the header of
// `lib/nativeDiagnostics.ts`: a device build has no console of its own, and the
// first two bugs this app shipped with were both invisible from a Mac.
logNativeDiagnostics()
installShortcuts()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UniversalProvider config={universalConfig}>
      <App />
    </UniversalProvider>
  </React.StrictMode>
)

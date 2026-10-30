import React from 'react'
import ReactDOM from 'react-dom/client'
import { UniversalProvider } from '@unisim/sdk'
import App from './App'
import { I18nRoot } from './i18n'
import { startApplyingSettings } from './lib/applySettings'
import { useLibraryStore } from './stores/libraryStore'
import { logNativeDiagnostics } from './lib/nativeDiagnostics'
import { watchAudioRoute } from './lib/nowPlayingNative'
import './index.css'
import { installShortcuts } from './lib/shortcuts'
import { followThemeWithStatusBar } from './lib/systemBars'
import { isNativeShell } from './lib/nativeFile'
// Counts plays for the Most played shelf from the first song on (`lib/playCounting.ts`).
import './lib/playCounting'

// Universal Jukebox never sends a byte of anyone's music anywhere. We still
// mount <UniversalProvider> so the shared navbar, suite switcher and language
// work. There is no sign-in (see `noAccounts` below) — the website only
// recognises a suite session someone already has.
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
  // ⚠️ No sign-in anywhere: phone, website or desktop (James, 2026-10-20, "avoid
  // logins except where it really improves experience"; the phone app went
  // first, 2026-10-10). Nothing in Jukebox needs an account. The backup FILE is
  // the feature (`lib/backupIo.ts`) and works without one; the only thing a
  // sign-in ever added was an online copy of that same backup in
  // `app_settings_backups`, which had no rows on prod when it was removed.
  //
  // ⚠️ BUT THE WEBSITE RECOGNISES SOMEBODY ALREADY SIGNED IN (James,
  // 2026-10-28, the suite rule of 2026-10-26: "If signed in it should be clear
  // from the personalisation — 'Bradley's Book'"). Signed in on the hub or any
  // unisim.co.uk app, the shared cookie session makes the bar say "James’
  // Jukebox" and puts Your Universal ID in Tune this app (`accountInTune` and
  // `personalTitle` on the navbar, App.tsx). Still nothing asks anyone to sign
  // in, and Jukebox stores nothing on the account. Universal PDF's website is
  // the template.
  //
  // The PHONE APPS do the same with the suite's shared phone session (James,
  // 2026-10-28: "Phone apps should have the silent sign in check too … for
  // 'Bradley's Jukebox'"): the SDK's UnisimSuiteAuth plugin reads the Keychain
  // group (iOS, App.entitlements) or the signed ContentProviders (Android)
  // every suite app shares, so signed in to BlackBook on the phone = "Bradley’s
  // Jukebox" in the phone's top bar (`Brand`, native/NativeApp.tsx) and Your
  // Universal ID in Tune. The phone screens never mount <UsageTracker /> (it
  // is in App.tsx's WebApp), so the phones still send no usage row.
  //
  // So `noAccounts` only for the Windows app: the `desktop` build mode outside
  // a native shell (`cap:sync` uses the same mode for the phones). It runs
  // from disk, where neither the unisim.co.uk cookie nor a phone's shared
  // store reaches it.
  noAccounts: import.meta.env.MODE === 'desktop' && !isNativeShell(),
  // Off everywhere, as `noAccounts` had it until now: the website did without
  // the SDK's anonymous daily open count from 2026-10-20 (0.187.0: once a day,
  // product + kind of device, no identifier), and recognising a session is no
  // reason to start sending it again.
  openCount: false,
}

// ⚠️ THE LIBRARY IS READ BEFORE REACT RENDERS, not from an effect afterwards.
//
// Nothing is shown until this resolves (`lib/boot.ts`: the app used to flash its
// landing page while the read was in flight), so the read is the length of the
// blank — and starting it here overlaps it with mounting the tree rather than
// queueing it behind. `hydrate()` is memoised, so `App`'s own call is the same
// promise and the database is still read exactly once.
void useLibraryStore.getState().hydrate()

// Settings reach the audio layer through one subscription, set up before the
// first render so a boost or a fade chosen last visit is already in force when
// the first track plays.
startApplyingSettings()

// Inside the native shell only, and no-ops everywhere else. See the header of
// `lib/nativeDiagnostics.ts`: a device build has no console of its own, and the
// first two bugs this app shipped with were both invisible from a Mac.
logNativeDiagnostics()
void watchAudioRoute()
installShortcuts()
// The status-bar glyphs flip with Light/Dark where the page is under the bar.
followThemeWithStatusBar()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UniversalProvider config={universalConfig}>
      <I18nRoot>
        <App />
      </I18nRoot>
    </UniversalProvider>
  </React.StrictMode>
)

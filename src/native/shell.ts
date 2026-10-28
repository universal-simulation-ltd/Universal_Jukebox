// shell.ts — does this run the phone screens (`src/native/`)?
//
// The phone app (iOS / Android) has screens of its own, built for a phone
// rather than the website squeezed onto one (James, 2026-10-10). A tab bar, a mini
// player above it, the record full screen; no navbar, suite switcher, actions
// menu or sign-in. The website, and the Electron desktop app, keep `App.tsx`'s
// own layout and never download this folder (it is lazy-loaded). Nobody signs
// in to Jukebox anywhere; the phones and the website only recognise a suite
// session someone already has (`noAccounts` in main.tsx), so this decides
// nothing about accounts.
//
// ⚠️ NOT `isNativeShell()`. That one answers "can I use the native file
// plugins?" and is read all over the app; this one only picks the screens. In
// `npm run dev`, `?app` shows the phone screens in a browser (it sticks for the
// tab; `?app=0` turns it off) while the files still come from the browser's own
// pickers — so the dev flag must never leak into `isNativeShell()`.

import { isNativeShell } from '../lib/nativeFile'

const DEV_KEY = 'jukebox:dev-phone-screens'

/** Set by `store-assets/generate.mjs` before the app loads, to capture the phone screens. */
const CAPTURE_KEY = 'jukebox:store-capture'

export function phoneScreens(): boolean {
  if (isNativeShell()) return true
  if (typeof window === 'undefined') return false
  // The store screenshots are the phone screens, captured from the built
  // bundle in a browser. A session flag only a script sets before load —
  // never the address — so nobody on the website lands here by accident.
  try {
    if (sessionStorage.getItem(CAPTURE_KEY) === '1') return true
  } catch { /* no storage: not a capture */ }
  if (!import.meta.env.DEV) return false
  try {
    const q = new URLSearchParams(window.location.search).get('app')
    if (q !== null) sessionStorage.setItem(DEV_KEY, q === '0' ? '0' : '1')
    return sessionStorage.getItem(DEV_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Back one screen: the history entry `lib/route.ts` pushed, or — on a launch
 * that reopened straight onto this screen, with nothing behind it — the
 * screen above it.
 */
export function goBack(fallback: () => void): void {
  const depth = (history.state as { jbDepth?: unknown } | null)?.jbDepth
  if (typeof depth === 'number' && depth > 0) history.back()
  else fallback()
}

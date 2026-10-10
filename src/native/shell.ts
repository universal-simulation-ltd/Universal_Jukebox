// shell.ts — does this run the phone screens (`src/native/`)?
//
// The phone app (iOS / Android) has screens of its own, built for a phone
// rather than the website squeezed onto one (James, 2026-10-10). A tab bar, a mini
// player above it, the record full screen; no navbar, suite switcher, actions
// menu or sign-in. The website, and the Electron desktop app, keep `App.tsx`'s
// own layout and never download this folder (it is lazy-loaded).
//
// ⚠️ NOT `isNativeShell()`. That one answers "can I use the native file
// plugins?" and is read all over the app; this one only picks the screens. In
// `npm run dev`, `?app` shows the phone screens in a browser (it sticks for the
// tab; `?app=0` turns it off) while the files still come from the browser's own
// pickers — so the dev flag must never leak into `isNativeShell()`.

import { isNativeShell } from '../lib/nativeFile'

const DEV_KEY = 'jukebox:dev-phone-screens'

export function phoneScreens(): boolean {
  if (isNativeShell()) return true
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
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

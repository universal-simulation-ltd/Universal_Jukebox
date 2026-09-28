// The status bar's own glyphs (clock, signal, battery) follow the app's theme.
//
// ⚠️ WHY THIS EXISTS (Capacitor 8, 2026-09-28). The glyphs are drawn by the OS
// over whatever sits at the very top of the screen, and Capacitor 8's core
// SystemBars plugin decides what that is:
//
// - iOS, and Android with a WebView from Chromium 140: the page is drawn under
//   the status bar (`viewport-fit=cover`) and pads itself by
//   `env(safe-area-inset-top)`, so the glyphs sit over the NAVBAR — white in
//   Light, slate in Dark.
// - Android with an older WebView: SystemBars pads the web view natively and
//   the glyphs sit over the WINDOW background, which values/styles.xml pins
//   white whatever the theme.
//
// capacitor.config.ts starts the glyphs dark (`style: 'LIGHT'`, "for a light
// background"), right for the Light default and for the pinned strip. A user
// who picks Dark would otherwise get dark glyphs on the dark navbar — the
// clock simply gone. So when, and only when, the page really is under the bar,
// the glyphs are flipped with the theme.
//
// ⚠️ Through SystemBars, never `@capacitor/status-bar`: SystemBars re-applies
// its own stored style on every Android configuration change and would revert
// the other plugin's the first time the phone turned. And Capacitor's names
// read backwards: `Dark` means "for a dark background", i.e. LIGHT glyphs.

import { isNativeShell, nativePlatform } from './nativeFile'

/** Is the page drawn under the status bar (so the navbar is behind the glyphs)? */
export function pageUnderStatusBar(platform: string, userAgent: string): boolean {
  if (platform === 'ios') return true
  if (platform !== 'android') return false
  // SystemBars' own rule: edge-to-edge only on a WebView from Chromium 140.
  const major = Number(/Chrome\/(\d+)/.exec(userAgent)?.[1] ?? 0)
  return major >= 140
}

/** Keeps the status-bar glyphs legible over the theme. No-op off the native shell. */
export function followThemeWithStatusBar(): void {
  if (!isNativeShell()) return
  const underBar = pageUnderStatusBar(nativePlatform(), navigator.userAgent)
  if (!underBar) return
  let last: boolean | null = null
  const apply = () => {
    const dark = document.documentElement.classList.contains('dark')
    if (dark === last) return
    last = dark
    void (async () => {
      try {
        const { SystemBars, SystemBarsStyle } = await import('@capacitor/core')
        await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
      } catch {
        /* Cosmetic: a status bar that cannot be styled never breaks a render. */
      }
    })()
  }
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  apply()
}

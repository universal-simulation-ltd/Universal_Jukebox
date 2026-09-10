// One line of ground truth, logged once, inside the native shell only.
//
// ⚠️ THIS EXISTS BECAUSE A PHONE BUILD IS DEBUGGED BLIND. There is no devtools
// console on a device build, `console.log` from the WebView is the only thing
// that reaches `xcrun devicectl device process launch --console`, and the two
// bugs this app shipped with on day one were both invisible from the Mac: the
// landing art clipped under the navbar (a safe-area inset that is 0 in every
// emulator) and a Scan button that appeared to do nothing (an empty folder,
// reported as success). Both cost a build cycle to even SEE.
//
// So the app says what it found, once, in a form that can be read off a log:
// the insets, the geometry of the two elements that were wrong, whether the
// engine honours `element.volume`, and how many files are actually in the music
// folder. Nothing here changes behaviour.

import { isNativeShell, nativePlatform, walkNativeLibrary } from './nativeFile'
import { canSetElementVolume } from './volumeSupport'

/** Reads a CSS `env()` value in px, or null where the platform has none. */
function inset(side: 'top' | 'bottom'): number | null {
  try {
    const probe = document.createElement('div')
    probe.style.position = 'fixed'
    probe.style.visibility = 'hidden'
    probe.style.height = `env(safe-area-inset-${side})`
    document.body.appendChild(probe)
    const px = probe.getBoundingClientRect().height
    probe.remove()
    return Math.round(px)
  } catch {
    return null
  }
}

function rect(selector: string): string | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return `${Math.round(r.top)}..${Math.round(r.bottom)} (h${Math.round(r.height)})`
}

/**
 * Log the shell's own account of itself.
 *
 * ⚠️ Waits a beat rather than measuring immediately: the navbar and the landing
 * art are React children, and geometry read during the first paint is the
 * geometry of an empty page. A `requestAnimationFrame` pair is enough for the
 * layout that actually shipped.
 */
export function logNativeDiagnostics(): void {
  if (!isNativeShell()) return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void report()
    })
  })
}

async function report(): Promise<void> {
  const lines: Record<string, unknown> = {
    platform: nativePlatform(),
    // The two that decide whether the chrome sits under the Dynamic Island.
    safeAreaTop: inset('top'),
    safeAreaBottom: inset('bottom'),
    innerHeight: window.innerHeight,
    visualViewport: window.visualViewport
      ? `${Math.round(window.visualViewport.height)} @${Math.round(window.visualViewport.offsetTop)}`
      : null,
    // The elements the day-one clipping report was about.
    navbar: rect('header') ?? rect('[data-unisim-navbar]'),
    main: rect('main'),
    landingArt: rect('main svg'),
    // Whether the fades and the crossfade can work here at all.
    canSetVolume: canSetElementVolume(),
  }

  try {
    const entries = await walkNativeLibrary()
    lines.musicFolderFiles = entries.length
    lines.musicFolderSample = entries.slice(0, 3).map((e) => e.path)
  } catch (err) {
    lines.musicFolderError = String(err)
  }

  console.log(`[jukebox:diag] ${JSON.stringify(lines)}`)
}

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
import { graphExists } from './audioGraph'
import { describeEvents, installLifecycleLog, noteEvent } from './bgLog'
import { describeMediaSession } from './mediaSession'
import { effectsState } from './crackle'

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

/** Is a native plugin of this JS name registered in the shell? */
function pluginRegistered(name: string): boolean {
  const headers = (globalThis as { Capacitor?: { PluginHeaders?: { name?: string }[] } }).Capacitor
    ?.PluginHeaders
  return Array.isArray(headers) && headers.some((h) => h?.name === name)
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
  watchBackgroundPlayback()
  installLifecycleLog()
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
    // Whether the native shell registered the folder-choice plugin — the switch
    // that turns "choose your own music folder" on (`usesChosenFolder` in
    // `nativeFile.ts` reads the same headers). On iOS it is registered by
    // `JukeboxViewController`; if this is false there, the picker cannot appear
    // however correct the web code is.
    chosenFolderPlugin: pluginRegistered('JukeboxMusicFolder'),
    // The search box's REAL font size on the device. iOS zooms the page into a
    // field under 16px; the floor in `index.css` once matched nothing for a
    // week because of a line break in its selector. This says whether it is
    // applying, on the phone, rather than in an emulator.
    searchFontPx: (() => {
      const box = document.querySelector('input[type="search"]')
      return box ? getComputedStyle(box).fontSize : 'no search box on this screen'
    })(),
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    // What happened last time the app went to the background — saved, because
    // the live log did not survive the trip (`lib/bgLog.ts`).
    lastBackground: describeEvents().slice(-900),
    // The Music library source and the native audio importer (both iOS).
    musicLibraryPlugin: pluginRegistered('JukeboxAppleMusic'),
    fileImportPlugin: pluginRegistered('JukeboxFileImport'),
    // The lock screen showed play/pause only (2026-09-10): does the WebView have
    // a Media Session, and which of our actions did it accept?
    mediaSession: describeMediaSession(),
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

/**
 * What the music does while the app is off screen, logged as it happens.
 *
 * ⚠️ Background playback cannot be checked from a Mac — no emulator runs the
 * iOS rules that stop it — and the failure is silence, which logs nothing on its
 * own. So while the page is hidden this reports every few seconds whether the
 * deck is paused and whether its position is still moving, and says so again on
 * the way back. `[jukebox:bg]` lines, read off `devicectl … --console`.
 */
function watchBackgroundPlayback(): void {
  let timer: number | null = null
  let hiddenAt = 0
  let startSec = 0
  const deck = () => {
    const decks = [...document.querySelectorAll<HTMLAudioElement>('audio[data-jukebox-audio]')]
    return decks.find((a) => !a.paused) ?? decks[0] ?? null
  }
  const state = () => {
    const a = deck()
    return a ? { paused: a.paused, sec: Math.round(a.currentTime * 10) / 10 } : { paused: true, sec: 0 }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now()
      startSec = state().sec
      console.log(`[jukebox:bg] hidden ${JSON.stringify({ ...state(), graph: graphExists() })}`)
      // Saved as well as printed: what the lock screen is being told, at the
      // moment it takes over — read back from the next launch's `lastBackground`.
      noteEvent('media', { session: describeMediaSession(), fx: effectsState() })
      console.log(`[jukebox:bg] media session ${describeMediaSession()} fx=${effectsState()}`)
      timer = window.setInterval(() => {
        const s = state()
        console.log(`[jukebox:bg] +${Math.round((Date.now() - hiddenAt) / 1000)}s ${JSON.stringify({ ...s, moved: Math.round((s.sec - startSec) * 10) / 10 })}`)
      }, 5000)
    } else {
      if (timer !== null) window.clearInterval(timer)
      timer = null
      const s = state()
      console.log(`[jukebox:bg] visible after ${Math.round((Date.now() - hiddenAt) / 1000)}s ${JSON.stringify({ ...s, moved: Math.round((s.sec - startSec) * 10) / 10 })}`)
    }
  })
}

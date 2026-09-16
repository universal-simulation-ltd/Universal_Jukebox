// "Keep awake": the screen does not dim or lock while Now Playing is open, so
// the lyrics can be read along to without touching the phone (James,
// 2026-09-16: "stopping the phone from entering lock so you can keep seeing the
// lyrics").
//
// Two ways to hold the screen on, and the native one wins where it exists:
//   - `JukeboxKeepAwake` in the phone apps (`ios/App/App/KeepAwakePlugin.swift`
//     sets the idle timer off; Android's `KeepAwakePlugin.java` sets the
//     window's FLAG_KEEP_SCREEN_ON);
//   - the Screen Wake Lock API everywhere else — the browser and the desktop
//     app (Electron is Chromium, which has it).
//
// ⚠️ NATIVE FIRST, NOT "WAKE LOCK IF IT EXISTS". A WKWebView can report
// `navigator.wakeLock` and still not hold the screen on, and a switch that says
// "on" while the phone locks anyway is the worst version of this control. The
// idle timer is the thing iOS itself honours.
//
// ⚠️ ONLY ON NOW PLAYING. The setting is remembered, but it is in force only
// while that page is on screen (`useKeepAwake` there): a screen that never
// locks anywhere in the app is a flat battery the person did not ask for.
//
// ⚠️ A BROWSER DROPS THE LOCK WHENEVER THE PAGE IS HIDDEN — switching tab, the
// phone's app switcher — and never takes it back by itself, so it is asked for
// again each time the page comes back. The native hold needs no such care: the
// idle timer and the window flag only ever apply while the app is in front.

import { useEffect } from 'react'
import { noteEvent } from './bgLog'
import { pluginRegistered } from './nativePlugins'

const NAME = 'JukeboxKeepAwake'

interface KeepAwakePlugin {
  set(options: { on: boolean }): Promise<void>
}

let plugin: KeepAwakePlugin | null = null

async function native(): Promise<KeepAwakePlugin> {
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    plugin = registerPlugin<KeepAwakePlugin>(NAME)
  }
  return plugin
}

function hasWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/** Whether this engine can hold the screen on at all — the button is absent where it cannot. */
export function canKeepAwake(): boolean {
  return pluginRegistered(NAME) || hasWakeLock()
}

/** Holds the screen on while `active`, and lets it go when not (or on unmount). */
export function useKeepAwake(active: boolean): void {
  useEffect(() => {
    if (!active) return

    if (pluginRegistered(NAME)) {
      void native()
        .then((p) => p.set({ on: true }))
        .catch((error) => noteEvent('keep-awake', { failed: String(error) }))
      return () => {
        void native().then((p) => p.set({ on: false })).catch(() => {})
      }
    }

    if (!hasWakeLock()) return
    let sentinel: WakeLockSentinel | null = null
    let done = false
    const hold = () => {
      if (done || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          if (done) void lock.release()
          else sentinel = lock
        })
        .catch((error) => noteEvent('keep-awake', { failed: String(error) }))
    }
    hold()
    document.addEventListener('visibilitychange', hold)
    return () => {
      done = true
      document.removeEventListener('visibilitychange', hold)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}

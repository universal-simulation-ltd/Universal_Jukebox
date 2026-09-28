import { pluginRegistered } from './nativePlugins'

// A small bump under the thumb when something physical happens on screen —
// the needle landing, a record settling on the deck, a record put on a shelf.
//
// ⚠️ `navigator.vibrate` ALONE DOES NOTHING ON AN IPHONE. WebKit has never
// shipped it, in Safari or in the app's web view, so the one haptic this app
// had (the deck's long press) was felt on Android and nowhere else. The native
// shells go through Capacitor's Haptics plugin (the Taptic Engine on iOS,
// `HapticFeedbackConstants` on Android); the web keeps `vibrate`, which Chrome
// on Android honours and everything else ignores.
//
// ⚠️ No setting of its own. iOS's "System Haptics" switch and Android's
// "Touch feedback" already govern both paths, and a second switch in this app
// that the system one silently overrules would be a control that lies.

/**
 * - `tick` — a detent: a record clicking into place, a step of a drag.
 * - `tap` — a light knock: the needle on the record, a long press answered.
 * - `thunk` — something landing with weight: a record put on a shelf.
 */
export type HapticKind = 'tick' | 'tap' | 'thunk'

const VIBRATE_MS: Record<HapticKind, number> = { tick: 5, tap: 10, thunk: 18 }

type HapticsModule = typeof import('@capacitor/haptics')
let plugin: Promise<HapticsModule | null> | null = null

function nativeHaptics(): Promise<HapticsModule | null> {
  if (!plugin) {
    plugin = pluginRegistered('Haptics')
      ? import('@capacitor/haptics').catch(() => null)
      : Promise.resolve(null)
  }
  return plugin
}

export function haptic(kind: HapticKind): void {
  void nativeHaptics().then((mod) => {
    if (!mod) {
      try {
        navigator.vibrate?.(VIBRATE_MS[kind])
      } catch {
        // A browser that has the method and refuses it (no user gesture yet).
      }
      return
    }
    const { Haptics, ImpactStyle } = mod
    const done =
      kind === 'tick'
        ? Haptics.selectionChanged()
        : Haptics.impact({ style: kind === 'thunk' ? ImpactStyle.Medium : ImpactStyle.Light })
    done.catch(() => {})
  })
}

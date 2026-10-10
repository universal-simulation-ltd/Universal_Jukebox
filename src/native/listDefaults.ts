// listDefaults.ts — what the phone app's lists open with.
//
// Tapping a list option (A–Z / Random / Genre, the layout, Full albums, Min. 3)
// changes it for now. HOLDING it makes the current choice the default, and the
// app opens with it next time (James, 2026-10-11: "long press on random when
// it's chosen would set its default state as random and open with that
// setting next launch too"). The defaults live in `Settings.listDefaults`, so
// Tune this app's Reset to defaults clears them with everything else.
//
// The live settings (libraryOrder, libraryColumns, fullAlbumsOnly, …) are still
// what every list reads, the website's components included; at launch they are
// put back to these defaults (`applyListDefaults`), which is what makes a tap
// last only until the app is next opened.

import { useRef } from 'react'
import { haptic } from '../lib/haptics'
import { DEFAULTS, useSettingsStore, type ListDefaults, type Settings } from '../stores/settingsStore'

/** How long a press is held before it sets a default. */
export const HOLD_MS = 550

function snapshot(s: Settings): ListDefaults {
  return {
    libraryOrder: { ...s.libraryOrder },
    libraryColumns: { ...s.libraryColumns },
    fullAlbumsOnly: s.fullAlbumsOnly,
    artistsMin3: s.artistsMin3,
    genresMin3: s.genresMin3,
  }
}

const APP_DEFAULTS: ListDefaults = snapshot(DEFAULTS)

export function listDefaultsOf(s: Pick<Settings, 'listDefaults'>): ListDefaults {
  return s.listDefaults ?? APP_DEFAULTS
}

export function useListDefaults(): ListDefaults {
  return useSettingsStore((s) => s.listDefaults) ?? APP_DEFAULTS
}

/**
 * At launch, before the first screen: the lists go back to their defaults.
 * The very first time there are none yet, and the settings as they stand
 * become them — nobody's Random or shelf layout is taken away by this arriving.
 */
export function applyListDefaults(): void {
  const s = useSettingsStore.getState()
  if (!s.listDefaults) {
    s.set('listDefaults', snapshot(s))
    return
  }
  const d = s.listDefaults
  s.set('libraryOrder', { ...d.libraryOrder })
  s.set('libraryColumns', { ...d.libraryColumns })
  s.set('fullAlbumsOnly', d.fullAlbumsOnly)
  s.set('artistsMin3', d.artistsMin3)
  s.set('genresMin3', d.genresMin3)
}

/** Make part of the current state the default. */
export function makeDefault(patch: Partial<ListDefaults>): void {
  const s = useSettingsStore.getState()
  const d = listDefaultsOf(s)
  s.set('listDefaults', {
    ...d,
    ...patch,
    libraryOrder: { ...d.libraryOrder, ...patch.libraryOrder },
    libraryColumns: { ...d.libraryColumns, ...patch.libraryColumns },
  })
}

/**
 * A press held for HOLD_MS. `bind(onHold)` goes on a button; its onClick asks
 * `consumed()` first, so the release that ends a hold isn't also a tap.
 */
export function useHold() {
  const held = useRef<{ timer: number; fired: boolean } | null>(null)
  const cancel = () => {
    if (held.current) window.clearTimeout(held.current.timer)
  }
  const bind = (onHold: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button > 0) return
      cancel()
      const h = { timer: 0, fired: false }
      h.timer = window.setTimeout(() => {
        h.fired = true
        haptic('thunk')
        onHold()
      }, HOLD_MS)
      held.current = h
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // A held finger shouldn't also bring up the system's own menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })
  const consumed = () => {
    if (held.current?.fired) {
      held.current = null
      return true
    }
    return false
  }
  return { bind, consumed }
}

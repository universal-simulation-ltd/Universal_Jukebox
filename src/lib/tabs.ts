// The phone's tab bar: its order, and which tabs are hidden (James,
// 2026-11-02: "For the navigation at the bottom do like Blackbook - drag to
// change order, ability to hide a tab" — the suite rule in BRANDING.md, "Tabs
// reorder: hold and drag", first built in Universal BlackBook's lib/tabs.ts).
// Tune stays last and is not in here: it is where the settings are, and a tab
// bar that could lose it would be a trap.

import type { HomeTab } from '../stores/settingsStore'

export const PHONE_TABS: readonly HomeTab[] = ['artists', 'albums', 'tracks', 'jukebox']

/**
 * A stored order, made whole: unknown names dropped, each tab once, and any
 * tab missing from it (one added after the order was saved) put back just
 * after its neighbour in the default order. Hidden tabs stay in the order, so
 * a tab shown again returns to its place.
 */
export function normaliseOrder(raw: unknown): HomeTab[] {
  const known = Array.isArray(raw) ? raw.filter((x): x is HomeTab => PHONE_TABS.includes(x as HomeTab)) : []
  const out = [...new Set(known)]
  PHONE_TABS.forEach((t, i) => {
    if (out.includes(t)) return
    const before = i > 0 ? out.indexOf(PHONE_TABS[i - 1]) : -1
    out.splice(before + 1, 0, t)
  })
  return out
}

/** A stored list of hidden tabs, made safe: known tabs only, and never all of them. */
export function normaliseHidden(raw: unknown): HomeTab[] {
  const hidden = Array.isArray(raw) ? [...new Set(raw.filter((x): x is HomeTab => PHONE_TABS.includes(x as HomeTab)))] : []
  return hidden.length >= PHONE_TABS.length ? [] : hidden
}

/** The tabs on the bar, in order (Tune, always last, not included). */
export function shownTabs(order: readonly HomeTab[], hidden: readonly HomeTab[]): HomeTab[] {
  return normaliseOrder(order).filter((t) => !hidden.includes(t))
}

/** One tab moved to a new place in the order. */
export function moveTab(order: readonly HomeTab[], tab: HomeTab, to: number): HomeTab[] {
  const rest = order.filter((t) => t !== tab)
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, tab)
  return rest
}

/**
 * The shown tabs in a new order, written back into the whole order: hidden
 * tabs keep their slots, the shown ones fill the rest in their new sequence.
 */
export function withShownOrder(full: readonly HomeTab[], shown: readonly HomeTab[]): HomeTab[] {
  const on = new Set(shown)
  let k = 0
  return full.map((t) => (on.has(t) ? shown[k++] : t))
}

/** The tab the app opens on: the chosen one, or the first shown while that one is hidden. */
export function openingTab(home: HomeTab, order: readonly HomeTab[], hidden: readonly HomeTab[]): HomeTab {
  return hidden.includes(home) ? (shownTabs(order, hidden)[0] ?? home) : home
}

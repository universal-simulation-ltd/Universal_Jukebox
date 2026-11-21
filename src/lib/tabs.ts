// The phone's tab bar: its order, and which tabs are hidden (James,
// 2026-11-02: "For the navigation at the bottom do like Blackbook - drag to
// change order, ability to hide a tab" — the suite rule in BRANDING.md, "Tabs
// reorder: hold and drag", first built in Universal BlackBook's lib/tabs.ts).
// Tune stays last and is not in here: it is where the settings are, and a tab
// bar that could lose it would be a trap. Tabs are shown and hidden with an
// eye in Tune ▸ Tabs, and hidden ones sit after the shown ones in the order
// they went (James, 2026-11-20; `hiddenLast`, `setTabHidden`).

import { moveTab as kitMoveTab, normaliseTabOrder, toggleTabInOrder, withShownOrder as kitWithShownOrder } from '@unisim/sdk/phone'
import type { HomeTab } from '../stores/settingsStore'

// The order helpers are the SDK phone kit's (@unisim/sdk 0.230.0), where
// BlackBook's lib/tabs.ts and this file's copies of it went; the tab names,
// the hidden list and the opening tab stay Jukebox's.

export const PHONE_TABS: readonly HomeTab[] = ['artists', 'albums', 'tracks', 'jukebox', 'mix']

/**
 * A stored order, made whole: unknown names dropped, each tab once, and any
 * tab missing from it (one added after the order was saved) put back just
 * after its neighbour in the default order. Hidden tabs stay in the order
 * (after the shown ones: `hiddenLast`).
 */
export function normaliseOrder(raw: unknown): HomeTab[] {
  return normaliseTabOrder(raw, PHONE_TABS)
}

/** A stored list of hidden tabs, made safe: known tabs only, and never all of them. */
export function normaliseHidden(raw: unknown): HomeTab[] {
  const hidden = Array.isArray(raw) ? [...new Set(raw.filter((x): x is HomeTab => PHONE_TABS.includes(x as HomeTab)))] : []
  return hidden.length >= PHONE_TABS.length ? [] : hidden
}

/**
 * The whole order as the eye in Tune ▸ Tabs keeps it (James, 2026-11-20, the
 * suite rule "Show and hide tabs with an eye, in Tab order"): the shown tabs
 * in their order, then the hidden ones in the order they were hidden (the
 * hidden list is appended to as each goes). Applied whenever the settings are
 * read, so an order saved before the eye (hidden tabs kept in their slots,
 * from the old Hide tick box, the bin or an older app's sync) reads the same
 * way: nothing on the bar moves and nobody's hidden tabs come back.
 */
export function hiddenLast(order: readonly HomeTab[], hidden: readonly HomeTab[]): HomeTab[] {
  const off = hidden.filter((t) => order.includes(t))
  return [...order.filter((t) => !off.includes(t)), ...off]
}

/**
 * Hide or show one tab: the hidden list and the whole order, to be written
 * together (one write; two can clobber each other). Hiding puts it at the
 * bottom of Hidden; showing puts it at the end of the shown tabs, beside Tune.
 * What the eye in Tune and the bin on the bar both do.
 */
export function setTabHidden(
  order: readonly HomeTab[],
  hidden: readonly HomeTab[],
  tab: HomeTab,
  hide: boolean,
): { tabOrder: HomeTab[]; hiddenTabs: HomeTab[] } {
  return {
    tabOrder: toggleTabInOrder(order, tab, hide, (t) => hidden.includes(t)),
    hiddenTabs: hide ? [...hidden.filter((t) => t !== tab), tab] : hidden.filter((t) => t !== tab),
  }
}

/** The tabs on the bar, in order (Tune, always last, not included). */
export function shownTabs(order: readonly HomeTab[], hidden: readonly HomeTab[]): HomeTab[] {
  return normaliseOrder(order).filter((t) => !hidden.includes(t))
}

/** One tab moved to a new place in the order. */
export function moveTab(order: readonly HomeTab[], tab: HomeTab, to: number): HomeTab[] {
  return kitMoveTab(order, tab, to)
}

/**
 * The shown tabs in a new order, written back into the whole order: hidden
 * tabs keep their slots, the shown ones fill the rest in their new sequence.
 */
export function withShownOrder(full: readonly HomeTab[], shown: readonly HomeTab[]): HomeTab[] {
  return kitWithShownOrder(full, shown)
}

/** The tab the app opens on: the chosen one, or the first shown while that one is hidden. */
export function openingTab(home: HomeTab, order: readonly HomeTab[], hidden: readonly HomeTab[]): HomeTab {
  return hidden.includes(home) ? (shownTabs(order, hidden)[0] ?? home) : home
}

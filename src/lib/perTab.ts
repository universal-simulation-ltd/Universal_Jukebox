// A library setting kept for each list on its own (James, 2026-09-11: "keep
// each setting separate in the library i.e. jukebox shelf on artist doesn't
// auto apply to albums and tracks").

export const LIST_TABS = ['artists', 'albums', 'tracks'] as const
export type ListTabName = (typeof LIST_TABS)[number]

/**
 * A stored per-tab setting, each tab checked on its own. A single value — how
 * these were stored before they were split — is where EVERY tab starts, so
 * nobody's choice is lost in the move; from then on the tabs change apart.
 */
export function perTab<V>(stored: unknown, valid: (v: unknown) => v is V, fallback: Record<ListTabName, V>): Record<ListTabName, V> {
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const each = stored as Record<string, unknown>
    return Object.fromEntries(LIST_TABS.map((tab) => [tab, valid(each[tab]) ? each[tab] : fallback[tab]])) as Record<ListTabName, V>
  }
  if (valid(stored)) return Object.fromEntries(LIST_TABS.map((tab) => [tab, stored])) as Record<ListTabName, V>
  return { ...fallback }
}

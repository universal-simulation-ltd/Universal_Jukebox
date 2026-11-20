// CollectionHold.tsx — hold an artist or an album for what it offers (James,
// 2026-10-11: "Allow long taps e.g. on the artist and show things like view
// albums, view all tracks etc"). The song rows already open their sheet on a
// hold; this is the same for the tiles and rows of Artists and Albums, with
// `CollectionOptions` as the sheet.
//
// ⚠️ AND SELECT SEVERAL (BRANDING.md: "Press and hold selects"). The sheet a
// hold opens here is James's own ask (2026-10-11 and 10-13: "Long tap on album
// should show - open album, shuffle album, open artist"), and these rows have
// no ⋯ to move it to, so the hold keeps it and the sheet gains Select, which
// ticks the album or artist and starts selecting. From then on, until the bar's
// Remove or Clear, a hold or a tap on another one ticks or unticks it instead.

import { useState } from 'react'
import { swallowReleaseClick, type ListSelection } from '@unisim/sdk'
import type { Album } from '../lib/types'
import { useHold } from './listDefaults'
import { HeldSheet } from './HeldSheet'

export type Held = { kind: 'album'; album: Album } | { kind: 'artist'; name: string }

/** A list that selects several, as `useCollectionHold` needs it. */
export interface HoldSelect {
  /** Something is ticked: a tap or a hold ticks rather than opens. */
  active: boolean
  toggle(what: Held): void
  add(what: Held): void
}

/** `HoldSelect` for an SDK selection keyed by `keyOf` (an album's id, an artist's name). */
export function listSelect(sel: ListSelection, keyOf: (what: Held) => string | null): HoldSelect {
  return {
    active: sel.count > 0,
    toggle: (what) => {
      const key = keyOf(what)
      if (key !== null) sel.toggle(key)
    },
    add: (what) => {
      const key = keyOf(what)
      if (key !== null) sel.setMany([key], true)
    },
  }
}

/**
 * `bind(what)` goes on a tile or row; its onClick asks `consumed()` first, so
 * the tap that ends a hold doesn't also open it, then `ticked(what)`, which
 * ticks it instead while the list is selecting. `sheet` is drawn once.
 */
export function useCollectionHold(select?: HoldSelect) {
  const hold = useHold()
  const [held, setHeld] = useState<Held | null>(null)
  return {
    bind: (what: Held) =>
      hold.bind(() => {
        if (!select?.active) return setHeld(what)
        select.toggle(what)
        // Unticking the last one takes the bar away and the rows move up
        // under the finger. The swallowed click never reaches the row, so
        // the hold is spent here instead of by its `consumed()`.
        swallowReleaseClick(() => hold.consumed())
      }),
    consumed: hold.consumed,
    /** While selecting, a tap ticks or unticks: true when it did, so the tap opens nothing. */
    ticked: (what: Held) => {
      if (!select?.active) return false
      select.toggle(what)
      return true
    },
    /** Open the sheet straight away — for a shelf, which runs its own hold. */
    open: (what: Held) => setHeld(what),
    sheet: held ? <HeldSheet held={held} onClose={() => setHeld(null)} onSelect={select ? () => select.add(held) : undefined} /> : null,
  }
}

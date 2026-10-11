// CollectionHold.tsx — hold an artist or an album for what it offers (James,
// 2026-10-11: "Allow long taps e.g. on the artist and show things like view
// albums, view all tracks etc"). The song rows already open their sheet on a
// hold; this is the same for the tiles and rows of Artists and Albums, with
// `CollectionOptions` as the sheet.

import { useState } from 'react'
import type { Album } from '../lib/types'
import { useHold } from './listDefaults'
import { HeldSheet } from './HeldSheet'

export type Held = { kind: 'album'; album: Album } | { kind: 'artist'; name: string }

/**
 * `bind(what)` goes on a tile or row; its onClick asks `consumed()` first, so
 * the tap that ends a hold doesn't also open it. `sheet` is drawn once.
 */
export function useCollectionHold() {
  const hold = useHold()
  const [held, setHeld] = useState<Held | null>(null)
  return {
    bind: (what: Held) => hold.bind(() => setHeld(what)),
    consumed: hold.consumed,
    sheet: held ? <HeldSheet held={held} onClose={() => setHeld(null)} /> : null,
  }
}

// The one way in to "Remove from Jukebox" — the long-press sheets call this,
// never `useHiddenStore.hide` directly — so removing something also takes it
// out of Up next. "No longer seen or playable" (James, 2026-10-13): hiding it
// from the lists alone would leave it queued, and playing a minute later.

import { trackHider, useHiddenStore, type HiddenKind } from './hidden'
import { haptic } from './haptics'
import { usePlayerStore } from '../stores/playerStore'

export function removeFromJukebox(kind: HiddenKind, key: string): void {
  useHiddenStore.getState().hide(kind, key)
  haptic('thunk')
  const hidden = trackHider(useHiddenStore.getState().hidden)
  const player = usePlayerStore.getState()
  const { queue, order } = player
  // From the end, so each removal leaves the indices still to visit alone.
  // The song playing goes last: removing it skips to the next.
  let playingGoes = false
  for (let i = order.length - 1; i >= 0; i--) {
    const track = queue[order[i]]
    if (!track || !hidden(track)) continue
    if (i === usePlayerStore.getState().cursor) playingGoes = true
    else usePlayerStore.getState().removeFromQueue(i)
  }
  if (playingGoes) usePlayerStore.getState().removeFromQueue(usePlayerStore.getState().cursor)
}

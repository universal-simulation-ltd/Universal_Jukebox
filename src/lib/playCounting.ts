// Counting the plays `playCounts.ts` keeps — see the rule at the top of that
// file. Loaded once, from `main.tsx`, from the first song on.

import { countPlay, countsAfter } from './playCounts'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'

// ── Counting ────────────────────────────────────────────────────────────────
// One play at a time: `session` is the song on the deck and whether it has
// counted. A new song, or the same one started again from the top, is a new
// play.
let session: { id: string; counted: boolean; at: number } | null = null
usePlayerStore.subscribe((state) => {
  const track = currentTrack(state)
  if (!track) {
    session = null
    return
  }
  const sec = state.currentSec
  if (!session || session.id !== track.id || (session.counted && sec < 1 && session.at > 2)) {
    session = { id: track.id, counted: false, at: sec }
  }
  session.at = sec
  if (session.counted || !state.playing) return
  if (sec < countsAfter(state.durationSec || track.durationSec || 0)) return
  session.counted = true
  if (useLibraryStore.getState().trying) return
  countPlay(track.id)
})

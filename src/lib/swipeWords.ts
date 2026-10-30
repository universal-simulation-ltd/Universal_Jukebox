import { create } from 'zustand'
import type { Track } from './types'

// The words over the record, following a swipe (James, 2026-10-30: "When
// swiping between tracks on now playing record view, have the title and track
// info swipe out too so you can see what is queued properly"). `DeckSwiper`
// says where its row of records is; Now Playing's heading draws each song's
// title, artist and album at that song's place in the row (`SwipeWords`).
//
// ⚠️ ONLY WHILE A FINGER IS SWIPING, and until the swipe has landed or sprung
// back. A crossfade's slide moves the same row, but by then the player is
// already on the new song and its words are the heading: nothing to follow.

export interface SwipeRow {
  /** Where the row is, in records — `DeckSwiper`'s `drag`: negative towards the next song. */
  drag: number
  /** Gliding there (a release, or a spring back) rather than following the finger. */
  animate: boolean
  /** How long that glide takes. */
  ms: number
  /**
   * The songs either side, by place from the one that was playing as the swipe
   * began: +1 the next, −1 the previous. A snapshot: the player moving on as the
   * swipe lands must not shift the words under it.
   */
  songs: ReadonlyMap<number, Track>
}

export const useSwipeWords = create<{ row: SwipeRow | null }>(() => ({ row: null }))

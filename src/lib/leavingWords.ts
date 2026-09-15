import type { LyricLine } from './lyrics'

// Which words go round the record while it is being changed (`LyricsAround`).
//
// James, 2026-09-15: "When the last track moves out on disc change, the lyrics
// should fade out slowly instead of just disappearing."
//
// ⚠️ THE PLAYER MOVES ON BEFORE THE DECK DOES. The cursor goes to the arriving
// song as a record change STARTS (`playAt`), while the old record stays on the
// deck until the change is over (`deckPhase: 'leaving'`). Asked "what are the
// words for the current song?", the answer for that whole time is the ARRIVING
// song's. So the old words vanished the instant the change began, and once the
// new sheet had loaded, the new song's opening line appeared on the record that
// was leaving. The record going is the old song's, so its words go with it.

/** One set of words round the record: whose, and where in the song. */
export interface ShownWords {
  trackId: string
  lines: LyricLine[]
  /** Where in the song they are drawn at — frozen, for words on their way out. */
  sec: number
}

/**
 * What to draw: the current song's words, the last song's on their way out, or
 * nothing.
 *
 * - No record changing: the current song's, as always.
 * - A record changing: the words last drawn, frozen where they were, for the
 *   caller to fade — but only if they are the OLD song's. Never the current
 *   song's, whose record is not on the deck yet.
 * - With reduced motion, nothing while it changes, rather than a fade.
 */
export function wordsToDraw({ leaving, reduced, live, last, trackId }: {
  /** The old record is still on the deck, going (`deckPhase: 'leaving'`). */
  leaving: boolean
  reduced: boolean
  /** The current song's words, when there are any. */
  live: ShownWords | null
  /** The words drawn last. */
  last: ShownWords | null
  /** The current song. */
  trackId: string | undefined
}): { words: ShownWords | null; going: boolean } {
  if (!leaving) return { words: live, going: false }
  if (reduced || !last || last.trackId === trackId) return { words: null, going: false }
  return { words: last, going: true }
}

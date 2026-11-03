import { usePlayerStore } from '../stores/playerStore'

// Next and Previous, pressed while Now Playing's records are on screen.
//
// ⚠️ A PRESS GOES THE WAY A SWIPE GOES (James, 2026-11-03: "swiping records is
// smooth but clicking the next track icon goes wrong"). A swipe has
// `DeckSwiper` carry the row across, hold the record it landed on, and only
// THEN move the player (`jumpTo(…, { onDeck: true })`). A press used to move the
// player first and leave the picture to catch up: the heading changed at once
// over the old record, a record crossfade slid a sleeve in on its own clock
// (`startBlend` → `DeckSwiper`'s blend effect), and the deck then sat on a still
// stand-in through the 620ms `arriving` phase before the new record turned. Two
// animations of one change, timed by different things, is what read as wrong.
//
// So `DeckSwiper` offers to carry the records while it is mounted, and the
// buttons ask it first. It says no — and the player moves as it always has —
// when there is no record that way, motion is reduced, or a crossfade is
// already sliding; the lock screen, media keys and the player bar never ask.

type Carry = (way: 1 | -1) => boolean

let carry: Carry | null = null

/** `DeckSwiper` offers to carry its row of records; the returned function withdraws it. */
export function offerToCarry(fn: Carry): () => void {
  carry = fn
  return () => {
    if (carry === fn) carry = null
  }
}

/** On to the next song — by the records if they are on screen. */
export function skipNext(): void {
  if (carry?.(1)) return
  usePlayerStore.getState().next()
}

/**
 * Back a song — by the records if they are on screen. Past the first three
 * seconds the player's own rule still wins: "previous" restarts the song.
 */
export function skipPrevious(): void {
  const player = usePlayerStore.getState()
  if (player.currentSec > 3 || !carry?.(-1)) player.previous()
}

// Double-tap the machine on Now Playing (James, 2026-10-12, an easter egg) and
// its moving part answers — the record, CD or 45 scratches back and forth like
// a DJ's, the cassette, reels and pocket wheel wind BACK. Since 2026-11-02 it
// is a control too ("rewind 3 seconds with a scratchy mixing sound"): the
// music jumps back `REWIND_SEC` under a scratch, or a spool for the machines
// that wind (`rewindDeck` below; the sound is `crackle.ts`'s `playRewindFx`).
//
// ⚠️ THE `rotate` PROPERTY, NOT `transform`. Every face spins its moving part
// with an inline `jb-spin` animation on `transform`. `rotate` is a separate
// property the browser applies on top, so the scratch rides on whatever the
// spin is doing (playing or paused) and hands straight back to it — no face
// needs to know, and both shapes end on a whole number of turns, so there's no
// jump at the end.

import type { DeckStyle } from '../stores/settingsStore'
import { playRewindFx } from './crackle'

/** How far a double tap takes the song back. */
export const REWIND_SEC = 3

/** Machines that wind rather than scratch. */
const WINDS: readonly DeckStyle[] = ['cassette', 'reel', 'pocket']

const SCRATCH: Keyframe[] = [
  { rotate: '0deg' },
  { rotate: '-32deg', offset: 0.22 },
  { rotate: '16deg', offset: 0.45 },
  { rotate: '-22deg', offset: 0.66 },
  { rotate: '6deg', offset: 0.85 },
  { rotate: '0deg' },
]
const WIND: Keyframe[] = [{ rotate: '0deg' }, { rotate: '-1080deg' }]

/**
 * The double tap: the sound, then the song `REWIND_SEC` back — never before
 * its start. `animate` is false when motion is reduced: the music still goes
 * back and the sound still plays, the record just doesn't wobble.
 */
export function rewindDeck(
  root: Element | null,
  style: DeckStyle,
  player: { currentSec: number; volume: number; seekTo(seconds: number): void },
  level: number,
  animate: boolean,
): void {
  playRewindFx(WINDS.includes(style) ? 'spool' : 'scratch', player.volume, level)
  player.seekTo(Math.max(0, player.currentSec - REWIND_SEC))
  if (root && animate) scratchDeck(root, style)
}

/** Play the egg on every spinning part inside `root`. */
export function scratchDeck(root: Element, style: DeckStyle): void {
  const parts = root.querySelectorAll<Element>('[style*="jb-spin"]')
  const winds = WINDS.includes(style)
  for (const part of parts) {
    if (typeof part.animate !== 'function') continue
    part.animate(winds ? WIND : SCRATCH, {
      duration: winds ? 950 : 720,
      easing: winds ? 'cubic-bezier(0.35, 0, 0.2, 1)' : 'ease-in-out',
    })
  }
}

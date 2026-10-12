// An easter egg (James, 2026-10-12): double-tap the machine on Now Playing and
// its moving part answers — the record, CD or 45 scratches back and forth like
// a DJ's, the cassette, reels and pocket wheel whirr forward. Nothing about the
// music changes; it is the machine showing off.
//
// ⚠️ THE `rotate` PROPERTY, NOT `transform`. Every face spins its moving part
// with an inline `jb-spin` animation on `transform`. `rotate` is a separate
// property the browser applies on top, so the scratch rides on whatever the
// spin is doing (playing or paused) and hands straight back to it — no face
// needs to know, and both shapes end on a whole number of turns, so there's no
// jump at the end.

import type { DeckStyle } from '../stores/settingsStore'

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
const WIND: Keyframe[] = [{ rotate: '0deg' }, { rotate: '1080deg' }]

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

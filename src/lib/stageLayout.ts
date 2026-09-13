import { useEffect, useState } from 'react'

// The stage when the window is LYING DOWN — wide, and not tall.
//
// Now Playing has two layouts: from `lg` the deck stands on the left with the
// words beside it, and below `lg` they stack, words above deck (James,
// 2026-09-11: "put the discs below the artist, track name to make it easier to
// reach for swipe" — a thumb swipes the records, so they go where a thumb is).
//
// ⚠️ STACKING NEEDS HEIGHT, AND A LANDSCAPE PHONE HAS NONE. On an 844×390
// screen the words fill what there is and the record is below the fold: the
// screen whose whole job is to show a record turning shows no record at all
// (James, 2026-09-13, with a screenshot of exactly that: "in landscape we could
// have track details left and record animation right"). Side by side, both fit.
//
// ⚠️ WHY THE SIDES ARE THE OTHER WAY ROUND FROM `lg`. Asked for that way, and
// it is the right way round for a phone held in two hands: the record — the
// thing you swipe — sits under the right thumb, and the words are read on the
// left. The desktop layout is unchanged, and the two never meet: this rule
// stops below `lg`, so a wide window is never flipped by being dragged short.

/**
 * ⚠️ ALL THREE CONDITIONS MATTER.
 *
 * `max-width: 1023px` keeps this below Tailwind's `lg`, where the deck already
 * stands beside the words — a desktop window dragged short must not have its
 * columns swap sides underneath somebody.
 *
 * `orientation: landscape` is the ask, literally: wider than it is tall.
 *
 * `max-height: 620px` is what makes it about ROOM rather than shape. A 1000×900
 * window is landscape by the strict reading and has ample height to stack in;
 * squeezing it into columns would be fixing something that is not broken.
 */
export const LANDSCAPE_STAGE_QUERY = '(max-width: 1023px) and (orientation: landscape) and (max-height: 620px)'

/** Is the stage lying down right now? False wherever it cannot tell. */
export function isLandscapeStage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(LANDSCAPE_STAGE_QUERY).matches
  } catch {
    return false
  }
}

/**
 * The same, live — it changes the moment a phone is turned over.
 *
 * Answered synchronously on the first render (no `useState(false)` then an
 * effect), because a wrong first frame here is the whole layout jumping.
 */
export function useLandscapeStage(): boolean {
  const [landscape, setLandscape] = useState(isLandscapeStage)
  useEffect(() => {
    let query: MediaQueryList
    try {
      query = window.matchMedia(LANDSCAPE_STAGE_QUERY)
    } catch {
      return
    }
    const sync = () => setLandscape(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return landscape
}

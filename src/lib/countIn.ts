// The 3, 2, 1 in front of the lyric line waiting along the bottom of the
// record, as it is about to go up to the top (James, 2026-09-13: "On the record
// play with the lyrics around the disc have a 3,2,1 for the next line moving to
// the top"). Drawn by `components/LyricsAround.tsx`; the rule is here, pure,
// so it is tested.

/** Seconds of count-in before the waiting line goes up top. */
export const COUNT_FROM = 3

/**
 * The shortest wait, from the line now being sung to the next, that gets a
 * count.
 *
 * ⚠️ Without it every line would count: most lines follow the one before
 * within a few seconds, so the bottom of the record would say "2, 1" all song
 * long, and a count that is always there says nothing. With it, the count comes
 * where it helps — a long line, an instrumental break, the gap after a verse.
 */
export const COUNT_MIN_WAIT = 4

/** 3, 2 or 1 — or null when there is nothing to count. */
export function countIn(
  lines: { timeSec?: number | null }[],
  active: number,
  nextIndex: number,
  currentSec: number,
): number | null {
  const at = nextIndex >= 0 ? lines[nextIndex]?.timeSec : undefined
  if (typeof at !== 'number') return null
  const left = at - currentSec
  if (left <= 0 || left > COUNT_FROM) return null
  const since = lines[active]?.timeSec
  if (typeof since === 'number' && at - since < COUNT_MIN_WAIT) return null
  return Math.ceil(left)
}

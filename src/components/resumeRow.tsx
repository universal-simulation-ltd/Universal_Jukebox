import type { ReactNode } from 'react'
import ResumeCard from './ResumeCard'

/**
 * "Resume listening" as the list's SECOND ROW (James, 2026-09-11: "place it on
 * the second row so you can scroll past it without hiding it, inbetween the
 * albums, jukebox etc"). It was a banner above the lists, which put the one
 * thing you might want to reach at the top, above everything you scroll to;
 * as a row, it is one row in, and scrolls away with the rest.
 *
 * `ResumeCard` renders nothing when there is nothing to resume, so the slot
 * leaves no gap behind.
 */
export function withResumeRow(items: ReactNode[], at: number, as: 'cell' | 'row' | 'block' = 'cell'): ReactNode[] {
  const slot = (
    <ResumeCard
      key="jb-resume"
      wrap={(card) =>
        as === 'cell' ? (
          <li className="col-span-full">{card}</li>
        ) : as === 'row' ? (
          <li className="py-3">{card}</li>
        ) : (
          <div>{card}</div>
        )
      }
    />
  )
  const out = [...items]
  out.splice(Math.min(Math.max(0, at), out.length), 0, slot)
  return out
}

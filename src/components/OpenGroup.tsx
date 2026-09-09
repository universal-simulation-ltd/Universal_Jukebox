import Cover from './Cover'
import type { Album } from '../lib/types'

// The card a fan turns into when you open it.
//
// ⚠️ THE CARD STAYS PUT (James, 2026-09-09). Opening an artist used to REPLACE
// the fan with that artist's tiles, which meant the thing you clicked vanished
// under your cursor and the only way back was a small "Fold X back up" link at
// the far end of the run — often a row or two down, and off screen entirely for
// somebody with fourteen albums. A group you can open and not close is a trap.
//
// So the group keeps its cell. Closed it is a fan of covers; open it is this:
// the sleeve pulled open, with the artist's front record half out of it, so the
// tiles beside it are visibly the contents of THIS card rather than a run of
// albums that happens to start here.
//
// Dark in both themes on purpose. Every other tile in the grid is artwork on a
// pale ground, and the one card that is not a record needs to not look like a
// record whose cover failed to load.

interface OpenGroupProps {
  albums: Album[]
  /** Tailwind size classes for the card's box — it fills whatever it is given. */
  className?: string
}

export default function OpenGroup({ albums, className = '' }: OpenGroupProps) {
  const front = albums[0]
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900 shadow-sm ring-1 ring-slate-900/10 dark:bg-[#0b1120] dark:ring-white/10 ${className}`}
      aria-hidden
    >
      {/* The sleeve's own colour, taken from the record inside it — enough to
          tell two open groups apart at a glance without competing with the
          artwork sitting half out of it. */}
      {front && (
        <div className="absolute inset-0 opacity-25 blur-md">
          <Cover album={front} className="h-full w-full" rounded={false} />
        </div>
      )}

      {/* The record, half out. Tilted and pushed down-right so the top-left
          corner of the sleeve stays empty for the chevron. */}
      {front && (
        <div className="absolute inset-0 flex items-end justify-end p-[9%]">
          <Cover
            album={front}
            className="w-[62%] rotate-[5deg] shadow-lg ring-1 ring-white/15"
          />
        </div>
      )}

      {/* Open, and how to close it. A chevron rather than a cross, because it
          is a disclosure and not a dismissal — the same glyph, pointing the
          other way, is what the fan would use if it had one. */}
      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium tracking-wide text-white/90 uppercase backdrop-blur-sm">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
          <path d="M10 6.6a1 1 0 0 1 .7.3l4 4a1 1 0 1 1-1.4 1.4L10 9.02l-3.3 3.3a1 1 0 1 1-1.4-1.42l4-4a1 1 0 0 1 .7-.3Z" />
        </svg>
        Open
      </span>
    </div>
  )
}

/**
 * The tint that marks a tile as part of the open group.
 *
 * ⚠️ Negative margin and matching padding, so the tinted box grows OUTWARDS
 * into the grid's gutter instead of shrinking the cover inside it. A tile that
 * got smaller when its group opened would leave every row it is in visibly
 * uneven — and the covers in an open group are the ones you are looking at.
 *
 * Exported as a string rather than a component because it is applied to buttons
 * that already exist in two different files, each with their own children.
 */
export const GROUP_MEMBER_TINT =
  '-m-1.5 rounded-2xl bg-orange-50 p-1.5 ring-1 ring-orange-200 dark:bg-orange-400/10 dark:ring-orange-400/25'

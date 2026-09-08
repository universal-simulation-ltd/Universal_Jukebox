import Cover from './Cover'
import type { Album } from '../lib/types'

// Several records fanned out, the way they sit when you pull a few from a shelf.
//
// Used in two places for the same reason: one artist with fourteen albums
// should not be fourteen tiles of the album grid, and should not be a
// full-width row of its own in the artist list. A fan says "there are more of
// these" in the space of roughly one tile.
//
// ⚠️ THE PIVOT IS THE BOTTOM CENTRE, and that is a correctness constraint
// rather than a stylistic one. The first version pivoted at the bottom RIGHT,
// which swings the back covers DOWN and to the left — straight over the album
// title underneath, which is the one part of the tile that has to stay
// readable. Rotating about a point ON the bottom edge cannot push any corner
// below that edge, so the caption is safe by construction at any angle.
//
// ⚠️ The FRONT cover is the last one drawn, and the array is reversed to get it
// there. Painting them in natural order puts the newest record at the back
// where it is three-quarters hidden, which is the wrong one to hide — the front
// of the fan is the one the eye reads, so it gets the album most likely to be
// recognised (the first in whatever order the caller sorted by).

/** How many covers a fan shows, however many the artist has. */
export const FAN_MAX = 3

/**
 * Degrees between each card.
 *
 * Small on purpose. The cards behind lean out into the grid's own gutter, so a
 * wider spread starts crowding the neighbouring tile — and the fan is a hint
 * that there is more here, not a display of the records themselves.
 */
const STEP_DEGREES = 8

interface CoverFanProps {
  albums: Album[]
  /** Tailwind size classes for the fan's box — it fills whatever it is given. */
  className?: string
}

export default function CoverFan({ albums, className = '' }: CoverFanProps) {
  const shown = albums.slice(0, FAN_MAX)
  // Back to front, so the first album ends up on top.
  const painted = [...shown].reverse()
  const depth = painted.length

  return (
    <div className={`relative ${className}`} aria-hidden>
      {painted.map((album, i) => {
        // `i` counts from the BACK, so the last one drawn is square and full
        // size while the ones behind lean progressively further out.
        const fromFront = depth - 1 - i
        // Alternate sides so three cards spread rather than all leaning one way.
        const direction = fromFront % 2 === 1 ? 1 : -1
        const angle = Math.ceil(fromFront / 2) * STEP_DEGREES * direction
        const scale = 1 - fromFront * 0.05
        return (
          <div
            key={album.id}
            className="absolute inset-0"
            style={{
              transform: `rotate(${angle}deg) scale(${scale})`,
              transformOrigin: '50% 100%',
              zIndex: i,
            }}
          >
            <Cover
              album={album}
              className="h-full w-full shadow-md ring-1 ring-slate-900/10 dark:ring-white/10"
            />
          </div>
        )
      })}
    </div>
  )
}

import { useMemo } from 'react'
import { coverUrl, fallbackHue } from '../lib/art'
import type { Album } from '../lib/types'

// One album cover, at whatever size it is given.
//
// Every cover in the app goes through here, which is what keeps the object-URL
// discipline in one place: `coverUrl` mints at most one URL per album and
// revokes the least recently used past a cap (see `art.ts`). A component that
// called `createObjectURL` itself would leak the artwork cache back into the
// tab on every scroll.

interface CoverProps {
  album: Album | undefined
  /** CSS size classes — the caller decides how big; this decides what is in it. */
  className?: string
  /** Rounded corners. Off for the deck, which is a circle. */
  rounded?: boolean
}

export default function Cover({ album, className = '', rounded = true }: CoverProps) {
  const url = useMemo(
    () => (album ? coverUrl(album.id, album.cover) : null),
    [album],
  )

  const radius = rounded ? 'rounded-xl' : ''

  if (!album) {
    return <div className={`${className} ${radius} bg-slate-200 dark:bg-slate-800`} aria-hidden />
  }

  if (url) {
    return (
      <img
        src={url}
        // The album is named beside every cover in every view, so the picture is
        // decoration and an alt of "" is the correct one — a screen reader
        // reading "Kid A cover art" straight after the heading "Kid A" is noise,
        // not access.
        alt=""
        loading="lazy"
        decoding="async"
        className={`${className} ${radius} bg-slate-200 object-cover dark:bg-slate-800`}
      />
    )
  }

  return <FallbackTile album={album} className={className} radius={radius} />
}

/**
 * The tile for an album whose files carry no artwork.
 *
 * Not a grey box and not a generic music glyph: a stable colour derived from the
 * album id, with the album's initials on it. An untagged library is mostly this,
 * and the difference between "every album looks identical" and "I can find the
 * blue one" is the difference between usable and not.
 *
 * The hue is a hash, so the same record is the same colour on every visit — an
 * album that changed colour between sessions would be worse than grey.
 */
function FallbackTile({ album, className, radius }: { album: Album; className: string; radius: string }) {
  const hue = fallbackHue(album.id)
  const initials = initialsOf(album.title)
  return (
    <div
      className={`${className} ${radius} flex items-center justify-center overflow-hidden bg-slate-200 dark:bg-slate-800`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 46% 62%), hsl(${(hue + 28) % 360} 44% 44%))`,
        // Makes THIS element the query container, so the `cqw` below is a
        // percentage of the tile's own width. Without it `cqw` resolves against
        // the nearest ancestor container — or, if there is none, the small-viewport
        // fallback — and the initials come out the same size at 40px and 420px.
        containerType: 'inline-size',
      }}
      aria-hidden
    >
      <span
        className="font-semibold text-white/85 select-none"
        // Sized against the tile rather than in a fixed class, so the same
        // component works at 40px in a list and 420px on the deck.
        style={{ fontSize: 'min(34cqw, 3.2rem)' }}
      >
        {initials}
      </span>
    </div>
  )
}

function initialsOf(title: string): string {
  const words = title.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w))
  if (words.length === 0) return '♪'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

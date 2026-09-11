import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Cover from './Cover'
import { navigate } from '../lib/route'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { shelfRows } from '../lib/libraryView'
import { withResumeRow } from './resumeRow'
import type { Album } from '../lib/types'

// The jukebox way to browse (James, 2026-09-11: "For jukebox show the records
// like on a book shelf where you can swipe left of right to cycle through
// them"): the albums stand on a shelf, a record peeking out of each sleeve, and
// the one in the middle is the one you are looking at. Swipe along; tap the
// middle one to open it, or a side one to bring it to the middle.
//
// ⚠️ NATIVE SCROLLING WITH SNAP POINTS, not a gesture of our own: the swipe then
// has the phone's own momentum and feel, and keyboard, trackpad and screen
// reader all work for free. The middle is measured on scroll.

/**
 * ⚠️ SEVERAL SHELVES, STACKED (James, 2026-09-11: "limit each row to a max of
 * 10% of items and then have up to 10 rows so you can swipe down"). Each is its
 * own swipe; the page scrolls between them. How they split is `shelfRows`.
 */
export default function Shelf({ albums }: { albums: Album[] }) {
  const rows = shelfRows(albums)
  return (
    <div className="space-y-10">
      {withResumeRow(rows.map((row, i) => (
        <ShelfRow
          key={i}
          albums={row}
          label={rows.length > 1 ? `Shelf ${i + 1} of ${rows.length}` : 'Albums on the shelf'}
          // ⚠️ STAGGERED, like bricks (James, 2026-09-11: "first line has first
          // track selected and second line has second track then third has 1st
          // again"), so the shelves don't stack into one straight column.
          start={i % 2 === 1 && row.length > 1 ? 1 : 0}
        />
      )), 1, 'block')}
    </div>
  )
}

function ShelfRow({ albums, label, start = 0 }: { albums: Album[]; label: string; start?: number }) {
  const row = useRef<HTMLDivElement>(null)
  const ticker = useRef<HTMLSpanElement>(null)
  const [middle, setMiddle] = useState(0)
  const reduced = usePrefersReducedMotion()
  /** The ticker's width, as a share of the shelf: a record's share, within reason. */
  const tickerWidth = Math.max(6, Math.min(30, 100 / Math.max(1, albums.length)))

  // Open with the `start`th record in the middle — before the first paint, so
  // the shelf never shows itself at the wrong place and then jumps.
  useLayoutEffect(() => {
    const el = row.current
    const item = el?.querySelectorAll<HTMLElement>('[data-shelf-item]')[start]
    if (!el || !item) return
    el.scrollLeft = item.offsetLeft + item.offsetWidth / 2 - el.clientWidth / 2
  }, [albums, start])

  useEffect(() => {
    const el = row.current
    if (!el) return
    let frame = 0
    const measure = () => {
      frame = 0
      const centre = el.scrollLeft + el.clientWidth / 2
      let best = 0
      let distance = Number.POSITIVE_INFINITY
      el.querySelectorAll<HTMLElement>('[data-shelf-item]').forEach((item, i) => {
        const d = Math.abs(item.offsetLeft + item.offsetWidth / 2 - centre)
        if (d < distance) {
          distance = d
          best = i
        }
      })
      setMiddle(best)
      // The ticker follows the scroll itself, not the record in the middle, so
      // it glides with the finger — written straight to the element, since a
      // re-render of a hundred sleeves every frame is what would make it jerk.
      const max = el.scrollWidth - el.clientWidth
      if (ticker.current) ticker.current.style.left = `${(max > 0 ? Math.min(1, el.scrollLeft / max) : 0) * (100 - tickerWidth)}%`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [albums, tickerWidth])

  const bringToMiddle = (i: number) => {
    const items = row.current?.querySelectorAll<HTMLElement>('[data-shelf-item]')
    items?.[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }

  const current = albums[Math.min(middle, albums.length - 1)]

  return (
    <section aria-label={label} className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div
        ref={row}
        className="flex snap-x snap-mandatory items-end gap-3 overflow-x-auto px-[19%] pt-8 pb-1 [scrollbar-width:none] sm:px-[33%] md:px-[38%] [&::-webkit-scrollbar]:hidden"
      >
        {albums.map((album, i) => {
          const isMiddle = i === middle
          return (
            <button
              key={album.id}
              type="button"
              data-shelf-item
              onClick={() => (isMiddle ? navigate({ view: 'album', albumId: album.id }) : bringToMiddle(i))}
              aria-label={isMiddle ? `Open ${album.title}` : `Show ${album.title}`}
              aria-current={isMiddle ? 'true' : undefined}
              className="relative w-[62%] shrink-0 snap-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E05504] sm:w-[34%] md:w-[24%]"
              style={{
                transform: `scale(${isMiddle ? 1 : 0.82})`,
                transformOrigin: 'bottom center',
                opacity: isMiddle ? 1 : 0.62,
                transition: reduced ? undefined : 'transform 280ms ease-out, opacity 280ms ease-out',
              }}
            >
              {/* The record, half out of its sleeve — behind it. */}
              <span
                className="absolute inset-x-[9%] -top-[16%] aspect-square rounded-full bg-slate-900 shadow-md dark:bg-[#12192b]"
                style={{
                  background:
                    'repeating-radial-gradient(circle at 50% 50%, #0f172a 0 3px, #1e293b 3px 4px)',
                }}
                aria-hidden
              />
              <Cover album={album} className="relative aspect-square w-full rounded-md shadow-lg ring-1 ring-black/10" />
            </button>
          )
        })}
      </div>
      {/* The shelf the records stand on — with a yellow ticker along it for
          how far along the shelf you are (James, 2026-09-11: "a subtle
          indication of the progression on the shelf e.g. a yellow ticker that
          moves from left to right on the shelf as it progressing by swiping"). */}
      <div
        className="relative mx-4 h-3 rounded-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-[0_10px_18px_-8px_rgba(0,0,0,0.5)] sm:mx-6 lg:mx-8 dark:from-amber-800 dark:to-amber-950"
        aria-hidden
      >
        {albums.length > 1 && (
          <span
            ref={ticker}
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-yellow-300/90 shadow-[0_0_6px_rgba(253,224,71,0.55)]"
            style={{ width: `${tickerWidth}%`, left: 0 }}
          />
        )}
      </div>
      {current && (
        <div className="mt-4 px-4 text-center" aria-live="polite">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{current.title}</p>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
            {[current.artist, current.year].filter(Boolean).join(' · ')} — tap the record to open it
          </p>
        </div>
      )}
    </section>
  )
}

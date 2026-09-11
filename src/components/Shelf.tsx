import { useEffect, useRef, useState } from 'react'
import Cover from './Cover'
import { navigate } from '../lib/route'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
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

export default function Shelf({ albums }: { albums: Album[] }) {
  const row = useRef<HTMLDivElement>(null)
  const [middle, setMiddle] = useState(0)
  const reduced = usePrefersReducedMotion()

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
  }, [albums])

  const bringToMiddle = (i: number) => {
    const items = row.current?.querySelectorAll<HTMLElement>('[data-shelf-item]')
    items?.[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }

  const current = albums[Math.min(middle, albums.length - 1)]

  return (
    <section aria-label="Albums on the shelf" className="-mx-4 sm:-mx-6 lg:-mx-8">
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
      {/* The shelf the records stand on. */}
      <div
        className="mx-4 h-3 rounded-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-[0_10px_18px_-8px_rgba(0,0,0,0.5)] sm:mx-6 lg:mx-8 dark:from-amber-800 dark:to-amber-950"
        aria-hidden
      />
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

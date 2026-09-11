import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Cover from './Cover'
import { coverUrl, fallbackHue } from '../lib/art'
import Record45 from './Record45'
import { navigate } from '../lib/route'
import { plural } from '../lib/format'
import { grooveRings } from '../lib/grooves'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { newSeed, shelfRows } from '../lib/libraryView'
import { useLibraryStore } from '../stores/libraryStore'
import { withResumeRow } from './resumeRow'
import type { Album, Track } from '../lib/types'

// The jukebox way to browse (James, 2026-09-11: "For jukebox show the records
// like on a book shelf where you can swipe left of right to cycle through
// them"): the records stand on a shelf, and the one in the middle is the one
// you are looking at. Swipe along; tap the middle one to open (or play) it, or
// a side one to bring it to the middle.
//
// ONE shelf, four kinds of thing on it (James, 2026-09-11: "implement the
// jukebox shelf view for artists and tracks (on tracks show the actual records
// on the shelf, not the album + record)"): albums and artists stand as a sleeve
// with its record behind it; tracks, and the Jukebox tab's shelves, as the 45s
// themselves (`Record45`).
//
// ⚠️ NATIVE SCROLLING WITH SNAP POINTS, not a gesture of our own: the swipe then
// has the phone's own momentum and feel, and keyboard, trackpad and screen
// reader all work for free. The middle is measured on scroll.

/** An album, as it stands on the shelf: the sleeve, its record half out behind. */
function Sleeve({ album }: { album: Album | undefined }) {
  return (
    <>
      <span
        className="absolute inset-x-[9%] -top-[16%] aspect-square rounded-full bg-slate-900 shadow-md dark:bg-[#12192b]"
        style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #0f172a 0 3px, #1e293b 3px 4px)' }}
        aria-hidden
      />
      <Cover album={album} className="relative aspect-square w-full rounded-md shadow-lg ring-1 ring-black/10" />
    </>
  )
}

/**
 * ⚠️ SEVERAL SHELVES, STACKED (James, 2026-09-11: "limit each row to a max of
 * 10% of items and then have up to 10 rows so you can swipe down"). Each is its
 * own swipe; the page scrolls between them. How they split is `shelfRows`.
 */
/**
 * How the shelves are cut this time the app is open — different lengths each
 * launch, the same all the while you browse (`shelfRows`).
 */
const LAUNCH_SEED = newSeed()

function Shelves<T>({
  items, label, row, lead,
}: { items: T[]; label: string; row(items: T[], label: string, start: number): ReactNode; lead?: T }) {
  // ⚠️ THE RESUME ITEM JOINS THE FIRST SHELF; IT DOES NOT RESHUFFLE THE REST
  // (James, 2026-09-11: "When having the resume listening card show that songs
  // artist in the shelf above as first item - keep the other items the same in
  // the shelf"). The shelves are cut from the list as it would be without it,
  // then `lead` goes to the front of the first one (moved there if that shelf
  // already had it). Leading the whole list instead shifted every shelf by one.
  const cut = shelfRows(items, LAUNCH_SEED)
  const rows = lead === undefined || cut.length === 0 ? cut : [[lead, ...cut[0].filter((item) => item !== lead)], ...cut.slice(1)]
  const box = useRef<HTMLDivElement>(null)
  const [lift, setLift] = useState(0)

  // ⚠️ THE FIRST SHELF STANDS IN THE MIDDLE OF THE SCREEN (James, 2026-09-11:
  // "centre the first row to the middle height of the screen on library view
  // so it doesn't look like you're already mid scroll"). Opened near the top,
  // with the next shelf showing under it, the page looked as if you had
  // already scrolled into it. The space above the first shelf is whatever
  // puts its middle at the screen's middle — none, if it is already there or
  // lower. Measured from where the shelves START (the space is padding inside
  // them), so it never feeds back into itself.
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current
      const first = el?.querySelector('section')
      if (!el || !first) return
      const top = el.getBoundingClientRect().top + window.scrollY
      setLift(Math.max(0, Math.round(window.innerHeight / 2 - top - first.offsetHeight / 2)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [items])

  return (
    <div ref={box} className="space-y-10" style={{ paddingTop: lift }}>
      {withResumeRow(
        rows.map((r, i) => (
          <Fragment key={i}>
            {row(
              r,
              rows.length > 1 ? `Shelf ${i + 1} of ${rows.length}` : label,
              // ⚠️ STAGGERED, like bricks (James, 2026-09-11: "first line has
              // first track selected and second line has second track then third
              // has 1st again"), so the shelves don't stack into one column.
              i % 2 === 1 && r.length > 1 ? 1 : 0,
            )}
          </Fragment>
        )),
        1,
        'block',
      )}
    </div>
  )
}

export default function Shelf({ albums, lead }: { albums: Album[]; lead?: Album }) {
  return (
    <Shelves
      items={albums}
      lead={lead}
      label="Albums on the shelf"
      row={(row, label, start) => (
        <ShelfRow
          items={row}
          label={label}
          start={start}
          keyOf={(a) => a.id}
          nameOf={(a) => a.title}
          render={(a) => <Sleeve album={a} />}
          artOf={(a) => a}
          open={(a) => navigate({ view: 'album', albumId: a.id })}
          caption={(a) => ({ title: a.title, detail: `${[a.artist, a.year].filter(Boolean).join(' · ')} — tap the record to open it` })}
        />
      )}
    />
  )
}

/** The artists on the shelf, each as their latest record. */
export function ArtistShelf({
  artists, lead,
}: { artists: { name: string; albums: Album[] }[]; lead?: { name: string; albums: Album[] } }) {
  return (
    <Shelves
      items={artists}
      lead={lead}
      label="Artists on the shelf"
      row={(row, label, start) => (
        <ShelfRow
          items={row}
          label={label}
          start={start}
          keyOf={(a) => a.name}
          nameOf={(a) => a.name}
          render={(a) => <Sleeve album={a.albums[a.albums.length - 1]} />}
          artOf={(a) => a.albums[a.albums.length - 1]}
          // One album is not worth an artist page — straight to the record, as the grid does.
          open={(a) =>
            a.albums.length === 1 ? navigate({ view: 'album', albumId: a.albums[0].id }) : navigate({ view: 'artist', artist: a.name })
          }
          caption={(a) => ({ title: a.name, detail: `${plural(a.albums.length, 'album')} — tap the record to open it` })}
        />
      )}
    />
  )
}

/** The songs on the shelf, as the records themselves. */
export function TrackShelf({ tracks, onPlay, lead }: { tracks: Track[]; onPlay(track: Track): void; lead?: Track }) {
  const albums = useLibraryStore((s) => s.albums)
  const albumOf = useMemo(() => {
    const byId = new Map(albums.map((a) => [a.id, a]))
    return (t: Track) => byId.get(t.albumId)
  }, [albums])
  return (
    <Shelves
      items={tracks}
      lead={lead}
      label="Songs on the shelf"
      row={(row, label, start) => (
        <ShelfRow
          items={row}
          label={label}
          start={start}
          size="record"
          verb="Play"
          keyOf={(t) => t.id}
          nameOf={(t) => t.title}
          render={(t) => <Record45 album={albumOf(t)} grooves={grooveRings(t.durationSec)} />}
          artOf={albumOf}
          open={(t) => onPlay(t)}
          caption={(t) => ({ title: t.title, detail: `${t.artist ?? t.albumArtist ?? 'Unknown artist'} — tap the record to play` })}
        />
      )}
    />
  )
}

interface ShelfRowProps<T> {
  items: T[]
  label: string
  start?: number
  keyOf(item: T): string
  /** The thing's name, for its button: "Open Kid A", "Show Kid A". */
  nameOf(item: T): string
  /** What tapping the middle one does, for its button. */
  verb?: string
  render(item: T): ReactNode
  open(item: T, index: number): void
  caption(item: T): { title: string; detail: string }
  /** Sleeves, or the smaller 45s. */
  size?: 'sleeve' | 'record'
  /** A tap on this acts at once, wherever it is on the shelf (the + tile, or taking records off). */
  direct?(item: T): boolean
  /** A button's whole label, where "verb + name" does not fit (the + tile). */
  labelOf?(item: T): string | undefined
  /** The art whose glow sits behind this item while it is in the middle (`MiddleGlow`). */
  artOf?(item: T): Album | undefined
}

/**
 * Where each shelf was left, by page, shelf and first record — so a shelf you
 * come back to is where you left it (James, 2026-09-11: "preserve the state it
 * was on"). A reordered or refilled shelf starts afresh.
 */
const shelfMemory = new Map<string, number>()

export function ShelfRow<T>({ items, label, start = 0, keyOf, nameOf, verb = 'Open', render, open, caption, size = 'sleeve', direct, labelOf, artOf }: ShelfRowProps<T>) {
  const row = useRef<HTMLDivElement>(null)
  const ticker = useRef<HTMLSpanElement>(null)
  const [middle, setMiddle] = useState(0)
  const reduced = usePrefersReducedMotion()
  /** The ticker's width, as a share of the shelf: a record's share, within reason. */
  const tickerWidth = Math.max(6, Math.min(30, 100 / Math.max(1, items.length)))
  const memoryKey = `${typeof location === 'undefined' ? '' : location.hash || '#/'}|${label}|${items.length > 0 ? keyOf(items[0]) : ''}`

  // Open where this shelf was left, or else with the `start`th record in the
  // middle — before the first paint, so it never shows itself at the wrong
  // place and then jumps.
  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const left = shelfMemory.get(memoryKey)
    if (left !== undefined) {
      el.scrollLeft = left
      return
    }
    const item = el.querySelectorAll<HTMLElement>('[data-shelf-item]')[start]
    if (item) el.scrollLeft = item.offsetLeft + item.offsetWidth / 2 - el.clientWidth / 2
  }, [items, start, memoryKey])

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
      shelfMemory.set(memoryKey, el.scrollLeft)
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
  }, [items, tickerWidth, memoryKey])

  const bringToMiddle = (i: number) => {
    const all = row.current?.querySelectorAll<HTMLElement>('[data-shelf-item]')
    all?.[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }

  const current = items[Math.min(middle, items.length - 1)]
  const text = current === undefined ? null : caption(current)
  const art = current === undefined ? undefined : artOf?.(current)

  return (
    <section aria-label={label} className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* The records, and the glow behind the one in the middle. */}
      <div className="relative isolate">
        {art && <MiddleGlow album={art} size={size} />}
        <div
          ref={row}
          // A sideways swipe — never the page's pull-down to search (`PhoneSearch`).
          data-swipe-x
          // ⚠️ THE PADDING SETS THE SIZE, and every item fills what is left
          // (`w-full`). A percentage WIDTH on a flex item is a share of the box
          // INSIDE the padding, so the two were shares of different things: a
          // record was drawn 44% of 44% of the screen, and the first one could
          // never reach the middle — it sat 48px left of it, and on a shelf of
          // two the second one counted as the middle (found 2026-09-11). Padding
          // of (100% - item) / 2 each side puts the first and last items dead
          // centre at either end.
          className={`flex snap-x snap-mandatory items-end gap-3 overflow-x-auto pt-8 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            size === 'record' ? 'px-[35%] sm:px-[42%] md:px-[45%]' : 'px-[31%] sm:px-[40%] md:px-[43%]'
          }`}
        >
          {items.map((item, i) => {
            const isMiddle = i === middle
            const acts = isMiddle || direct?.(item) === true
            return (
              <button
                key={keyOf(item)}
                type="button"
                data-shelf-item
                onClick={() => (acts ? open(item, i) : bringToMiddle(i))}
                aria-label={labelOf?.(item) ?? (acts ? `${verb} ${nameOf(item)}` : `Show ${nameOf(item)}`)}
                aria-current={isMiddle ? 'true' : undefined}
                className="relative w-full shrink-0 snap-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E05504]"
                style={{
                  transform: `scale(${isMiddle ? 1 : 0.82})`,
                  transformOrigin: 'bottom center',
                  opacity: isMiddle ? 1 : 0.62,
                  transition: reduced ? undefined : 'transform 280ms ease-out, opacity 280ms ease-out',
                }}
              >
                {render(item)}
              </button>
            )
          })}
        </div>
      </div>
      {/* The shelf the records stand on — with a yellow ticker along it for
          how far along the shelf you are (James, 2026-09-11: "a subtle
          indication of the progression on the shelf e.g. a yellow ticker that
          moves from left to right on the shelf as it progressing by swiping"). */}
      <div
        className="relative mx-4 h-3 rounded-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-[0_10px_18px_-8px_rgba(0,0,0,0.5)] sm:mx-6 lg:mx-8 dark:from-amber-800 dark:to-amber-950"
        aria-hidden
      >
        {items.length > 1 && (
          <span
            ref={ticker}
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-yellow-300/90 shadow-[0_0_6px_rgba(253,224,71,0.55)]"
            style={{ width: `${tickerWidth}%`, left: 0 }}
          />
        )}
      </div>
      {text && (
        <div className="mt-4 px-4 text-center" aria-live="polite">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{text.title}</p>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{text.detail}</p>
        </div>
      )}
    </section>
  )
}

/**
 * A soft glow in the middle record's own colours, just behind it and above the
 * plank — a record lit on display (James, 2026-09-11, after a faint full-width
 * art ground "didn't look right"). It is the cover itself, blurred hard and
 * faded to a circle, so it takes the art's colours without picking one. It
 * stays put in the middle of the shelf; the records slide past it.
 *
 * Sized as 1.5× the middle item (the padding in `ShelfRow` makes an item 38% /
 * 20% / 14% of the shelf for sleeves, 30% / 16% / 10% for 45s) and centred on
 * it: an item is square and stands on the row's bottom, so a glow half as
 * tall again sits a sixth of its own height lower.
 */
function MiddleGlow({ album, size }: { album: Album; size: 'sleeve' | 'record' }) {
  const url = coverUrl(album.id, album.cover)
  const hue = fallbackHue(album.id)
  const round = 'radial-gradient(closest-side, black 30%, transparent 100%)'
  const width = size === 'record' ? 'w-[45%] sm:w-[24%] md:w-[15%]' : 'w-[57%] sm:w-[30%] md:w-[21%]'
  return (
    <div
      aria-hidden
      data-middle-glow={album.id}
      className={`pointer-events-none absolute bottom-1 left-1/2 -z-10 aspect-square ${width}`}
      style={{ transform: 'translate(-50%, 16.7%)' }}
    >
      {url ? (
        <img
          key={album.id}
          src={url}
          alt=""
          className="h-full w-full object-cover opacity-[0.55] blur-2xl saturate-150 dark:opacity-[0.6]"
          style={{ maskImage: round, WebkitMaskImage: round, animation: 'jb-glow-in 450ms ease-out both' }}
        />
      ) : (
        <div
          key={album.id}
          className="h-full w-full opacity-[0.45] blur-xl"
          style={{ background: `radial-gradient(closest-side, hsl(${hue} 60% 58%), transparent)`, animation: 'jb-glow-in 450ms ease-out both' }}
        />
      )}
    </div>
  )
}

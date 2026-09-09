import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Cover from './Cover'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type DeckStyle } from '../stores/settingsStore'
import type { Album, Track } from '../lib/types'

// The records waiting to go on — a row of them beside the deck, in the order
// they will be played (James, 2026-09-09).
//
// ⚠️ It shows one item per QUEUE ENTRY, not one per album, and that is the
// literal reading of the request on purpose: "the same disc visualisation that
// will go on the player … when it's loaded into the player, fade it out and
// move the next items into place". What goes on the player is a track. An album
// played in order therefore shows the same sleeve several times over, which is
// exactly what a stack of singles waiting on a jukebox arm looks like, and what
// makes the fade-out mean something — one item leaves per track, not per album.
//
// ⚠️ IT IS `aria-hidden`, and that is not laziness. "Up next" underneath is the
// same queue as a real list with real names and a remove button on every row;
// this is a picture of it. A screen reader that read both would announce every
// upcoming track twice, once as a name and once as a nameless image, and the
// second one cannot be acted on.

/** The size of one medium in the row, and the space between two. */
const ITEM = 76
const GAP = 18

/** How long a record takes to leave the row once it is on the deck. */
const LEAVE_MS = 460

interface Waiting {
  /**
   * The index into `queue` — NOT the track id, and not the position in the row.
   *
   * ⚠️ A queue can hold the same track twice (add an album, add it again), so a
   * track id is not unique here and React would reconcile two different rows
   * into one. `order` is a permutation of queue indices, so each value in it
   * appears exactly once and is the only stable key available.
   */
  key: number
  track: Track
}

export default function UpNextReel() {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const albums = useLibraryStore((s) => s.albums)
  const style = useSettingsStore((s) => s.deck)
  const reduced = usePrefersReducedMotion()

  const box = useRef<HTMLDivElement>(null)
  const fits = useFits(box)

  const upcoming: Waiting[] = order
    .slice(cursor + 1)
    .map((index) => ({ key: index, track: queue[index] }))
    .filter((w) => !!w.track)

  const departing = useDeparting(order[cursor] ?? null, upcoming, reduced)

  if (upcoming.length === 0 && !departing) return null

  return (
    <section className="mt-8" aria-hidden>
      <p className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
        Waiting to go on
      </p>
      {/* ⚠️ `overflow-hidden` is load-bearing rather than defensive. While a
          record is leaving, the row briefly holds one more item than fits — the
          departing one at full width plus everything that will replace it — and
          that extra item sliding in from the clipped edge IS the "move the next
          items into place" half of the effect. Without the clip it would jut
          out of the page instead. */}
      <div ref={box} className="flex items-center overflow-hidden" style={{ gap: GAP }}>
        {departing && (
          <Waiting
            key={`leaving-${departing.key}`}
            track={departing.track}
            albums={albums}
            style={style}
            leaving
          />
        )}
        {upcoming.slice(0, fits).map((w) => (
          <Waiting key={w.key} track={w.track} albums={albums} style={style} />
        ))}
      </div>
    </section>
  )
}

/**
 * How many items fit on one line — measured, not guessed.
 *
 * ⚠️ Measured from the ROW rather than from the viewport, because the row is
 * inside the page container and the stage above it changes width at three
 * breakpoints. A count derived from `window.innerWidth` is right at exactly one
 * of them.
 */
function useFits(box: React.RefObject<HTMLDivElement | null>): number {
  const [fits, setFits] = useState(0)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const width = el.clientWidth
      // n items and n-1 gaps: n*ITEM + (n-1)*GAP <= width.
      setFits(Math.max(0, Math.floor((width + GAP) / (ITEM + GAP))))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [box])

  return fits
}

/**
 * The record that has just gone on the deck, kept in the row long enough to be
 * seen leaving it.
 *
 * ⚠️ It watches the CURRENT track, not the queue length, and compares it to
 * whatever was at the head of the row a moment ago. That is what makes it fire
 * for exactly the case it is about — the next record going on — and stay quiet
 * for every other way the queue can change: adding an album, removing a row,
 * turning shuffle on, or jumping somewhere else entirely. All of those reorder
 * the row, and none of them is a record being loaded.
 */
function useDeparting(
  currentKey: number | null,
  upcoming: Waiting[],
  reduced: boolean,
): Waiting | null {
  const [departing, setDeparting] = useState<Waiting | null>(null)
  const head = useRef<Waiting | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const wasNext = head.current
    head.current = upcoming[0] ?? null

    if (reduced || wasNext === null || wasNext.key !== currentKey) return

    setDeparting(wasNext)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      setDeparting(null)
    }, LEAVE_MS) as unknown as number
    // ⚠️ Keyed on the CURRENT track alone. Adding `upcoming` would re-run this
    // on every queue edit and on every render that rebuilds the array — which
    // is all of them, since it is derived rather than memoised.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, reduced])

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  return departing
}

function Waiting({
  track, albums, style, leaving = false,
}: { track: Track; albums: Album[]; style: DeckStyle; leaving?: boolean }) {
  const album = albums.find((a) => a.id === track.albumId)
  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{
        // The animation shrinks `max-width` to zero, and everything to the
        // right of it slides along to fill the space. Setting it here rather
        // than in the keyframes is what lets one rule serve any item size.
        maxWidth: ITEM,
        width: ITEM,
        ...(leaving ? { animation: `jb-reel-out ${LEAVE_MS}ms ease-in forwards` } : null),
      }}
    >
      <Medium album={album} style={style} />
    </div>
  )
}

/**
 * One waiting record, disc or cassette.
 *
 * ⚠️ NOT the deck faces from `components/decks/`, and that is deliberate. Those
 * draw the MACHINE — a tonearm, a laser sled on its rail, a Discman body with
 * buttons on it — which at 76px is a smudge, and none of which is waiting to go
 * on: the machine stays where it is. What belongs in this row is the medium
 * itself, so these are three deliberately plain drawings of one.
 *
 * The cost of that decision is that the media are now drawn in two places, and
 * the honest guard against drift is that these three are trivial: a circle with
 * the artwork in the middle, twice, and a rectangle with the artwork across it.
 * If one of them ever needs a detail from the real face, it is the wrong shape
 * for this row.
 */
function Medium({ album, style }: { album: Album | undefined; style: DeckStyle }) {
  if (style === 'cassette') {
    return (
      <div className="flex h-[76px] w-[76px] items-center">
        <div className="relative h-[50px] w-full overflow-hidden rounded-[5px] bg-slate-900 shadow-md ring-1 ring-slate-900/20 dark:bg-[#0b1120] dark:ring-white/10">
          {/* The inlay card across the middle, with the two reel holes over it. */}
          <div className="absolute inset-x-[8%] top-[14%] bottom-[30%] overflow-hidden rounded-[2px]">
            <Cover album={album} className="h-full w-full" rounded={false} />
          </div>
          <div className="absolute inset-x-[18%] top-[26%] flex justify-between">
            {[0, 1].map((i) => (
              <span key={i} className="block h-[13px] w-[13px] rounded-full bg-slate-200/90 ring-1 ring-slate-900/30" />
            ))}
          </div>
          <span className="absolute inset-x-[14%] bottom-[10%] block h-[5px] rounded-sm bg-slate-700/80" />
        </div>
      </div>
    )
  }

  if (style === 'cd') {
    return (
      <div
        className="relative h-[76px] w-[76px] overflow-hidden rounded-full shadow-md ring-1 ring-slate-900/10"
        style={{ background: 'radial-gradient(circle at 50% 50%, #eff3f8 0%, #c6cfdc 42%, #9dabbd 74%, #808d9f 100%)' }}
      >
        <div
          className="absolute inset-0 rounded-full mix-blend-overlay opacity-30"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(255,0,140,.75), rgba(255,196,0,.75), rgba(0,224,180,.75), rgba(70,120,255,.75), rgba(255,0,140,.75))',
          }}
        />
        <div className="absolute overflow-hidden rounded-full ring-1 ring-slate-900/20" style={{ inset: '30%' }}>
          <Cover album={album} className="h-full w-full" rounded={false} />
        </div>
        <div className="absolute rounded-full bg-slate-100 ring-1 ring-slate-900/25 dark:bg-slate-900" style={{ inset: '45%' }} />
      </div>
    )
  }

  return (
    <div className="relative h-[76px] w-[76px] overflow-hidden rounded-full bg-slate-900 shadow-md ring-1 ring-slate-900/10 dark:bg-[#12192b]">
      <div
        className="absolute inset-0 rounded-full opacity-[0.16]"
        style={{
          background:
            'repeating-radial-gradient(circle at 50% 50%, transparent 0 2px, rgba(255,255,255,.5) 2px 3px)',
        }}
      />
      <div className="absolute overflow-hidden rounded-full ring-1 ring-white/10" style={{ inset: '30%' }}>
        <Cover album={album} className="h-full w-full" rounded={false} />
      </div>
      <div className="absolute rounded-full bg-slate-100 dark:bg-slate-900" style={{ inset: '47%' }} />
    </div>
  )
}

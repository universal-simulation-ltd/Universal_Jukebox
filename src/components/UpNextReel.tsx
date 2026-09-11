import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Cover from './Cover'
import { plural } from '../lib/format'
import { resolveDeck } from '../lib/decks'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type DeckStyle } from '../stores/settingsStore'
import type { Album, Track } from '../lib/types'

// The records waiting to go on — a row of them beside the deck, in the order
// they will be played, each one named, and each one a way of jumping straight
// to that track (James, 2026-09-09).
//
// ⚠️ It shows one item per QUEUE ENTRY, not one per album, and that is the
// literal reading of the request on purpose: "the same disc visualisation that
// will go on the player … when it's loaded into the player, fade it out and
// move the next items into place". What goes on the player is a track. An album
// played in order therefore shows the same sleeve several times over, which is
// exactly what a stack of singles waiting on a jukebox arm looks like, and what
// makes the fade-out mean something — one item leaves per track, not per album.
//
// ⚠️ IT USED TO BE `aria-hidden`, and it is not any more. That was right while
// this was a picture of the queue: "Up next" underneath is the same list with
// real names and a remove button, and a screen reader that read both would have
// announced every upcoming track twice, the second time as a nameless image
// that could not be acted on. Both halves of that have now changed — these
// carry names, and each one is a button that plays its track — and an
// `aria-hidden` button is worse than a duplicated one: it is unreachable by
// keyboard while still taking a tab stop's worth of visual space. So the row is
// exposed, and the DRAWINGS inside it stay hidden.
//
// What survives of the old argument is that this is deliberately the SHORT
// version — as many as fit on one line, no remove button, no scroll. "Up next"
// underneath is still the complete list, and is still where you go to change
// the queue rather than to move about in it.

/**
 * One column in the row, and the space between two.
 *
 * ⚠️ `ITEM` is the COLUMN, `MEDIA` is the drawing inside it. They were one
 * number until the titles arrived, and 76px is not enough width for a track
 * name to say anything — at that size almost every title truncates to two
 * words and an ellipsis, which is a row of identical grey stubs rather than a
 * queue you can read.
 */
const ITEM = 104
const MEDIA = 76
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
  /**
   * Where this track sits in `order` — which is what `jumpTo` takes, and what
   * `resolveDeck` counts the rotation along.
   *
   * ⚠️ NOT the same number as `key`, and passing one where the other belongs
   * plays a different track than the one whose picture was pressed. `key` is a
   * position in the QUEUE; this is a position in the SEQUENCE.
   */
  orderIndex: number
  track: Track
}

export default function UpNextReel({ onMore }: { onMore?: () => void } = {}) {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const jumpTo = usePlayerStore((s) => s.jumpTo)
  const albums = useLibraryStore((s) => s.albums)
  const setting = useSettingsStore((s) => s.deck)
  const eras = useSettingsStore((s) => s.deckEras)
  // The machine is the ALBUM's — see `resolveDeck`. A track stands in only
  // where its album is not in the library.
  const datedBy = (track: Track | undefined) =>
    track ? (albums.find((a) => a.id === track.albumId) ?? track) : undefined
  const reduced = usePrefersReducedMotion()

  const box = useRef<HTMLDivElement>(null)
  const fits = useFits(box)

  const upcoming: Waiting[] = order
    .slice(cursor + 1)
    .map((index, i) => ({ key: index, orderIndex: cursor + 1 + i, track: queue[index] }))
    .filter((w) => !!w.track)

  const departing = useDeparting(order[cursor] ?? null, upcoming, reduced)

  /**
   * The last slot in the row counts what did not fit, rather than being the
   * last record that happened to (James, 2026-09-09: "on the final 'waiting to
   * go on' show a disk with [X] more records").
   *
   * ⚠️ It REPLACES a record rather than being added after them. `fits` is how
   * many columns there is room for, so appending a thirteenth item to a row
   * with room for twelve just pushes it under the clip — the count would be the
   * one thing in the row nobody could see.
   *
   * ⚠️ And only when there is room for at least two. At `fits === 1` the choice
   * is between showing the next record and showing a number instead of it, and
   * "what is on next" is what the row is for.
   */
  const counting = fits >= 2 && upcoming.length > fits
  const shown = upcoming.slice(0, counting ? fits - 1 : fits)
  const more = upcoming.length - shown.length

  if (upcoming.length === 0 && !departing) return null

  return (
    <section className="mt-8" aria-labelledby="jb-reel-heading">
      <p
        id="jb-reel-heading"
        className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500"
      >
        Waiting to go on
      </p>
      {/* ⚠️ `overflow-hidden` is load-bearing rather than defensive. While a
          record is leaving, the row briefly holds one more item than fits — the
          departing one at full width plus everything that will replace it — and
          that extra item sliding in from the clipped edge IS the "move the next
          items into place" half of the effect. Without the clip it would jut
          out of the page instead.

          ⚠️ `items-start`, not `items-center`. The titles under the drawings are
          one or two lines depending on how long they are, and centring makes
          the media themselves sit at different heights — a row of records that
          is not level.

          ⚠️ `-mt-1` is not spacing — it is the other half of the HEADROOM FOR
          THE HOVER LIFT. `overflow-hidden` clips at the padding box, so with no
          padding anywhere the clip line fell exactly on the top of each record
          and the 3px lift took a 3px slice off it (James, 2026-09-09: "on hover
          it moves up correctly but the top of the record shouldn't be
          clipped"). Each item carries `pt-1`, which moves the records 4px down
          inside their own clip; this pulls the row 4px back up so the row lands
          exactly where it did before and nothing else on the page moves.

          ⚠️ `overflow-x-hidden` is NOT the fix, tempting as it looks: a
          single-axis `hidden` computes the OTHER axis to `auto`, which clips
          just the same and adds a scrollbar for it. */}
      <div ref={box} className="-mt-1 flex items-start overflow-hidden" style={{ gap: GAP }}>
        {departing && (
          <Waiting
            key={`leaving-${departing.key}`}
            item={departing}
            albums={albums}
            style={resolveDeck(setting, datedBy(departing.track), eras)}
            leaving
          />
        )}
        {shown.map((w) => (
          <Waiting
            key={w.key}
            item={w}
            albums={albums}
            // ⚠️ Resolved per ITEM, not once for the row. Under `deck: 'automatic'`
            // this is the whole point of the machine being a pure function of
            // the album: the row shows what each track is actually going
            // to be played on, and it agrees with the deck because both of them
            // asked `resolveDeck` rather than each other.
            style={resolveDeck(setting, datedBy(w.track), eras)}
            onJump={() => jumpTo(w.orderIndex)}
          />
        ))}
        {counting && <MoreRecords count={more} onOpen={onMore} />}
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
  item, albums, style, onJump, leaving = false,
}: {
  item: Waiting
  albums: Album[]
  style: DeckStyle
  onJump?: () => void
  leaving?: boolean
}) {
  const { track } = item
  const album = albums.find((a) => a.id === track.albumId)
  const inner = (
    <>
      <div className="mx-auto" style={{ width: MEDIA }} aria-hidden>
        <Medium album={album} style={style} />
      </div>
      {/* ⚠️ `break-words` and no truncation. A title clipped to one line is a
          row of grey stubs — the reason the column got wider — and a jukebox
          strip has always been a small label with a long name squeezed onto it.
          Two lines is the common case; three is rare and allowed. */}
      <span className="mt-2 block text-[11.5px] leading-snug font-medium break-words text-slate-700 dark:text-slate-200">
        {track.title}
      </span>
      <span className="mt-0.5 block truncate text-[10.5px] text-slate-400 dark:text-slate-500">
        {track.artist ?? track.albumArtist ?? 'Unknown artist'}
      </span>
    </>
  )

  return (
    <div
      // ⚠️ `pt-1` for the same reason the row has it: this box clips too (the
      // leave animation shrinks its `max-width`), and without the padding it
      // clips the top off the record the moment the button inside it lifts.
      className="shrink-0 overflow-hidden pt-1"
      style={{
        // The animation shrinks `max-width` to zero, and everything to the
        // right of it slides along to fill the space. Setting it here rather
        // than in the keyframes is what lets one rule serve any item size —
        // `jb-reel-out` reads this custom property for its starting width, so
        // the two cannot drift apart when the column is resized.
        ['--jb-item' as string]: `${ITEM}px`,
        maxWidth: ITEM,
        width: ITEM,
        ...(leaving ? { animation: `jb-reel-out ${LEAVE_MS}ms ease-in forwards` } : null),
      }}
    >
      {/* ⚠️ The departing item is NOT a button. It has already been loaded onto
          the deck, so it is no longer a place in the queue to jump to — and a
          control that disappears from under the pointer 460ms after it appears
          is one that gets pressed by accident. */}
      {leaving || !onJump ? (
        <div className="text-center">{inner}</div>
      ) : (
        <button
          type="button"
          onClick={onJump}
          aria-label={`Play ${track.title} now`}
          className="w-full cursor-pointer rounded-lg text-center transition hover:-translate-y-[3px] hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E05504] dark:hover:text-orange-400"
        >
          {inner}
        </button>
      )}
    </div>
  )
}

/**
 * The last column: a stack of records with a number on it, standing for
 * everything that did not fit on the line.
 *
 * ⚠️ IT IS THE WAY INTO "UP NEXT" (James, 2026-09-11: "Only show the up next
 * when they click the + X record"). The full list — names, a remove button on
 * every entry — is hidden until this is tapped; it used to sit permanently under
 * a row that already showed most of it.
 *
 * ⚠️ It is drawn as a STACK — two edges peeking out behind the front disc —
 * rather than as one more record with a number on it. Every other item in the
 * row is exactly one record going on the deck; this one is several, and the
 * only thing that says so at 76px is the shape.
 */
function MoreRecords({ count, onOpen }: { count: number; onOpen?: () => void }) {
  return (
    <div className="shrink-0 pt-1 text-center" style={{ maxWidth: ITEM, width: ITEM }}>
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        aria-label={`Show the ${count} more records in Up next`}
        className="w-full cursor-pointer rounded-lg text-center transition enabled:hover:-translate-y-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E05504] disabled:cursor-default"
      >
      <div className="mx-auto" style={{ width: MEDIA }} aria-hidden>
        <div className="relative" style={{ height: MEDIA, width: MEDIA }}>
          {/* The two behind, offset up and to the right so they read as edges
              rather than as a halo. */}
          {[2, 1].map((i) => (
            <span
              key={i}
              className="absolute rounded-full bg-slate-500 dark:bg-slate-600"
              style={{ inset: 0, transform: `translate(${i * 4}px, ${i * -3}px)`, opacity: 0.55 / i }}
            />
          ))}
          {/* ⚠️ The same dark disc as a real one in this row, not a pale
              placeholder. It sat in slate-200 for a while and read as a hole in
              the row rather than as more records — the count in the label is
              what says it is not one you can play, and that is enough. */}
          <span className="absolute inset-0 rounded-full bg-slate-900 shadow-md ring-1 ring-slate-900/10 dark:bg-[#12192b]" />
          {/* Grooves, at the same spacing as a real one in this row, so the
              stack belongs to the same set of drawings. */}
          <span
            className="absolute inset-0 rounded-full opacity-[0.16]"
            style={{
              background:
                'repeating-radial-gradient(circle at 50% 50%, transparent 0 2px, rgba(255,255,255,.5) 2px 3px)',
            }}
          />
          <span className="absolute inset-[28%] flex items-center justify-center rounded-full bg-slate-100 text-[15px] font-semibold text-slate-600 tabular-nums ring-1 ring-white/10 dark:bg-slate-900 dark:text-slate-300">
            +{count}
          </span>
        </div>
      </div>
      <span className="mt-2 block text-[11.5px] leading-snug font-medium text-slate-500 dark:text-slate-400">
        {plural(count, 'more record')}
      </span>
      <span className="mt-0.5 block text-[10.5px] text-slate-400 dark:text-slate-500">
        in the queue
      </span>
      </button>
    </div>
  )
}

/**
 * One waiting record, disc, cassette or single.
 *
 * ⚠️ NOT the deck faces from `components/decks/`, and that is deliberate. Those
 * draw the MACHINE — a tonearm, a laser sled on its rail, a Discman body with
 * buttons on it, a whole jukebox cabinet — which at 76px is a smudge, and none
 * of which is waiting to go on: the machine stays where it is. What belongs in
 * this row is the medium itself, so these are four deliberately plain drawings
 * of one.
 *
 * The cost of that decision is that the media are now drawn in two places, and
 * the honest guard against drift is that these are trivial: a circle with the
 * artwork in the middle, three times, and a rectangle with the artwork across
 * it. If one of them ever needs a detail from the real face, it is the wrong
 * shape for this row.
 */
export function Medium({ album, style }: { album: Album | undefined; style: DeckStyle }) {
  // The pocket player IS its medium — there is nothing to take out of it — so
  // the row shows the player itself, small: the art on its screen and the
  // wheel. Portrait, so it stands in the middle of the square.
  if (style === 'pocket') {
    return (
      <div className="flex h-[76px] w-[76px] items-center justify-center">
        <div className="relative h-[72px] w-[50px] rounded-[9px] bg-gradient-to-br from-slate-50 to-slate-300 shadow-md ring-1 ring-slate-400/60">
          <div className="absolute inset-x-[7%] top-[5%] h-[42%] overflow-hidden rounded-[3px] bg-slate-900 p-[2px]">
            <Cover album={album} className="h-full w-full" rounded={false} />
          </div>
          <span className="absolute left-1/2 top-[53%] block h-[26px] w-[26px] -translate-x-1/2 rounded-full bg-white ring-1 ring-slate-300">
            <span className="absolute inset-[34%] block rounded-full bg-slate-100 ring-1 ring-slate-300" />
          </span>
        </div>
      </div>
    )
  }

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

  // ⚠️ The jukebox's medium is a 45, not the LP above it: a bigger label and a
  // hole you can see across a room. It is the only thing distinguishing the two
  // record decks in this row, since neither of their machines is drawn here —
  // get it wrong and switching between vinyl and jukebox appears to do nothing.
  const single = style === 'jukebox'
  return (
    <div className="relative h-[76px] w-[76px] overflow-hidden rounded-full bg-slate-900 shadow-md ring-1 ring-slate-900/10 dark:bg-[#12192b]">
      <div
        className="absolute inset-0 rounded-full opacity-[0.16]"
        style={{
          background:
            'repeating-radial-gradient(circle at 50% 50%, transparent 0 2px, rgba(255,255,255,.5) 2px 3px)',
        }}
      />
      <div
        className="absolute overflow-hidden rounded-full ring-1 ring-white/10"
        style={{ inset: single ? '25%' : '30%' }}
      >
        <Cover album={album} className="h-full w-full" rounded={false} />
      </div>
      <div
        className="absolute rounded-full bg-slate-100 dark:bg-slate-900"
        style={{ inset: single ? '43%' : '47%' }}
      />
    </div>
  )
}

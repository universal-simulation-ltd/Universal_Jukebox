import { useRef, useState } from 'react'
import { resolveDeck } from '../lib/decks'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import type { Album, Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type DeckStyle } from '../stores/settingsStore'
import { Medium } from './UpNextReel'

// The deck, with the records either side of it (James, 2026-09-10: "have the
// previous record peeking out from left and next from right so you can swipe
// to previous or next track easily from the animation").
//
// Swipe the deck left for the next record and right for the previous one, or
// tap the one peeking in from that side. The peeking records are the queue's
// own neighbours — the tracks `jumpTo` goes to — so what you see at the edge is
// exactly what a swipe brings on.
//
// ⚠️ TOUCH ONLY for the swipe. A mouse drag across the deck is not a gesture
// anybody expects, and the deck is also a button (it opens the album), so a
// mouse press that wandered a few pixels must still be a click.
//
// ⚠️ A SWIPE MUST NOT ALSO BE A CLICK. The deck opens its album on click, and
// during the countdown a click anywhere skips it (`App.tsx`). The click that
// follows a swipe is swallowed in the CAPTURE phase, before either sees it.
//
// ⚠️ `touch-action: pan-y` hands vertical drags to the page, so scrolling Now
// Playing with a thumb on the record still scrolls. The phone's back gesture
// lives at the very edge of the screen, outside where a swipe here starts.

const SWIPE_PX = 56
const PEEK = 0.62

export default function DeckSwiper({ size, children }: { size: number; children: React.ReactNode }) {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const repeat = usePlayerStore((s) => s.repeat)
  const jumpTo = usePlayerStore((s) => s.jumpTo)
  const albums = useLibraryStore((s) => s.albums)
  const setting = useSettingsStore((s) => s.deck)
  const eras = useSettingsStore((s) => s.deckEras)
  const reduced = usePrefersReducedMotion()

  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const [drag, setDrag] = useState(0)

  /** The order index `delta` away, honouring repeat-all at either end. */
  const indexAt = (delta: number): number | null => {
    if (order.length === 0 || cursor < 0) return null
    const i = cursor + delta
    if (i >= 0 && i < order.length) return i
    if (repeat === 'all' && order.length > 1) return (i + order.length) % order.length
    return null
  }
  const prevIndex = indexAt(-1)
  const nextIndex = indexAt(1)
  const trackAt = (index: number | null): Track | undefined => (index === null ? undefined : queue[order[index]])
  const albumAt = (index: number | null): Album | undefined => {
    const track = trackAt(index)
    return track ? albums.find((a) => a.id === track.albumId) : undefined
  }
  // ⚠️ Each neighbour on its OWN machine (James, 2026-09-10: "it needs to
  // reflect what device will be playing too"). Under `automatic` the record
  // before and the record after can be a cassette and a pocket player; the
  // peek shows what a swipe will actually put on.
  const styleAt = (index: number | null): DeckStyle => resolveDeck(setting, albumAt(index) ?? trackAt(index), eras)

  const peek = Math.round(size * PEEK)

  return (
    // Full width of the SCREEN on a phone, so the neighbours can come in from
    // its edges rather than from the page's padding; clipped, so they never
    // widen the page. From `lg` up the deck sits in a column beside the words,
    // and there is no screen edge next to it to peek from.
    <div className="relative flex w-screen justify-center overflow-hidden py-2 lg:w-auto lg:overflow-visible">
      {prevIndex !== null && (
        <Peek album={albumAt(prevIndex)} style={styleAt(prevIndex)} side="left" size={peek} onClick={() => jumpTo(prevIndex)} />
      )}
      {nextIndex !== null && (
        <Peek album={albumAt(nextIndex)} style={styleAt(nextIndex)} side="right" size={peek} onClick={() => jumpTo(nextIndex)} />
      )}
      <div
        className="relative shrink-0"
        style={{
          touchAction: 'pan-y',
          transform: drag ? `translateX(${drag}px)` : undefined,
          transition: drag || reduced ? 'none' : 'transform 220ms ease-out',
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== 'touch') return
          start.current = { x: e.clientX, y: e.clientY }
          swiped.current = false
        }}
        onPointerMove={(e) => {
          if (!start.current) return
          const dx = e.clientX - start.current.x
          const dy = e.clientY - start.current.y
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) && !reduced) {
            setDrag(Math.max(-110, Math.min(110, dx * 0.6)))
          }
        }}
        onPointerUp={(e) => {
          const from = start.current
          start.current = null
          setDrag(0)
          if (!from) return
          const dx = e.clientX - from.x
          const dy = e.clientY - from.y
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.3) return
          swiped.current = true
          if (dx < 0 && nextIndex !== null) jumpTo(nextIndex)
          else if (dx > 0 && prevIndex !== null) jumpTo(prevIndex)
        }}
        onPointerCancel={() => {
          start.current = null
          setDrag(0)
        }}
        onClickCapture={(e) => {
          if (!swiped.current) return
          swiped.current = false
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * A neighbour, most of it off the edge of the screen — drawn as its own MEDIUM
 * (a record, a disc, a cassette, a single, a pocket player), the same drawing
 * the row of records waiting to go on uses, scaled up.
 */
function Peek({
  album, style, side, size, onClick,
}: { album: Album | undefined; style: DeckStyle; side: 'left' | 'right'; size: number; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={`${side === 'left' ? 'Previous' : 'Next'}${album ? `: ${album.title}` : ''}`}
      className="absolute top-1/2 opacity-60 transition-opacity hover:opacity-90 focus-visible:opacity-100 lg:hidden"
      style={{
        width: size,
        height: size,
        transform: 'translateY(-50%)',
        // Just under half of it on screen: enough to see WHICH record, and on
        // what, not enough to compete with the one that is playing.
        [side]: -Math.round(size * 0.58),
      }}
    >
      {/* `Medium` is drawn at 76px; scaled rather than redrawn, so the two
          rows can never disagree about what a cassette looks like. */}
      <span className="block origin-top-left" style={{ width: 76, height: 76, transform: `scale(${size / 76})` }}>
        <Medium album={album} style={style} />
      </span>
    </button>
  )
}

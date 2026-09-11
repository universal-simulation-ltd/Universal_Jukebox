import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { resolveDeck } from '../lib/decks'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import type { Album, Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type DeckStyle } from '../stores/settingsStore'
import { ARC_ACROSS, ARC_RISE, DeckSlideContext, type DeckSlide } from './decks/slide'
import { Medium } from './UpNextReel'

// The deck, with the records either side of it (James, 2026-09-10: "have the
// previous record peeking out from left and next from right so you can swipe
// to previous or next track easily from the animation").
//
// ⚠️ THE RECORDS MOVE WITH THE FINGER (James, 2026-09-11: "have the prev or
// next track swipe in at same time. On the vinyl the needle could stay and just
// the records move"). The record on the deck follows the drag — on vinyl only
// the record, so the tonearm stays put (`DeckSlide`) — while the neighbour on
// the side it is going towards slides in and grows to the deck's size. Let go
// past `SWIPE_PX` and both finish the move; the arriving record is then HELD at
// the centre (`arriving`) until the deck itself shows it, so the change-over's
// own record swap happens underneath rather than as a jump.
//
// Tap a peeking record to change track too. The peeks are the queue's own
// neighbours — the tracks `jumpTo` goes to.
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
/** How long the records take to finish a swipe once the finger lets go. */
const SETTLE_MS = 240
/** The longest the arriving record is held, waiting for the deck to show it. */
const HOLD_MAX_MS = 2500

interface Arriving {
  album: Album | undefined
  style: DeckStyle
}

export default function DeckSwiper({
  size, showing, children,
}: { size: number; showing?: string; children: React.ReactNode }) {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const repeat = usePlayerStore((s) => s.repeat)
  const phase = usePlayerStore((s) => s.deckPhase)
  const blend = usePlayerStore((s) => s.blend)
  const jumpTo = usePlayerStore((s) => s.jumpTo)
  const albums = useLibraryStore((s) => s.albums)
  const setting = useSettingsStore((s) => s.deck)
  const eras = useSettingsStore((s) => s.deckEras)
  const reduced = usePrefersReducedMotion()

  const box = useRef<HTMLDivElement>(null)
  const leftPeek = useRef<HTMLButtonElement>(null)
  const rightPeek = useRef<HTMLButtonElement>(null)
  const start = useRef<{ x: number; y: number; toLeft: number; toRight: number } | null>(null)
  const swiped = useRef(false)
  const settle = useRef<number | null>(null)
  /**
   * A swipe has been let go and is being finished and held. Set AT the release,
   * synchronously — a swipe onto another record starts a record crossfade, and
   * its slide must not run on top of the swipe's own; state would only say so a
   * render later, after the crossfade's effect had already started.
   */
  const holding = useRef(false)

  /** The records' offset: the finger's travel, then the end of the swipe. */
  const [x, setX] = useState(0)
  const [animate, setAnimate] = useState(false)
  /** How far a full swipe travels, each way — measured at the touch. */
  const [reach, setReach] = useState({ toLeft: size, toRight: size })
  /** After a swipe: the record that came in, held at the centre. */
  const [arriving, setArriving] = useState<Arriving | null>(null)
  /** A record crossfade's incoming record, on its way from the right. */
  const [incoming, setIncoming] = useState<(Arriving & { run: boolean }) | null>(null)
  /** How long the records take to move: a swipe's settle, or a whole crossfade. */
  const [ms, setMs] = useState(SETTLE_MS)

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
  /** A peek's size as a share of the deck's. */
  const peekScale = peek / size
  /** How much lower the records at the side sit — the wheel's curve. */
  const sag = Math.round(size * 0.16)

  // ⚠️ THE DECK RECORD'S OWN CENTRE, MEASURED. The box also holds the space
  // under the deck (its caption, the first-run tip), so its middle is BELOW the
  // record — and a record brought to the box's middle ended up below where the
  // one it replaced had been (James, 2026-09-11). Everything that stands in for
  // the deck is placed against this instead.
  const deckWrap = useRef<HTMLDivElement>(null)
  const [centreY, setCentreY] = useState(8 + size / 2)
  useLayoutEffect(() => {
    const measureCentre = () => {
      const deck = deckWrap.current?.querySelector('[role="button"]')
      const outer = box.current
      if (!deck || !outer) return
      const r = deck.getBoundingClientRect()
      setCentreY(Math.round(r.top - outer.getBoundingClientRect().top + r.height / 2))
    }
    measureCentre()
    window.addEventListener('resize', measureCentre)
    return () => window.removeEventListener('resize', measureCentre)
  }, [size, showing])

  // ⚠️ A CROSSFADE ACROSS A CHANGE OF RECORD SLIDES THE MACHINES (James,
  // 2026-09-11) — the same move as a swipe, driven by the player over the
  // whole blend: the record on the deck slides out to the left while the next
  // one comes in from the right, growing, until it is in the middle and the
  // blend is over; then it is held there like a swiped one. The player has
  // already moved the cursor, so the arrival is the CURRENT track, and the
  // peeks (now a track further on) hide until it lands. Read from a ref so the
  // effect runs once per blend and not on every render.
  const latest = useRef({ queue, order, cursor, albums, setting, eras, arriving, reduced })
  latest.current = { queue, order, cursor, albums, setting, eras, arriving, reduced }
  const blendTimer = useRef<number | null>(null)
  useEffect(() => {
    const now = latest.current
    if (!blend || holding.current || now.arriving || now.reduced) return
    const track = now.queue[now.order[now.cursor]]
    const album = track ? now.albums.find((a) => a.id === track.albumId) : undefined
    const style = resolveDeck(now.setting, album ?? track, now.eras)
    const r = measure()
    setReach(r)
    setMs(blend.ms)
    setIncoming({ album, style, run: false })
    // Two frames: drawn at the edge first, THEN told to move, or it would jump.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setIncoming((current) => (current ? { ...current, run: true } : current))
        setAnimate(true)
        setX(-r.toRight)
      }),
    )
    if (blendTimer.current !== null) window.clearTimeout(blendTimer.current)
    blendTimer.current = window.setTimeout(() => {
      blendTimer.current = null
      setIncoming(null)
      setArriving({ album, style })
    }, blend.ms)
    // `measure` reads refs only; the rest comes through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blend])

  useEffect(() => () => {
    if (blendTimer.current !== null) window.clearTimeout(blendTimer.current)
  }, [])

  // Let the held record go once the deck shows it and its own swap is over —
  // or after a while regardless, so a slow change-over cannot leave a picture
  // standing in for the deck.
  const heldFor = arriving?.album?.id
  useEffect(() => {
    if (!arriving) return
    const release = () => {
      holding.current = false
      setAnimate(false)
      setX(0)
      setArriving(null)
      setMs(SETTLE_MS)
    }
    if (heldFor !== undefined && showing === heldFor && phase === 'idle') {
      release()
      return
    }
    const timer = window.setTimeout(release, HOLD_MAX_MS)
    return () => window.clearTimeout(timer)
  }, [arriving, heldFor, showing, phase])

  useEffect(() => () => {
    if (settle.current !== null) window.clearTimeout(settle.current)
  }, [])

  /** From the centre of the deck to the centre of each peek. */
  const measure = () => {
    const centre = (el: Element | null) => {
      const r = el?.getBoundingClientRect()
      return r ? r.left + r.width / 2 : null
    }
    const mid = centre(box.current)
    const left = centre(leftPeek.current)
    const right = centre(rightPeek.current)
    return {
      toLeft: mid !== null && left !== null ? Math.abs(mid - left) : size,
      toRight: mid !== null && right !== null ? Math.abs(right - mid) : size,
    }
  }

  // How far through a swipe the records are, 0 → 1, towards whichever side.
  const travel = x < 0 ? reach.toRight : reach.toLeft
  const progress = travel > 0 ? Math.min(1, Math.abs(x) / travel) : 0
  const grow = size / peek

  // The record leaving sinks and shrinks towards a peek's place — on a curve,
  // level at first (`ARC_SINK`); during a drag, the same curve from `progress`.
  const slide: DeckSlide = {
    x,
    y: sag * progress * progress,
    scale: 1 - (1 - peekScale) * progress,
    opacity: arriving ? 0 : 1 - (incoming ? 0.85 : 0.6) * progress,
    animate,
    ms,
  }

  /** A record crossfade is sliding the machines — the peeks are a track stale. */
  const swapping = incoming !== null

  /** A peek: the one being swiped towards comes in and grows; the other stays. */
  const peekMotion = (side: 'left' | 'right') => {
    const towards = !swapping && ((side === 'right' && x < 0) || (side === 'left' && x > 0))
    return {
      shift: towards ? x : 0,
      // Rising out of the sag at once, then level — the arriving half of the arc.
      lift: towards ? -sag * (1 - (1 - progress) * (1 - progress)) : 0,
      scale: towards ? 1 + (grow - 1) * progress : 1,
      opacity: arriving || swapping ? 0 : towards ? 0.6 + 0.4 * progress : 0.6,
      animate: animate && !arriving && !swapping,
    }
  }

  return (
    // Full width of the SCREEN on a phone, so the neighbours can come in from
    // its edges rather than from the page's padding; clipped, so they never
    // widen the page. From `lg` up the deck sits in a column beside the words,
    // and there is no screen edge next to it to peek from.
    <div ref={box} className="relative flex w-screen justify-center overflow-hidden py-2 lg:w-auto lg:overflow-visible">
      {prevIndex !== null && (
        <Peek
          ref={leftPeek}
          album={albumAt(prevIndex)}
          style={styleAt(prevIndex)}
          side="left"
          size={peek}
          top={centreY + sag}
          motion={peekMotion('left')}
          onClick={() => jumpTo(prevIndex)}
        />
      )}
      {nextIndex !== null && (
        <Peek
          ref={rightPeek}
          album={albumAt(nextIndex)}
          style={styleAt(nextIndex)}
          side="right"
          size={peek}
          top={centreY + sag}
          motion={peekMotion('right')}
          onClick={() => jumpTo(nextIndex)}
        />
      )}
      {/* A record crossfade's next record: drawn at the right-hand peek's place
          and size, then sent to the middle over the whole blend. */}
      {incoming && (
        <div
          className="pointer-events-none absolute left-1/2 z-10"
          style={{ top: centreY, width: size, height: size, transform: 'translate(-50%, -50%)' }}
          aria-hidden
        >
          {/* Across on one curve, up and bigger on another: the arc. */}
          <div
            className="h-full w-full"
            style={{
              transform: incoming.run ? 'translateX(0)' : `translateX(${reach.toRight}px)`,
              transition: incoming.run ? `transform ${ms}ms ${ARC_ACROSS}` : 'none',
            }}
          >
            <div
              className="h-full w-full"
              style={{
                transform: incoming.run ? 'translateY(0) scale(1)' : `translateY(${sag}px) scale(${peekScale})`,
                transition: incoming.run ? `transform ${ms}ms ${ARC_RISE}` : 'none',
              }}
            >
              <span className="block origin-top-left" style={{ width: 76, height: 76, transform: `scale(${size / 76})` }}>
                <Medium album={incoming.album} style={incoming.style} />
              </span>
            </div>
          </div>
        </div>
      )}
      {/* The record that came in, standing in at the centre until the deck
          shows it — drawn exactly where, and as big as, the peek finished. */}
      {arriving && (
        <div
          className="pointer-events-none absolute left-1/2 z-10"
          style={{ top: centreY, width: size, height: size, transform: 'translate(-50%, -50%)' }}
          aria-hidden
        >
          <span className="block origin-top-left" style={{ width: 76, height: 76, transform: `scale(${size / 76})` }}>
            <Medium album={arriving.album} style={arriving.style} />
          </span>
        </div>
      )}
      <div
        ref={deckWrap}
        className="relative shrink-0"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          if (e.pointerType !== 'touch' || arriving || incoming || holding.current) return
          setMs(SETTLE_MS)
          const r = measure()
          setReach(r)
          start.current = { x: e.clientX, y: e.clientY, ...r }
          swiped.current = false
          setAnimate(false)
        }}
        onPointerMove={(e) => {
          const from = start.current
          if (!from || reduced) return
          const dx = e.clientX - from.x
          const dy = e.clientY - from.y
          if (Math.abs(dx) <= 8 || Math.abs(dx) <= Math.abs(dy)) return
          // Towards a side with no record, the deck only gives a little.
          const open = dx < 0 ? nextIndex !== null : prevIndex !== null
          setX(open ? Math.max(-from.toRight, Math.min(from.toLeft, dx)) : Math.max(-40, Math.min(40, dx * 0.25)))
        }}
        onPointerUp={(e) => {
          const from = start.current
          start.current = null
          if (!from) return
          const dx = e.clientX - from.x
          const dy = e.clientY - from.y
          const target = dx < 0 ? nextIndex : prevIndex
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.3 || target === null) {
            setAnimate(true)
            setX(0)
            return
          }
          swiped.current = true
          if (reduced) {
            jumpTo(target)
            return
          }
          // Finish the move, then hold the arrival and change track.
          holding.current = true
          setAnimate(true)
          setX(dx < 0 ? -from.toRight : from.toLeft)
          const album = albumAt(target)
          const style = styleAt(target)
          settle.current = window.setTimeout(() => {
            settle.current = null
            setArriving({ album, style })
            jumpTo(target)
          }, SETTLE_MS)
        }}
        onPointerCancel={() => {
          start.current = null
          setAnimate(true)
          setX(0)
        }}
        onClickCapture={(e) => {
          if (!swiped.current) return
          swiped.current = false
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        <DeckSlideContext.Provider value={slide}>{children}</DeckSlideContext.Provider>
      </div>
    </div>
  )
}

interface PeekMotion {
  shift: number
  /** Pixels up — out of the sag, towards the deck's level. */
  lift: number
  scale: number
  opacity: number
  animate: boolean
}

/**
 * A neighbour, most of it off the edge of the screen — drawn as its own MEDIUM
 * (a record, a disc, a cassette, a single, a pocket player), the same drawing
 * the row of records waiting to go on uses, scaled up.
 */
// ⚠️ `forwardRef`, because this is React 18: a plain `ref` prop on a function
// component is dropped with only a console warning — and for a while it was, so
// `measure` never saw the peeks and every swipe travelled a guessed distance.
const Peek = forwardRef<
  HTMLButtonElement,
  {
    album: Album | undefined
    style: DeckStyle
    side: 'left' | 'right'
    size: number
    /** The peek's centre, from the top of the box: the deck's, plus the sag. */
    top: number
    motion: PeekMotion
    onClick(): void
  }
>(function Peek({ album, style, side, size, top, motion, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={`${side === 'left' ? 'Previous' : 'Next'}${album ? `: ${album.title}` : ''}`}
      className="absolute hover:opacity-90 focus-visible:opacity-100 lg:hidden"
      style={{
        top,
        width: size,
        height: size,
        transform: `translateY(-50%) translateX(${motion.shift}px) translateY(${motion.lift}px) scale(${motion.scale})`,
        opacity: motion.opacity,
        transition: motion.animate ? 'transform 240ms cubic-bezier(.2,.8,.2,1), opacity 240ms ease-out' : 'opacity 200ms ease-out',
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
})

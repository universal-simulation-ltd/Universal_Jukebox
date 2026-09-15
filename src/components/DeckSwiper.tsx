import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { resolveDeck } from '../lib/decks'
import { ON_THE_DECK, blendSlideMs, rowPose, swipeReach, swipeSteps, type Seat } from '../lib/transition'
import { SHAPES } from './decks/face'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import type { Album, Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type DeckStyle } from '../stores/settingsStore'
import { ARC_ACROSS, ARC_RISE, DeckSlideContext, type DeckSlide } from './decks/slide'
import { Medium } from './UpNextReel'
import { VinylRecord } from './decks/VinylRecord'
import { grooveRings } from '../lib/grooves'

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
//
// ⚠️ MORE RECORDS WAIT IN LINE BEYOND THE PEEKS (James, 2026-09-15: "Could you
// queue up another 1 or 2 records for the swipe to advance, so the user could
// do a continuous swipe and go 2 records later"). While a finger is on the
// deck, the records after the next one (or before the previous one) are queued
// beyond the peek, out of sight, and the whole row moves with the drag: the
// peek comes on to the deck, the record behind it fades in at the peek's
// place, and further still, that one comes on in turn. Letting go lands on the
// record nearest the middle. `rowPose` in `lib/transition.ts` draws each place
// in the row; `swipeReach` is how far along the row a drag has got.

const SWIPE_PX = 56
/** The most records one long swipe can cross in a single motion. */
const MAX_SWIPE_STEPS = 5
/** What each record past the first costs, as a share of the first one's travel. */
const EXTRA_STEP = 0.5
const PEEK = 0.62
/** How long the records take to finish a swipe once the finger lets go. */
const SETTLE_MS = 240
/** The longest the arriving record is held, waiting for the deck to show it. */
const HOLD_MAX_MS = 2500
/**
 * How long the record leaving takes to turn upright on its way to the side —
 * a little longer than the move, so it is not a whirl. The change of track
 * waits for it.
 */
const UPRIGHT_MS = 380

interface Arriving {
  album: Album | undefined
  style: DeckStyle
  /** Its song — for the grooves, which say how long it is. */
  track?: Track
  /** Where it lands, when the machine stays and only the medium changes — `seatOf`. */
  seat?: Seat
}

export default function DeckSwiper({
  size, showing, children, roomAbove = 0, beside = false, inset = 0,
}: {
  size: number
  showing?: string
  children: React.ReactNode
  /** Extra room above the record — for the lyrics' arc over it (`LyricsAround`). */
  roomAbove?: number
  /**
   * The deck is in a COLUMN beside the words rather than across the page.
   *
   * ⚠️ Below `lg` this box is `w-screen`, so the neighbouring records can come
   * in from the edges of the phone rather than from the page's padding. Lying
   * down (`lib/stageLayout.ts`) that is exactly wrong: the box took the whole
   * 844px row, squeezed the words to a column two words wide and put the
   * record off the bottom of the screen. `lg` has always had to opt out of it;
   * this is the same opt-out for the other side-by-side layout.
   */
  beside?: boolean
  /** Padding on the outer edge, so the record is not hard against the screen. */
  inset?: number
}) {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const cursor = usePlayerStore((s) => s.cursor)
  const repeat = usePlayerStore((s) => s.repeat)
  const phase = usePlayerStore((s) => s.deckPhase)
  const blend = usePlayerStore((s) => s.blend)
  const jumpTo = usePlayerStore((s) => s.jumpTo)
  const liveSec = usePlayerStore((s) => s.durationSec)
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
  /** Putting the queued records away once a swipe that went nowhere has sprung back. */
  const unqueue = useRef<number | null>(null)
  /**
   * A swipe has been let go and is being finished and held. Set AT the release,
   * synchronously — a swipe onto another record starts a record crossfade, and
   * its slide must not run on top of the swipe's own; state would only say so a
   * render later, after the crossfade's effect had already started.
   */
  const holding = useRef(false)
  /** The record leaving, being turned upright (Web Animations, over the spin). */
  const upright = useRef<Animation | null>(null)

  /**
   * Where the row of records is, in records: how far the finger has carried
   * it, then where the swipe ends. Negative towards the NEXT record, when the
   * records move left — the sign a finger's pixels have.
   */
  const [drag, setDrag] = useState(0)
  const [animate, setAnimate] = useState(false)
  /** How far a full swipe travels, each way — measured at the touch. */
  const [reach, setReach] = useState({ toLeft: size, toRight: size })
  /** After a swipe: the record that came in, held at the centre. */
  const [arriving, setArriving] = useState<Arriving | null>(null)
  /** A record crossfade's incoming record, on its way from the right. */
  const [incoming, setIncoming] = useState<(Arriving & { run: boolean }) | null>(null)
  /** How long the records take to move: a swipe's settle, or a whole crossfade. */
  const [ms, setMs] = useState(SETTLE_MS)
  /**
   * The side whose queued records are out — the side a drag is bringing
   * records in from — or null. Kept through a spring back, so they ride back
   * out with the rest instead of vanishing as it starts.
   */
  const [queued, setQueued] = useState<'left' | 'right' | null>(null)

  /** The order index `delta` away, honouring repeat-all at either end. */
  const indexAt = (delta: number): number | null => {
    if (order.length === 0 || cursor < 0) return null
    const i = cursor + delta
    if (i >= 0 && i < order.length) return i
    if (repeat === 'all' && order.length > 1) return (i + order.length) % order.length
    return null
  }
  /** How many records there are to cross that way — `delta` is +1 on, −1 back. */
  const roomFor = (delta: number): number => {
    if (order.length === 0 || cursor < 0) return 0
    if (repeat === 'all' && order.length > 1) return Math.min(MAX_SWIPE_STEPS, order.length - 1)
    return Math.min(MAX_SWIPE_STEPS, delta > 0 ? order.length - 1 - cursor : cursor)
  }
  // The plain neighbours, always. Until the row (see the note at the top), a
  // long swipe changed the ART in the peek as the finger went on, to show which
  // record it would land on — and on letting go the left peek swapped its
  // picture where it stood, since the record before the one landed on had never
  // been on screen. The records queued behind the peek now come in themselves,
  // so each peek keeps its record and there is nothing to swap.
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
  /** The machine on the deck now — the record playing, or the one still leaving. */
  const deckStyle = resolveDeck(setting, albums.find((a) => a.id === showing), eras)

  /**
   * A stand-in's grooves: the song it stands in for is the one now CURRENT, so
   * its length is the player's own once it has loaded — the same number the
   * deck draws, so nothing changes when the deck takes over.
   */
  const standInGrooves = (track: Track | undefined) =>
    grooveRings(track && track.id === trackAt(cursor)?.id && liveSec > 0 ? liveSec : track?.durationSec)

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
  }, [size, showing, roomAbove])

  // ⚠️ A CROSSFADE ACROSS A CHANGE OF RECORD SLIDES THE MACHINES (James,
  // 2026-09-11) — the same move as a swipe, driven by the player over the
  // whole blend: the record on the deck slides out to the left while the next
  // one comes in from the right, growing, until it is in the middle and the
  // blend is over; then it is held there like a swiped one. The player has
  // already moved the cursor, so the arrival is the CURRENT track, and the
  // peeks (now a track further on) hide until it lands. Read from a ref so the
  // effect runs once per blend and not on every render.
  const latest = useRef({ queue, order, cursor, albums, setting, eras, arriving, reduced, deckStyle })
  latest.current = { queue, order, cursor, albums, setting, eras, arriving, reduced, deckStyle }
  const blendTimer = useRef<number | null>(null)
  /**
   * The blend whose slide is still to START, or null.
   *
   * ⚠️ THE TWO FRAMES BELOW CAN OUTLIVE THEIR BLEND. With the app in the
   * background the page gets no animation frames at all, but its timers still
   * run — so the blend's timer finished the change-over while hidden, and the
   * two frames, queued all along, ran the moment the app came back: they slid
   * the deck a record's width to the left and grew the NEXT record into the
   * middle, standing still, over a song that was playing fine (James,
   * 2026-09-13, iPhone: "when I came back to the app it showed the wrong disc
   * (not spinning) for the song, when I tapped it then switched"). The frames
   * now check they are still wanted.
   */
  const slideFor = useRef<number | null>(null)
  // ⚠️ A LAYOUT EFFECT, SO THE SET-UP IS NEVER PAINTED HALF DONE. The player
  // moves the cursor as the blend starts, so the render that first sees `blend`
  // already has the NEW neighbours in it — and with an ordinary effect the
  // browser could paint that render before this ran: the record after the one
  // arriving would appear in the peek at rest, in the place the arriving record
  // has not left yet, and only then start sliding. That flash is half of what
  // reads as the jump. Running before paint means the first frame anybody sees
  // is the one where everything is at its starting place.
  useLayoutEffect(() => {
    const now = latest.current
    if (!blend || holding.current || now.arriving || now.reduced) return
    // ⚠️ THIS EFFECT RUNS ON MOUNT, NOT ONLY ON A NEW BLEND, so a blend that is
    // over — or nearly — must not be re-run over a record already on the deck.
    // `blendSlideMs` is that rule, and its note says what it looked like.
    const left = blendSlideMs(blend, Date.now(), SETTLE_MS)
    if (left === null) return
    const track = now.queue[now.order[now.cursor]]
    const album = track ? now.albums.find((a) => a.id === track.albumId) : undefined
    const style = resolveDeck(now.setting, album ?? track, now.eras)
    // On to the same CD player, only the disc changes.
    const seat = seatOf(style, now.deckStyle)
    const r = measure()
    setReach(r)
    setMs(left)
    setIncoming({ album, style, track, run: false, seat })
    const serial = blend.n
    slideFor.current = serial
    // Two frames: drawn at the edge first, THEN told to move, or it would jump.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (slideFor.current !== serial) return
        slideFor.current = null
        setIncoming((current) => (current ? { ...current, run: true } : current))
        setAnimate(true)
        setDrag(-1)
      }),
    )
    if (blendTimer.current !== null) window.clearTimeout(blendTimer.current)
    blendTimer.current = window.setTimeout(() => {
      blendTimer.current = null
      // Over — a slide that never got its frames must not start now.
      slideFor.current = null
      setIncoming(null)
      setArriving({ album, style, track, seat })
    }, left)
    // `measure` reads refs only; the rest comes through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blend])

  useEffect(() => () => {
    slideFor.current = null
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
      // The record on the deck starts from upright — the stand-in's angle. A
      // new record is already there (keyed, and held still); the same record
      // (a swipe within an album) is wound back to the start of its turn.
      upright.current?.cancel()
      upright.current = null
      deckWrap.current
        ?.querySelector('[data-record]')
        ?.getAnimations()
        .forEach((a) => {
          if (a instanceof CSSAnimation) a.currentTime = 0
        })
      setAnimate(false)
      setDrag(0)
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
    if (unqueue.current !== null) window.clearTimeout(unqueue.current)
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

  // ⚠️ ON TO THE SAME CD PLAYER, THE PLAYER STAYS (James, 2026-09-15: "on a
  // track change from cd player to cd player, the player should stay where it
  // is whilst the cd moves out and in"). Then only the disc is in the row: it
  // leaves from the player's well rather than from the middle of the deck, and
  // the one arriving lands in that well at the disc's size (`Seat`). Decided
  // by the record on the side the drag is going; by the record arriving,
  // during a crossfade or a hold.
  const dragSeat = drag === 0 ? undefined : seatOf(styleAt(drag < 0 ? nextIndex : prevIndex), deckStyle)
  const seat = incoming ? incoming.seat : arriving ? arriving.seat : dragSeat
  const seatPx: Seat = seat ? { y: seat.y * size, scale: seat.scale } : ON_THE_DECK

  /** Pixels per place along the row — the travel on the side records are coming from. */
  const unit = drag < 0 ? reach.toRight : reach.toLeft
  /** How far across the row has moved. Every record in it moves by this much. */
  const x = drag * unit

  // The record leaving sinks and shrinks towards a peek's place — on a curve,
  // level at first (`ARC_SINK`); during a drag, the same curve from its place
  // in the row (`rowPose`). On a swipe of several records it goes on past the
  // peek's place and out of sight, the way a queued record comes in.
  // ⚠️ It fades to a peek's OWN 0.6 at the peek's place: on a one-record swipe
  // it becomes that peek, and the two are swapped where they meet, so any
  // difference is a jump.
  const deckPose = rowPose(drag, sag, peekScale, seatPx)
  const slide: DeckSlide = {
    x,
    // Against the medium's own seat: the whole deck for a record, the well for a disc.
    y: deckPose.y - seatPx.y,
    scale: deckPose.scale / seatPx.scale,
    opacity: arriving ? 0 : incoming ? 1 - 0.85 * Math.min(1, Math.abs(drag)) : deckPose.opacity,
    away: Math.min(1, Math.abs(drag)),
    discOnly: seat !== undefined,
    animate,
    ms,
    // Past the point where letting go would change track — not for a nudge
    // that springs back, and not for the little give towards an empty side.
    lifted: Math.abs(x) >= SWIPE_PX || arriving !== null || incoming !== null,
    holding: arriving !== null,
  }

  /** A record crossfade is sliding the machines — the peeks are a track stale. */
  const swapping = incoming !== null

  /** How far a peek moves to be out of sight — most of one is already off. */
  const offEdge = Math.round(peek * 0.5)

  /**
   * The record `slot` places from the deck at rest, where the row has taken it
   * — as a move from the place of the peek on its side, which is where the
   * peeks and the records queued beyond them are all drawn.
   */
  const rowMotion = (slot: number): PeekMotion => {
    const peekSlot = slot > 0 ? 1 : -1
    const pose = rowPose(slot + drag, sag, peekScale, seatPx)
    return {
      // A queued record waits a whole travel further out than the peek.
      shift: (slot - peekSlot) * (slot > 0 ? reach.toRight : reach.toLeft) + x,
      lift: pose.y - sag,
      scale: pose.scale / peekScale,
      opacity: pose.opacity,
      transition: animate ? 'move' : 'fade',
      // ⚠️ A disc coming on to a player that is staying has to pass OVER the
      // player to reach its well. Only while it is coming on: at rest a peek
      // sits under the player's edge, as it always has.
      raised: seat !== undefined && Math.abs(slot + drag) < 1,
    }
  }

  // ⚠️ THE RECORDS MOVE AS ONE (James, 2026-09-11: "the next record needs to
  // come into position at the same time and the previous record move out of
  // view, then when the current becomes previous ... an animation to rotate it
  // into the starting position"). Swiping to the next record:
  //   - the next one comes in and grows to the deck;
  //   - the previous one goes on, off the edge;
  //   - the one playing takes the previous one's place, turning upright;
  //   - and the one queued behind the next comes up to where the next was.
  // Since 2026-09-15 that is one rule rather than four — every record is drawn
  // by its place in the row (`rowMotion`) — which is what lets a long swipe
  // carry the records queued further back all the way through. Where they
  // stop, the peeks take over: each shows AT ONCE the record the row left at
  // its place (the same picture, in the same place: nothing moves).
  const peekMotion = (side: 'left' | 'right'): PeekMotion => {
    // ⚠️ A CROSSFADE'S SLIDE MOVES THE PEEKS TOO (James, 2026-09-15: "when
    // loading the next track the track after that should come into peeking at
    // the same time so it doesn't jump unnaturally when the next track is
    // loading"). Both peeks used to be hidden for the whole blend and then
    // faded back in once it was over — so the record beyond the one arriving
    // appeared out of nothing at the side, a beat after everything else had
    // stopped. That appearing IS the jump.
    //
    // They can travel with it because the player moves the cursor as the blend
    // STARTS, so `nextIndex` is already the record after the one arriving and
    // `prevIndex` the one leaving: both are already the right records for where
    // the slide ends, and only have to be put where it began.
    //   - right: off its edge, then in over the same milliseconds as the record
    //     arriving. Nothing is handed over here — the record that WAS this peek
    //     is the one arriving, drawn by `incoming` at this exact place and size.
    //   - left: the record leaving is being carried to this spot by the deck's
    //     own slide, so this copy fades up underneath it. They are the same
    //     record in the same place, which is why the swap cannot be seen.
    if (swapping) {
      const run = incoming?.run === true
      return {
        shift: side === 'right' && !run ? offEdge : 0,
        lift: 0,
        scale: 1,
        opacity: side === 'right' ? 0.6 : run ? 0.6 : 0,
        transition: run ? 'move' : 'none',
        ms,
        ease: ARC_ACROSS,
      }
    }
    // A record held at the centre, after a blend or a swipe. The peeks stay
    // exactly where the move left them — hiding them here, and fading them
    // back when the hold was released, was the other half of the jump. After a
    // swipe they are already the new neighbours: the row brought them there.
    if (arriving) return { shift: 0, lift: 0, scale: 1, opacity: 0.6, transition: 'none' }
    return rowMotion(side === 'right' ? 1 : -1)
  }

  /** The places beyond the peek on one side: as many as a swipe could cross, and the one it would leave at the peek. */
  const queuedSlots = (side: 'left' | 'right'): number[] => {
    const way = side === 'right' ? 1 : -1
    const slots: number[] = []
    for (let k = 2; k <= roomFor(way) + 1; k++) slots.push(way * k)
    return slots
  }

  /** A swipe that went nowhere: everything back to its place, and the queue put away once it is. */
  const springBack = () => {
    setAnimate(true)
    setDrag(0)
    if (unqueue.current !== null) window.clearTimeout(unqueue.current)
    unqueue.current = window.setTimeout(() => {
      unqueue.current = null
      setQueued(null)
    }, SETTLE_MS)
  }

  /**
   * Turn the record on the deck to upright — on, the way it is spinning — while
   * it goes to the side, so that it matches the peek drawn there (at 0°).
   * Played OVER the spin: a script animation outranks a CSS one, and the spin's
   * own animation is left alone (pausing it from script would stop it
   * answering to `animation-play-state` ever after).
   */
  const turnUpright = () => {
    const record = deckWrap.current?.querySelector<HTMLElement>('[data-record]')
    if (!record || typeof record.animate !== 'function') return
    const now = getComputedStyle(record).transform
    const m = new DOMMatrixReadOnly(now && now !== 'none' ? now : undefined)
    const angle = ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360
    upright.current?.cancel()
    upright.current = record.animate(
      [{ transform: `rotate(${angle}deg)` }, { transform: 'rotate(360deg)' }],
      { duration: UPRIGHT_MS, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' },
    )
  }

  return (
    // Full width of the SCREEN on a phone, so the neighbours can come in from
    // its edges rather than from the page's padding; clipped, so they never
    // widen the page. From `lg` up the deck sits in a column beside the words,
    // and there is no screen edge next to it to peek from.
    <div
      ref={box}
      className={
        beside
          ? 'relative flex justify-center py-2'
          : 'relative flex w-screen justify-center overflow-hidden py-2 lg:w-auto lg:overflow-visible'
      }
      style={{
        ...(roomAbove ? { paddingTop: 8 + roomAbove } : null),
        ...(inset ? { paddingRight: inset } : null),
      }}
    >
      {/* The records queued beyond a peek — out of sight at rest, and only
          here while a drag is bringing them in. See the note at the top. */}
      {queued && !arriving && !incoming &&
        queuedSlots(queued).map((slot) => {
          const index = indexAt(slot)
          if (index === null) return null
          return (
            <Queued
              key={slot}
              album={albumAt(index)}
              grooves={grooveRings(trackAt(index)?.durationSec)}
              style={styleAt(index)}
              side={slot > 0 ? 'right' : 'left'}
              size={peek}
              deck={size}
              top={centreY + sag}
              motion={rowMotion(slot)}
            />
          )
        })}
      {prevIndex !== null && (
        <Peek
          ref={leftPeek}
          album={albumAt(prevIndex)}
          grooves={grooveRings(trackAt(prevIndex)?.durationSec)}
          style={styleAt(prevIndex)}
          side="left"
          size={peek}
          deck={size}
          top={centreY + sag}
          motion={peekMotion('left')}
          onClick={() => jumpTo(prevIndex)}
        />
      )}
      {nextIndex !== null && (
        <Peek
          ref={rightPeek}
          album={albumAt(nextIndex)}
          grooves={grooveRings(trackAt(nextIndex)?.durationSec)}
          style={styleAt(nextIndex)}
          side="right"
          size={peek}
          deck={size}
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
              className="relative h-full w-full"
              style={{
                // To the medium's seat: the middle for a record, the well for a disc.
                transform: incoming.run
                  ? `translateY(${seatPx.y}px) scale(${seatPx.scale})`
                  : `translateY(${sag}px) scale(${peekScale})`,
                transition: incoming.run ? `transform ${ms}ms ${ARC_RISE}` : 'none',
              }}
            >
              <Drawn album={incoming.album} style={incoming.style} deck={size} shown={size} grooves={standInGrooves(incoming.track)} />
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
          {/* At the medium's seat — see `incoming` above. */}
          <div className="relative h-full w-full" style={{ transform: `translateY(${seatPx.y}px) scale(${seatPx.scale})` }}>
            <Drawn album={arriving.album} style={arriving.style} deck={size} shown={size} grooves={standInGrooves(arriving.track)} />
          </div>
        </div>
      )}
      <div
        ref={deckWrap}
        className="relative shrink-0"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          if (e.pointerType !== 'touch' || arriving || incoming || holding.current) return
          setMs(SETTLE_MS)
          if (unqueue.current !== null) {
            window.clearTimeout(unqueue.current)
            unqueue.current = null
          }
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
          const travelPx = dx < 0 ? from.toRight : from.toLeft
          // Towards a side with no record, the deck only gives a little.
          const room = roomFor(dx < 0 ? 1 : -1)
          if (room === 0) {
            setDrag(Math.max(-40, Math.min(40, dx * 0.25)) / travelPx)
            return
          }
          // ⚠️ THE FINGER MAY GO FURTHER THAN ONE RECORD, AND THE ROW GOES WITH
          // IT. Past a single travel the peek's record is on the deck and the one
          // queued behind it is where the peek was; further still, that one
          // comes on in turn. `swipeReach` has the prices.
          setQueued(dx < 0 ? 'right' : 'left')
          setDrag((dx < 0 ? -1 : 1) * swipeReach(Math.abs(dx), travelPx, room, EXTRA_STEP))
        }}
        onPointerUp={(e) => {
          const from = start.current
          start.current = null
          if (!from) return
          const dx = e.clientX - from.x
          const dy = e.clientY - from.y
          const way = dx < 0 ? 1 : -1
          // The record nearest the middle as the finger lifts — the one the row
          // is showing there (`swipeSteps` is `swipeReach`, rounded).
          const crossed = swipeSteps(Math.abs(dx), way > 0 ? from.toRight : from.toLeft, roomFor(way), EXTRA_STEP)
          const target = crossed > 0 ? indexAt(way * crossed) : null
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.3 || target === null) {
            springBack()
            return
          }
          swiped.current = true
          if (reduced) {
            // Nothing moved under the finger, so the distance is read here
            // instead — a long swipe still crosses several records, it just
            // never showed which ones on the way.
            jumpTo(target)
            return
          }

          // Finish the move — the row on to the record it lands on — then hold
          // the arrival and change track.
          holding.current = true
          setAnimate(true)
          setDrag(-way * crossed)
          turnUpright()
          const album = albumAt(target)
          const track = trackAt(target)
          const style = styleAt(target)
          settle.current = window.setTimeout(() => {
            settle.current = null
            // ⚠️ ONE COMMIT for the hold and the change of track. The peeks
            // read the cursor; drawn a frame apart, the record beyond would
            // flash up in the middle, or the old neighbour back at the side.
            flushSync(() => {
              setAnimate(false)
              // ⚠️ IN THE SAME COMMIT, for the reason above: the queued records
              // go as the peeks take over from them. Each peek's new record is
              // the one the row left at its place, so the hand-over cannot be
              // seen — but only if both happen in one frame.
              setQueued(null)
              // Landing where the row was taking it: the well, if the player stayed.
              setArriving({ album, style, track, seat })
              // ⚠️ `onDeck` — THE RECORD IS ALREADY HERE. The swipe has carried
              // it to the middle and is holding a still picture of it there;
              // without this the player runs its own record change over the
              // top, and the stand-in cannot be released (and so cannot start
              // turning) until that finishes 2.1s later. See `playPrepared`.
              jumpTo(target, { onDeck: true })
            })
          }, Math.max(SETTLE_MS, UPRIGHT_MS))
        }}
        onPointerCancel={() => {
          start.current = null
          springBack()
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
  /** Glide there (a release), fade only (a drag follows the finger), or be there. */
  transition: 'move' | 'fade' | 'none'
  /** How long a `move` takes. A swipe's settle unless a whole blend says otherwise. */
  ms?: number
  /** Its easing — the records' shared arc, where it is travelling with them. */
  ease?: string
  /** Drawn over the deck — a disc on its way into a player that is staying. */
  raised?: boolean
}

/**
 * Where the record arriving sits, when the machine on the deck stays put for it
 * — only when it goes on the SAME machine, and only a machine it can be taken
 * out of (`SHAPES[style].seat`: the CD player's disc). Undefined when the record
 * is the deck (vinyl already moves just its record) or the machine is changing.
 */
function seatOf(arriving: DeckStyle, onDeck: DeckStyle): Seat | undefined {
  return arriving === onDeck ? SHAPES[arriving]?.seat : undefined
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
    /** The deck's size — what a record is drawn at before it is scaled to the peek's. */
    deck: number
    /** Its grooves — as many as its song is long. */
    grooves?: number
    /** The peek's centre, from the top of the box: the deck's, plus the sag. */
    top: number
    motion: PeekMotion
    onClick(): void
  }
>(function Peek({ album, style, side, size, deck, grooves, top, motion, onClick }, ref) {
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
      style={rowStyle(side, size, top, motion)}
    >
      <Drawn album={album} style={style} deck={deck} shown={size} grooves={grooves} />
    </button>
  )
})

/**
 * A record queued beyond a peek (see the note at the top of the file): drawn
 * at that peek's place and moved from there exactly as the peek is, but only a
 * picture — it is out of sight unless a finger is bringing it in, so there is
 * never anything to tap.
 */
function Queued({ album, style, side, size, deck, grooves, top, motion }: {
  album: Album | undefined
  style: DeckStyle
  side: 'left' | 'right'
  size: number
  deck: number
  grooves?: number
  top: number
  motion: PeekMotion
}) {
  return (
    <div className="pointer-events-none absolute lg:hidden" style={rowStyle(side, size, top, motion)} aria-hidden>
      <Drawn album={album} style={style} deck={deck} shown={size} grooves={grooves} />
    </div>
  )
}

/** Where a peek, or a record queued beyond one, is drawn — and how it gets there. */
function rowStyle(side: 'left' | 'right', size: number, top: number, motion: PeekMotion): React.CSSProperties {
  return {
    top,
    width: size,
    height: size,
    transform: `translateY(-50%) translateX(${motion.shift}px) translateY(${motion.lift}px) scale(${motion.scale})`,
    opacity: motion.opacity,
    zIndex: motion.raised ? 10 : undefined,
    transition:
      motion.transition === 'move'
        ? `transform ${motion.ms ?? 240}ms ${motion.ease ?? 'cubic-bezier(.2,.8,.2,1)'}, opacity ${motion.ms ?? 240}ms ease-out`
        : motion.transition === 'fade'
          ? 'opacity 200ms ease-out'
          : 'none',
    // Just under half of it on screen: enough to see WHICH record, and on
    // what, not enough to compete with the one that is playing.
    [side]: -Math.round(size * 0.58),
  }
}

/**
 * A record as it is drawn beside the deck, `shown` pixels across.
 *
 * ⚠️ VINYL IS THE DECK'S OWN RECORD (`VinylRecord`), drawn at the DECK's size
 * and only then scaled: the record swiped away shrinks by transform, so a peek
 * drawn at its own size would have finer grooves than the record it replaces,
 * and the one arriving would have coarser ones than the record it becomes
 * (James, 2026-09-11: "New disc doesn't have enough lines"). Every other
 * machine moves whole (`Deck`), so its stand-in is the reel's `Medium`.
 *
 * ⚠️ PINNED TO THE TOP LEFT, not left in the flow. A button centres its content
 * vertically, so a drawing in the flow sat part-way down a peek before the
 * scale — every peek drew 38px low, and a grown one landed 61px under the
 * record it replaced (James, 2026-09-11: "Record still doesn't end in right
 * position").
 */
function Drawn({
  album, style, deck, shown, grooves,
}: { album: Album | undefined; style: DeckStyle; deck: number; shown: number; grooves?: number }) {
  const drawn = style === 'vinyl' ? deck : 76
  return (
    <span className="absolute left-0 top-0 block origin-top-left" style={{ width: drawn, height: drawn, transform: `scale(${shown / drawn})` }}>
      {style === 'vinyl' ? <VinylRecord album={album} grooves={grooves} /> : <Medium album={album} style={style} />}
    </span>
  )
}

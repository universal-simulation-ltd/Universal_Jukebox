import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { clock } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import type { DeckControls, DeckFaceProps } from './face'
import { slideInner, slideOuter } from './slide'
import { VinylRecordFace } from './VinylRecord'

// The record and the tonearm — the original deck, and still the default.
//
// ⚠️ THIS COMPONENT OWNS NO TIMING. The ceremony's beats (§22.9) live in
// `playerStore`; `Deck.tsx` reads them and hands this file `engaged`,
// `spinning` and `progress`. That split is not tidiness. The timeline WAS in
// this component, and because the ceremonial deck is only mounted on Now
// Playing, pressing Play from an album set the ceremony going with nothing to
// finish it — and since the ceremony loads the audio without playing it, the
// result was silence that never resolved. A view cannot be responsible for
// something that has to happen whether or not the view exists.

/**
 * Where the needle sits, in degrees of tonearm rotation.
 *
 * ⚠️ These three numbers ARE the "progressively move the needle" request
 * (James, 2026-09-08), and they are geometry rather than taste: the arm pivots
 * at (78,12) in the SVG's own coordinates, and the svg box is placed so that
 * `TRACK_START` puts the head near the outer edge of the record and
 * `TRACK_START + TRACK_TRAVEL` puts it just outside the label. Change one and
 * check the OTHER end still lands on vinyl — an arm that finishes on the centre
 * label, or that starts off the rim, reads as a bug rather than as a tweak.
 *
 * The travel is inward, the way a record actually plays: the needle lands in
 * the outer groove and works its way towards the middle, then comes off and
 * goes back out to the start for the next track.
 *
 * ⚠️ Inward is the one thing the CD deck reverses — see `CdDeck.tsx`, where the
 * laser starts at the middle and works out. That is not a stylistic difference
 * between the two files; it is what the two formats do.
 */
const ARM = {
  /** The outer groove — where the needle lands. */
  TRACK_START: -14,
  /** How far it creeps inward over a whole track. */
  TRACK_TRAVEL: 24,
  /** How far ABOVE its current position the arm sits when lifted. */
  LIFT: -24,
}

/**
 * The tonearm's bearing and its headshell, as shares of the frame's width —
 * where the svg below puts (78,12) and (45,68) of its own viewBox, given the
 * svg's box (`-top-[6%] -right-[14%]`, 62% square). Worked once, here, so the
 * part you can grab (`ArmGrab`) sits exactly on the head the svg draws.
 * ⚠️ Move the svg's box and these move with it.
 */
const PIVOT = { x: 0.52 + 0.78 * 0.62, y: -0.06 + 0.12 * 0.62 }
const HEAD = { x: 0.52 + 0.45 * 0.62 - PIVOT.x, y: -0.06 + 0.68 * 0.62 - PIVOT.y }
/** The head's direction from the bearing with the arm at 0°, in degrees. */
const HEAD_BEARING = (Math.atan2(HEAD.y, HEAD.x) * 180) / Math.PI

export default function VinylDeck({ progress, engaged, spinning, reduced, url, hue, labelFade, slide, grooves, underArm, controls }: DeckFaceProps) {
  // While the arm is in a hand it goes where the hand puts it, not where the
  // music is — see `ArmGrab`.
  const [held, setHeld] = useState<number | null>(null)
  const trackAngle = ARM.TRACK_START + (held ?? progress) * ARM.TRACK_TRAVEL

  return (
    <>
      {/* The record — in its own wrapper, which fills the frame exactly: the
          record positions itself with `absolute inset-0` against the FRAME, so
          anything between the two has to. Only its label fades as a record
          arrives or leaves (`labelFade` in `face.ts`); the record stays put —
          except under a swipe, when it alone follows the finger and the
          tonearm below stays where it is (`slide`). */}
      <div className="absolute inset-0" style={slide ? slideOuter(slide) : undefined}>
      <div className="absolute inset-0" style={slide ? slideInner(slide) : undefined}>
      {/* ⚠️ THE SHADOW STAYS STILL (James, 2026-09-11: "There's a strange shadow
          that appears only as it rotates past"). A box-shadow turns with its
          element, so on the spinning disc the drop shadow orbited it — above the
          record at 180°, where the swipe box's edge sliced it flat. It is drawn
          here, on a disc that does not turn; outer shadows never paint inside
          their box, so this one shows only round the edge. */}
      <div className="absolute inset-0 rounded-full shadow-xl" aria-hidden />
      <div
        // ⚠️ KEYED ON THE RECORD, so a new one goes on at 0°, as the record that
        // flew in was drawn, instead of carrying on from wherever the last had
        // turned to (James, 2026-09-11: "the new track should also start in the
        // fixed starting position"). Same record, same key: pause still freezes it.
        key={url ?? hue}
        // What `DeckSwiper` turns upright as a swipe carries it to the side.
        data-record
        className="absolute inset-0 rounded-full bg-slate-900 dark:bg-[#12192b]"
        style={{
          // The platter turns at a real 33⅓ rpm — 1.8s a revolution — which is
          // slow enough to read as a record rather than a loading spinner.
          //
          // ⚠️ PAUSED, never removed. Taking the animation off resets the
          // element to its untransformed state, so the record snapped back to
          // 0° the instant you hit pause — a real record does not jump to the
          // top of the label when you lift the needle. `animation-play-state`
          // freezes it exactly where it is and resumes from there. Reported
          // on Firefox, where the snap is most obvious, but it is what every
          // engine does with a removed animation.
          animation: reduced ? undefined : 'jb-spin 1.8s linear infinite',
          animationPlayState: spinning ? 'running' : 'paused',
        }}
      >
        <VinylRecordFace url={url} hue={hue} labelFade={labelFade} grooves={grooves} />
      </div>
      {/* Over the record and under the arm, INSIDE the slide layers — so a
          swipe carries the lyrics off with the record (James, 2026-09-11:
          "When swiping left right the lyrics need to go with the record
          too"). Not inside the spinning disc: they must not turn. */}
      {underArm}
      </div>
      </div>


      {/* The tonearm, pivoting about its bearing at the top right — the same
          gesture as the app mark's rest→hover morph, on purpose. */}
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute -top-[6%] -right-[14%] h-[62%] w-[62%] overflow-visible"
        aria-hidden
      >
        <circle cx="78" cy="12" r="7" className="fill-slate-400 dark:fill-slate-500" />
        {/* ⚠️ TWO nested rotations about the SAME pivot, not one sum, and the
            reason is that they need different curves. The outer one is where
            on the record the needle is — a slow, linear creep inward as the
            track plays. The inner one is the arm being lifted off it and
            cued back down, which overshoots a touch and settles the way a
            real arm does. Added together into one `rotate()` they would have
            to share a transition, and either the landing would crawl or the
            creep would spring. Both use `transformOrigin: 78px 12px`, which
            for an SVG element resolves against the viewBox, so nesting does
            not move the bearing. */}
        <g
          style={{
            transformOrigin: '78px 12px',
            transform: `rotate(${trackAngle}deg)`,
            // Just longer than the ~250ms between `timeupdate` events, so the
            // creep is continuous rather than four visible steps a second.
            // None while held: a hand-moved arm lagging the hand feels broken.
            transition: reduced || held !== null ? undefined : 'transform 0.4s linear',
          }}
        >
          <g
            style={{
              transformOrigin: '78px 12px',
              transform: `rotate(${engaged ? 0 : ARM.LIFT}deg)`,
              // Overshoots a touch and settles, like a real arm being cued.
              transition: reduced ? undefined : 'transform 1.05s cubic-bezier(.34,1.2,.4,1)',
            }}
          >
            <path d="M78 12 L48 62" stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="6" strokeLinecap="round" />
            <path d="M48 62 L42 74" stroke="currentColor" className="text-slate-500 dark:text-slate-400" strokeWidth="11" strokeLinecap="round" />
          </g>
        </g>
      </svg>

      {controls && engaged && controls.durationSec > 0 && (
        <ArmGrab angle={trackAngle} held={held} setHeld={setHeld} controls={controls} />
      )}
    </>
  )
}

/**
 * The headshell, as something you can pick up (the Now Playing deck only).
 *
 * Drag it across the record and the song goes where the needle is put down,
 * which is how a record is found on a real turntable: the outer groove is the
 * start, the edge of the label the end. The time it would land on rides
 * beside the head while it is held, and a detent is felt every tenth of the
 * song.
 *
 * ⚠️ STOPS THE POINTER AND THE CLICK. The record under it swipes to the next
 * song (`DeckSwiper`), a long press on the deck opens the machine picker and a
 * tap opens the album (`Deck`) — a drag of the arm must be none of those.
 *
 * ⚠️ A slider to a screen reader and the keyboard: ← → move five seconds.
 */
function ArmGrab({
  angle,
  held,
  setHeld,
  controls,
}: {
  angle: number
  held: number | null
  setHeld(fraction: number | null): void
  controls: DeckControls
}) {
  const box = useRef<HTMLDivElement>(null)
  const tenth = useRef(-1)
  const turn = (angle * Math.PI) / 180
  const head = {
    x: PIVOT.x + HEAD.x * Math.cos(turn) - HEAD.y * Math.sin(turn),
    y: PIVOT.y + HEAD.x * Math.sin(turn) + HEAD.y * Math.cos(turn),
  }

  /** Where on the record a finger at (x, y) would put the needle, 0 → 1. */
  const fractionAt = (x: number, y: number): number | null => {
    const frame = box.current?.parentElement?.getBoundingClientRect()
    if (!frame || frame.width === 0) return null
    const dx = x - (frame.left + PIVOT.x * frame.width)
    const dy = y - (frame.top + PIVOT.y * frame.width)
    const bearing = (Math.atan2(dy, dx) * 180) / Math.PI - HEAD_BEARING
    return Math.max(0, Math.min(1, (bearing - ARM.TRACK_START) / ARM.TRACK_TRAVEL))
  }
  const follow = (e: PointerEvent) => {
    const at = fractionAt(e.clientX, e.clientY)
    if (at === null) return
    const step = Math.floor(at * 10)
    if (step !== tenth.current) {
      if (tenth.current !== -1) haptic('tick')
      tenth.current = step
    }
    setHeld(at)
  }
  const position = held ?? (angle - ARM.TRACK_START) / ARM.TRACK_TRAVEL
  const nudge = (seconds: number) =>
    controls.seek(Math.max(0, Math.min(1, position + seconds / controls.durationSec)))

  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label="Tonearm — drag it across the record to move through the song"
      aria-valuemin={0}
      aria-valuemax={Math.round(controls.durationSec)}
      aria-valuenow={Math.round(position * controls.durationSec)}
      aria-valuetext={`${clock(position * controls.durationSec)} of ${clock(controls.durationSec)}`}
      className="absolute z-10 cursor-grab rounded-full focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E05504] active:cursor-grabbing"
      style={{
        left: `${head.x * 100}%`,
        top: `${head.y * 100}%`,
        width: 'max(44px, 20%)',
        height: 'max(44px, 20%)',
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        tenth.current = -1
        haptic('tap')
        follow(e)
      }}
      onPointerMove={(e) => {
        if (held === null) return
        e.stopPropagation()
        follow(e)
      }}
      onPointerUp={(e) => {
        if (held === null) return
        e.stopPropagation()
        controls.seek(held)
        setHeld(null)
      }}
      onPointerCancel={() => setHeld(null)}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nudge(5)
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nudge(-5)
        else return
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {held !== null && (
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-white tabular-nums shadow dark:bg-white/90 dark:text-slate-900">
          {clock(held * controls.durationSec)}
        </span>
      )}
    </div>
  )
}

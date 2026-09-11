import type { DeckFaceProps } from './face'
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

export default function VinylDeck({ progress, engaged, spinning, reduced, url, hue, labelFade, slide }: DeckFaceProps) {
  const trackAngle = ARM.TRACK_START + progress * ARM.TRACK_TRAVEL

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
        <VinylRecordFace url={url} hue={hue} labelFade={labelFade} />
      </div>
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
            transition: reduced ? undefined : 'transform 0.4s linear',
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
    </>
  )
}

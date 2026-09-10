import { useLevels } from '../../lib/useLevels'
import type { DeckFaceProps } from './face'

// The cabinet the app is named after: a 45 on the platter behind the glass,
// under a lit arch, with the gripper that put it there still holding it.
//
// ⚠️ THIS COMPONENT OWNS NO TIMING, like every other face — `Deck.tsx` reads
// the ceremony's beats off `playerStore` and hands this file `progress`,
// `engaged`, `spinning` and `labelFade`. See `decks/face.ts`.
//
// ⚠️ IT IS A 45, NOT AN LP, and that is the one thing that stops it reading as
// the vinyl deck in a box. A jukebox holds singles: a big centre hole, a label
// that takes half the disc, and 45 rpm rather than 33⅓ — which at 1.33s a
// revolution is visibly quicker than the turntable next door. Anyone
// "unifying" these numbers with `VinylDeck.tsx` has made the two decks tell the
// same lie about one of them.
//
// ⚠️ WARM IN BOTH THEMES, the same argument as the CD player's graphite: a
// jukebox is a walnut-and-chrome object with coloured light in it whatever the
// room is doing, and a cabinet that goes pale in light mode is a different
// machine rather than the same one lit differently.

/**
 * Where the needle sits, in degrees of arm rotation.
 *
 * Inward, like the tonearm on the vinyl deck — it is the same mechanism — but
 * over a SHORTER sweep, because the record it is crossing is a 7" with a label
 * that takes half of it. `TRACK_START` puts the head just inside the rim and
 * `TRACK_START + TRACK_TRAVEL` puts it just outside the label; change one and
 * check the other still lands on vinyl.
 */
const ARM = {
  /** The outer groove — where the needle lands. */
  TRACK_START: -12,
  /** How far it creeps inward over a whole track. */
  TRACK_TRAVEL: 17,
  /** How far ABOVE its current position the arm sits when lifted. */
  LIFT: -21,
}

/**
 * The glass window, as a box inside the cabinet.
 *
 * ⚠️ `aspect-square`, and the height is NOT a percentage — the cabinet is
 * taller than it is wide (there is a selection panel and a grille below the
 * glass), so a window sized in percent of the frame would be an oval, and an
 * oval record is the kind of detail that makes a whole drawing look wrong
 * without anybody being able to say why. Left and right fix the width; the
 * aspect ratio takes the height. Same reasoning as `WELL` in `CdDeck.tsx`.
 */
const WINDOW = { left: '15%', right: '15%', top: '10%' }

export default function JukeboxDeck({ progress, engaged, spinning, reduced, url, hue, labelFade }: DeckFaceProps) {
  const trackAngle = ARM.TRACK_START + progress * ARM.TRACK_TRAVEL

  /**
   * The two pilaster tubes, as a two-band level meter: bass on the left, the
   * mids and the top on the right.
   *
   * ⚠️ THIS IS THE ONE PLACE A FACE READS ANYTHING FOR ITSELF, and `face.ts`'s
   * rule survives it. That rule is about the app's STATE — no stores, no
   * ceremony timing, no deciding for itself what a track change means — and
   * this is none of those: it is the sound in the room, which no other face
   * wants and which the frame cannot usefully pass down as a number without
   * re-rendering the whole deck sixty times a second. See `lib/useLevels.ts`.
   *
   * ⚠️ Fed `spinning`, not `engaged`. The lights belong to the machine being on,
   * and during the ceremony the platter is up to speed with the arm still
   * parked — which is exactly when a jukebox is at its most lit.
   */
  const tubes = useLevels<HTMLSpanElement>(2, spinning && !reduced)

  return (
    <>
      {/* ── The cabinet ────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 shadow-xl ring-1 ring-amber-950/40"
        style={{
          // The arch: a tall elliptical dome over a squared-off body. Two
          // radii per corner (the `/` form), because one value gives a circle
          // and the top of a jukebox is wider than it is tall.
          borderRadius: '46% 46% 10% 10% / 30% 30% 7% 7%',
          background: 'linear-gradient(158deg, #7c4a21 0%, #5d3418 34%, #43240f 70%, #2c1709 100%)',
        }}
      >
        {/* The moulded highlight along the top of the dome. Without it the
            cabinet is a brown shape rather than a lacquered object. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: '46% 46% 10% 10% / 30% 30% 7% 7%',
            background:
              'linear-gradient(180deg, rgba(255,236,200,.3) 0%, rgba(255,236,200,0) 20%, rgba(0,0,0,0) 78%, rgba(0,0,0,.35) 100%)',
          }}
        />

        {/* The two lit pilaster tubes down the sides of the arch — the single
            detail that says "jukebox" before anything else is read, and now the
            equalisers as well (James, 2026-09-09: "use the side lights as
            equalisers").

            ⚠️ TWO ELEMENTS PER TUBE, and the split is the whole design. The
            outer one is the GLASS: it is always there, it dims when the needle
            is up, and it never moves. The inner one is the LIGHT INSIDE IT,
            filling from the bottom to whatever its band of the spectrum is
            doing. A single element scaling itself would have to shrink the
            glass too, and a tube that changes length is a cabinet coming apart
            rather than a light going up and down inside one.

            ⚠️ The fill's height reads `--jb-level` WITH A FALLBACK OF 1, and
            that fallback is what the whole thing rests on: `useLevels` removes
            the property whenever it is not metering — nothing playing, reduced
            motion, or a browser that would not give us an analyser — so the
            tube goes back to being the solid lit bar it has always been rather
            than to an empty one. Nothing here needs to know which of those
            happened.

            ⚠️ No CSS transition on that height. The value is already smoothed
            twice (the analyser's own constant, and the fall-off in
            `useLevels`), and a transition on top of a per-frame write is a
            meter that lags a beat behind the music it is supposed to be. */}
        {[
          { side: 'left' as const, from: '#fb923c', to: '#f43f5e' },
          { side: 'right' as const, from: '#fb923c', to: '#f43f5e' },
        ].map((tube, band) => (
          <span
            key={tube.side}
            className="absolute block overflow-hidden rounded-full transition-opacity duration-700"
            style={{
              // Written out rather than as a computed `[tube.side]` key: a
              // computed key off a union widens the object to an index
              // signature, and `CSSProperties` then stops type-checking every
              // other property in it.
              left: tube.side === 'left' ? '6.5%' : undefined,
              right: tube.side === 'right' ? '6.5%' : undefined,
              top: '16%',
              height: '46%',
              width: '4.5%',
              opacity: engaged ? 1 : 0.45,
              // The unlit glass: the same colours, way down, so an empty tube
              // is a dark tube rather than a hole in the cabinet.
              background: `linear-gradient(180deg, ${tube.from}22, ${tube.to}33)`,
              boxShadow: 'inset 0 0 4px rgba(255,255,255,.3)',
            }}
          >
            <span
              ref={tubes[band]}
              className="absolute inset-x-0 bottom-0 block rounded-full"
              style={{
                height: 'calc(var(--jb-level, 1) * 100%)',
                background: `linear-gradient(180deg, ${tube.from}, ${tube.to})`,
                boxShadow: engaged
                  ? '0 0 10px rgba(251,146,60,.8), inset 0 0 4px rgba(255,255,255,.55)'
                  : 'inset 0 0 4px rgba(255,255,255,.3)',
              }}
            />
          </span>
        ))}

        {/* ── The selection panel ──────────────────────────────────────────
            Title strips behind glass. They are blank on purpose: the real list
            of what is coming is "Waiting to go on" and "Up next" underneath the
            stage, and a second set of titles painted onto the cabinet would be
            either wrong or a third place the queue lives. */}
        <div
          className="absolute overflow-hidden rounded-[4px] bg-[#1a0e05]/70 ring-1 ring-amber-200/15"
          style={{ left: '13%', right: '13%', top: '68%', height: '15%' }}
        >
          {/* ⚠️ Twelve narrow strips, not six fat ones. Six filled the panel
              edge to edge and read as a waffle grille — a second speaker, right
              above the actual one — where a jukebox title panel is a rack of
              paper slips with two lines of type on each. Narrow is what makes
              it read as paper. */}
          <div className="grid h-full grid-cols-3 grid-rows-4 gap-[2px] p-[3px]">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="block rounded-[1px] bg-amber-50/20" />
            ))}
          </div>
        </div>

        {/* The speaker grille and the coin slot along the bottom. Nothing here
            is clickable — the transport is the player bar, and a second set of
            buttons that only one skin has is a control you have to learn per
            deck. */}
        <div
          className="absolute flex items-center gap-[6%]"
          style={{ left: '13%', right: '13%', top: '87%', height: '7%' }}
        >
          <span
            className="block h-[7px] w-[7px] shrink-0 rounded-full transition-colors"
            style={{
              background: engaged ? '#fbbf24' : 'rgba(251,191,36,.28)',
              boxShadow: engaged ? '0 0 6px rgba(251,191,36,.9)' : undefined,
            }}
          />
          <span
            className="block h-full flex-1 rounded-[3px]"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgba(255,225,180,.22) 0 2px, rgba(0,0,0,0) 2px 5px)',
            }}
          />
          <span className="block h-[9px] w-[3px] shrink-0 rounded-[1px] bg-amber-100/40" />
        </div>
      </div>

      {/* ── Behind the glass ─────────────────────────────────────────────── */}
      <div className="absolute aspect-square" style={WINDOW}>
        {/* The dark interior the record sits in. */}
        <div
          className="absolute rounded-[14%]"
          style={{
            inset: '-4%',
            background: 'radial-gradient(circle at 50% 42%, #241408 40%, #120902 100%)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,.7), 0 1px 0 rgba(255,225,180,.14)',
          }}
        />

        {/* The record, inside its own wrapper — it is the part the gripper
            brings across; the platter, the arm and the cabinet are the machine.
            Only its label fades — see `labelFade` in `face.ts`. */}
        <div className="absolute inset-[7%]">
          <div
            className="absolute inset-0 rounded-full bg-[#120c09] shadow-xl"
            style={{
              // 45 rpm — 1.33s a revolution, against the turntable's 1.8s.
              //
              // ⚠️ Paused, never removed. Taking the animation off resets the
              // element to 0°, so the record snaps back to the top of the label
              // the instant you press pause, which a real one does not do.
              animation: reduced ? undefined : 'jb-spin 1.33s linear infinite',
              animationPlayState: spinning ? 'running' : 'paused',
            }}
          >
            <div
              className="absolute inset-0 rounded-full opacity-[0.18]"
              style={{
                background:
                  'repeating-radial-gradient(circle at 50% 50%, transparent 0 3px, rgba(255,255,255,.5) 3px 4px)',
              }}
            />
            {/* A single's label is half the disc — bigger than the LP's 30%
                inset next door, which is what makes the two records tell apart
                at a glance even before the hole is noticed. */}
            <div
              className="absolute overflow-hidden rounded-full ring-1 ring-white/10"
              style={{ inset: '25%' }}
            >
              {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" style={{ animation: labelFade }} />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 46% 62%), hsl(${(hue + 28) % 360} 44% 44%))`,
                  }}
                />
              )}
            </div>
            {/* The big centre hole. A 45 has one you can see across a room, and
                it is the whole reason this reads as a single. */}
            <div
              className="absolute rounded-full bg-[#241408]"
              style={{ inset: '43%', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.8)' }}
            />
          </div>
        </div>

        {/* The spindle puck: the machine's, not the record's, so it neither
            turns nor leaves with the record. It is what the 45's wide hole
            drops over, and without it the hole is just a gap. */}
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: '46.5%',
            background: 'radial-gradient(circle at 38% 34%, #d6d3d1, #78716c 68%, #44403c 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,.6)',
          }}
          aria-hidden
        />

        {/* The chrome arm, pivoting at the right — the same gesture as the
            tonearm on the vinyl deck, because it is the same mechanism. Two
            nested rotations about one pivot, and not one sum: the outer is
            where on the record the needle is (a slow linear creep inward), the
            inner is the arm being cued down, which overshoots and settles. See
            `VinylDeck.tsx` for why adding them together does not work. */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <circle cx="88" cy="18" r="5" fill="#a8a29e" />
          <g
            style={{
              transformOrigin: '88px 18px',
              transform: `rotate(${trackAngle}deg)`,
              // Just longer than the ~250ms between `timeupdate` events, so the
              // creep is continuous rather than four visible steps a second.
              transition: reduced ? undefined : 'transform 0.4s linear',
            }}
          >
            <g
              style={{
                transformOrigin: '88px 18px',
                transform: `rotate(${engaged ? 0 : ARM.LIFT}deg)`,
                transition: reduced ? undefined : 'transform 1.05s cubic-bezier(.34,1.2,.4,1)',
              }}
            >
              {/* ⚠️ Thinner than the tonearm on the vinyl deck (4 and 7.5
                  against 6 and 11), because this arm crosses a 7" inside a
                  window rather than a 12" filling the frame. At the vinyl
                  deck's weight it covers a third of the record. */}
              <path d="M88 18 L63 59" stroke="#d6d3d1" strokeWidth="4" strokeLinecap="round" />
              <path d="M63 59 L58 68" stroke="#a8a29e" strokeWidth="7.5" strokeLinecap="round" />
            </g>
          </g>
        </svg>

        {/* The glass itself: a reflection belongs to the room, not to the
            record, so it sits outside the turning element and stays put. */}
        <div
          className="pointer-events-none absolute rounded-[14%]"
          style={{
            inset: '-4%',
            background:
              'linear-gradient(118deg, rgba(255,255,255,.16) 8%, rgba(255,255,255,.03) 30%, transparent 52%)',
          }}
          aria-hidden
        />
      </div>
    </>
  )
}

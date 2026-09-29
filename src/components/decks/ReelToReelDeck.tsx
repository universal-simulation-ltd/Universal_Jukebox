import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { outerTangent, packRadius, revolutionSeconds, sectorPath, type Point } from '../../lib/reels'
import type { DeckFaceProps } from './face'
import { Scrubber } from './scrub'
import { rotary, rotaryDetents, turnShare } from '../../lib/scrub'

// The reel-to-reel — a home tape deck standing up, seen from the front: two
// open spools across the top, the tape threaded down round the guides, across
// the heads and between the capstan and its pinch roller, and the meters and
// the transport keys along the bottom.
//
// ⚠️ It is the cassette's idea at full size, and it earns its place for the
// same reason: how far through the track you are is simply how full the two
// reels are. What an open reel adds is the thing a cassette's window is too
// small to show — the tape's whole PATH, from one pack to the other, and two
// reels visibly turning at different speeds. Those two are the whole reason
// for the deck; if either ever gets simplified away, it is a cassette again.
//
// ⚠️ Same `progress`, `engaged`, `spinning` as every other face, same ceremony
// timeline. `engaged` is the pinch roller closing on the capstan (this
// machine's arm coming down) and the PLAY key latched; `spinning` is the reels,
// the roller and the meters moving.
//
// ⚠️ The ALBUM is the supply reel — the left one, which empties — and so the
// album art is the label on ITS hub. The take-up reel on the right is the
// machine's own, a bare metal hub, which is how a pre-recorded tape was played:
// the reel out of the box went on the left, onto an empty spool on the right.
// Only that label fades as an album goes on or comes off (`labelFade` in
// `decks/face.ts`); the machine, like the turntable, stays where it is.
//
// Drawn in one SVG, 100 × 90 — which is the frame's ratio in `SHAPES`, so the
// focus ring and the hover target are the deck's own outline.

/**
 * The geometry, in the SVG's own units.
 *
 * ⚠️ The hub is BIG — nearly half the flange — and that is borrowed from the
 * studio machines' NAB hubs rather than from a domestic 7-inch spool. It does
 * two jobs: it is where the album art goes, and a small hub would have made
 * the art a postage stamp; and it keeps the packs' change of speed to the
 * roughly two-to-one a viewer can follow, where a small hub's four-to-one
 * turns the last seconds of every song into a blur.
 */
const REEL = {
  SUPPLY: { x: 26, y: 25 } as Point,
  TAKE_UP: { x: 74, y: 25 } as Point,
  /** The flange: what you see of the spool itself. */
  FLANGE: 22.5,
  /** The bare hub — and the smallest a pack can be. */
  HUB: 11,
  /** A full reel. Just inside the flange's rim, as tape is wound. */
  FULL: 20.6,
  /** The album art on the supply reel's hub. */
  LABEL: 9.6,
  /** The three windows cut through the flange, as radii. */
  WINDOW_IN: 12.8,
  WINDOW_OUT: 19.6,
}

/** The guide rollers either side, which the tape wraps on its way to the heads. */
const GUIDE = {
  LEFT: { x: 6.4, y: 57 } as Point,
  RIGHT: { x: 93.6, y: 57 } as Point,
  R: 2.6,
}

/** The tape's width, and the line it runs along across the heads. */
const TAPE = 1.3
const TAPE_Y = GUIDE.LEFT.y + GUIDE.R

/**
 * How fast the tape runs, in the SVG's units a second.
 *
 * ⚠️ Chosen for the FULL reel, not taken from 7½ inches a second at this
 * scale: a full pack turns once every 3.2 seconds, slow enough to read as a
 * heavy spool rather than a spinner, and an empty hub about twice that fast. A
 * true scale speed would be less than half this and look stopped.
 */
const TAPE_SPEED = (2 * Math.PI * REEL.FULL) / 3.2

/** The capstan, and where the pinch roller meets it from below. */
const CAPSTAN = { x: 71, y: TAPE_Y - TAPE / 2 - 1.5, r: 1.5 }
const PINCH = { x: 71, y: TAPE_Y + TAPE / 2 + 3.1, r: 3.1 }

export default function ReelToReelDeck({ progress, engaged, spinning, reduced, url, hue, labelFade, controls }: DeckFaceProps) {
  // ⚠️ `useId` gives ids with colons in them, which break `url(#…)` in some
  // engines — the cassette's note. Two decks on one page (the Settings
  // miniature beside the real one) must not share a mask.
  const uid = useId().replace(/:/g, '')
  const flangeMask = `jb-r2r-flange-${uid}`
  const labelClip = `jb-r2r-label-${uid}`
  const plate = `jb-r2r-plate-${uid}`
  const metal = `jb-r2r-metal-${uid}`
  const packFill = `jb-r2r-pack-${uid}`
  const meterLit = `jb-r2r-meter-${uid}`
  const bevel = `jb-r2r-bevel-${uid}`
  const chrome = `jb-r2r-chrome-${uid}`

  // The supply reel empties as the take-up reel fills; between them, always
  // one reel's worth of tape.
  //
  // Wound by hand (James, 2026-09-29, of the cassette: "doing circles at the
  // tape turning") — the packs follow the finger, the spools turn under it
  // and keep where they were left, and the song moves when it lets go.
  const [held, setHeld] = useState<number | null>(null)
  const [turn, setTurn] = useState(0)
  const [winding, setWinding] = useState(false)
  const at = held ?? progress
  const supply = packRadius(1 - at, REEL.HUB, REEL.FULL)
  const takeUp = packRadius(at, REEL.HUB, REEL.FULL)
  const spoolsTurning = spinning && !winding

  // The tape, off the OUTSIDE of each pack — the left of the supply reel, the
  // right of the take-up — down to its guide. Both reels turn anticlockwise in
  // play, which is what puts the tape on the outside at both ends.
  const [offSupply, ontoLeft] = outerTangent(REEL.SUPPLY, supply, GUIDE.LEFT, GUIDE.R, 'right')
  const [offTakeUp, ontoRight] = outerTangent(REEL.TAKE_UP, takeUp, GUIDE.RIGHT, GUIDE.R, 'left')
  const path = [
    `M ${offSupply.x} ${offSupply.y}`,
    `L ${ontoLeft.x} ${ontoLeft.y}`,
    // Round the underside of the left guide, and away level across the heads…
    `A ${GUIDE.R} ${GUIDE.R} 0 0 0 ${GUIDE.LEFT.x} ${TAPE_Y}`,
    `L ${GUIDE.RIGHT.x} ${TAPE_Y}`,
    // …round the underside of the right one, and up to the take-up reel.
    `A ${GUIDE.R} ${GUIDE.R} 0 0 0 ${ontoRight.x} ${ontoRight.y}`,
    `L ${offTakeUp.x} ${offTakeUp.y}`,
  ].join(' ')

  // The meters read something only while the tape is moving past a head.
  const reading = engaged && spinning

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 100 90" className="h-full w-full drop-shadow-xl" aria-hidden>
        <defs>
          <linearGradient id={plate} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#2b313c" />
            <stop offset="0.55" stopColor="#1a1f28" />
            <stop offset="1" stopColor="#0f131a" />
          </linearGradient>
          {/* Turned aluminium: lighter towards the rim, and — being a lathe's
              rings — the same all the way round, so the flange can turn under
              a light that does not. */}
          <radialGradient id={metal} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#9aa3b1" />
            <stop offset="0.5" stopColor="#c9d0da" />
            <stop offset="0.86" stopColor="#e7ebf0" />
            <stop offset="0.93" stopColor="#aeb6c2" />
            <stop offset="1" stopColor="#dde2e8" />
          </radialGradient>
          <radialGradient id={packFill} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.4" stopColor="#3a271a" />
            <stop offset="0.9" stopColor="#5e412b" />
            <stop offset="1" stopColor="#7a5738" />
          </radialGradient>
          <linearGradient id={bevel} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,.1)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* Polished steel, lit from above: the heads and the capstan. */}
          <linearGradient id={chrome} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8e98a6" />
            <stop offset="0.35" stopColor="#f1f4f8" />
            <stop offset="0.6" stopColor="#c5ccd6" />
            <stop offset="1" stopColor="#7c8694" />
          </linearGradient>
          <linearGradient id={meterLit} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3d6" />
            <stop offset="1" stopColor="#f6c768" />
          </linearGradient>
          {/* The flange with its three windows cut out, the SAME for both
              reels: drawn once, centred on the origin, and moved to each hub.
              The windows are drawn small and then stroked, round-joined, back
              out to size — which is the cheap way to round a sector's corners. */}
          <mask id={flangeMask} maskUnits="userSpaceOnUse" x={-REEL.FLANGE} y={-REEL.FLANGE} width={REEL.FLANGE * 2} height={REEL.FLANGE * 2}>
            <circle cx="0" cy="0" r={REEL.FLANGE} fill="white" />
            {[0, 120, 240].map((at) => (
              <path
                key={at}
                d={sectorPath({ x: 0, y: 0 }, REEL.WINDOW_IN + 1, REEL.WINDOW_OUT - 1, at + 14, at + 94)}
                fill="black"
                stroke="black"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            ))}
          </mask>
          <clipPath id={labelClip}>
            <circle cx={REEL.SUPPLY.x} cy={REEL.SUPPLY.y} r={REEL.LABEL} />
          </clipPath>
        </defs>

        {/* The faceplate. Dark in both themes — the black deck is the one the
            silver reels stand out on, in a light room or a dark one. */}
        <rect x="0.5" y="0.5" width="99" height="89" rx="4" fill={`url(#${plate})`} stroke="rgba(255,255,255,.14)" strokeWidth="0.8" />
        {/* The bevel along the top edge — see the CD player's body. */}
        <rect x="0.9" y="0.9" width="98.2" height="16" rx="3.6" fill={`url(#${bevel})`} />

        {/* The tension arms, under their rollers: each pivots from the plate
            and holds its guide out where the tape can wrap it. */}
        {[
          { from: GUIDE.LEFT, to: { x: 14.5, y: 68 } },
          { from: GUIDE.RIGHT, to: { x: 85.5, y: 68 } },
        ].map(({ from, to }, i) => (
          <g key={i}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
            <circle cx={to.x} cy={to.y} r="1.7" fill="#374151" stroke="#6b7280" strokeWidth="0.5" />
          </g>
        ))}

        {/* The heads — erase, record, play — standing up out of the head block
            with their faces in the tape path. Chrome, and each with the fine
            gap across its face that is the whole of a tape head's business. */}
        {[36, 44.5, 53].map((x) => (
          <g key={x}>
            <rect x={x - 2.6} y={TAPE_Y - 4.4} width="5.2" height="9" rx="2" fill={`url(#${chrome})`} stroke="#475569" strokeWidth="0.35" />
            <line x1={x} y1={TAPE_Y - 3.8} x2={x} y2={TAPE_Y + 3} stroke="#1e293b" strokeWidth="0.3" />
          </g>
        ))}

        {/* The packs and the flange behind them. Neither has a feature to turn
            — a pack is rings — so neither needs to; only the front flange
            below does, and its windows are what you see turning. */}
        {[
          { at: REEL.SUPPLY, pack: supply },
          { at: REEL.TAKE_UP, pack: takeUp },
        ].map(({ at, pack }, i) => (
          <g key={i}>
            <circle cx={at.x} cy={at.y} r={REEL.FLANGE} fill="#3f4652" />
            <circle cx={at.x} cy={at.y} r={REEL.FLANGE - 0.8} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="0.6" />
            <circle cx={at.x} cy={at.y} r={pack} fill={`url(#${packFill})`} />
            {/* The wind's edge, catching the light. */}
            <circle cx={at.x} cy={at.y} r={Math.max(REEL.HUB, pack - 0.3)} fill="none" stroke="rgba(255,226,190,.28)" strokeWidth="0.5" />
          </g>
        ))}

        {/* The tape, drawn over the packs and the heads and UNDER the front
            flanges — it runs between the two flanges of each spool, so it shows
            through their windows and comes out from behind the rim. Its ends
            are worked out afresh from each pack's size (`outerTangent`), so it
            stays on the reels as they fill and empty. */}
        <path d={path} fill="none" stroke="#6f4b2f" strokeWidth={TAPE} strokeLinejoin="round" />
        <path d={path} fill="none" stroke="rgba(255,220,180,.22)" strokeWidth={TAPE * 0.3} strokeLinejoin="round" transform="translate(0 -0.3)" />

        {/* The front flanges and the hubs: the part that turns. */}
        <Spool
          at={REEL.SUPPLY}
          radius={supply}
          turn={turn}
          spinning={spoolsTurning}
          reduced={reduced}
          mask={flangeMask}
          metal={metal}
        >
          {/* The album, on the supply reel's hub. */}
          {url ? (
            <image
              href={url}
              x={REEL.SUPPLY.x - REEL.LABEL}
              y={REEL.SUPPLY.y - REEL.LABEL}
              width={REEL.LABEL * 2}
              height={REEL.LABEL * 2}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${labelClip})`}
              style={{ animation: labelFade }}
            />
          ) : (
            <circle cx={REEL.SUPPLY.x} cy={REEL.SUPPLY.y} r={REEL.LABEL} fill={`hsl(${hue} 46% 54%)`} />
          )}
          <circle cx={REEL.SUPPLY.x} cy={REEL.SUPPLY.y} r={REEL.LABEL} fill="none" stroke="rgba(15,23,42,.35)" strokeWidth="0.5" />
        </Spool>
        <Spool
          at={REEL.TAKE_UP}
          radius={takeUp}
          turn={turn}
          spinning={spoolsTurning}
          reduced={reduced}
          mask={flangeMask}
          metal={metal}
        >
          {/* The machine's own reel: a bare hub, with the three holes of the
              adaptor it is locked on by. */}
          <circle cx={REEL.TAKE_UP.x} cy={REEL.TAKE_UP.y} r={REEL.LABEL} fill="#aab2be" />
          {[0, 120, 240].map((at) => (
            <path
              key={at}
              d={sectorPath(REEL.TAKE_UP, 4, 7.9, at + 25, at + 95)}
              fill="#1f2530"
              stroke="#1f2530"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          ))}
          <circle cx={REEL.TAKE_UP.x} cy={REEL.TAKE_UP.y} r={REEL.LABEL} fill="none" stroke="rgba(15,23,42,.35)" strokeWidth="0.5" />
        </Spool>

        {/* The guide rollers, over the tape that wraps them — drawn a tape's
            half-width small, so the tape shows round their edge. */}
        {[GUIDE.LEFT, GUIDE.RIGHT].map((g, i) => (
          <g key={i}>
            <circle cx={g.x} cy={g.y} r={GUIDE.R - TAPE / 2} fill="#d5dbe3" stroke="#64748b" strokeWidth="0.35" />
            <circle cx={g.x} cy={g.y} r="0.8" fill="#475569" />
          </g>
        ))}

        {/* The head block, in front of the heads' bases. */}
        <rect x="29" y={TAPE_Y + 2.2} width="31" height="10" rx="2" fill="#242a34" stroke="rgba(255,255,255,.1)" strokeWidth="0.4" />
        <rect x="29.6" y={TAPE_Y + 2.6} width="29.8" height="1.4" rx="0.7" fill="rgba(255,255,255,.07)" />
        {/* The tape counter, set into the block: three white-on-black wheels
            that count up as the tape goes by. It reads the TRACK, 000 → 999,
            the same number the packs are drawn from — a real counter counts
            turns of a reel, which says the same thing in a unit nobody knows. */}
        <Counter x={37.4} y={TAPE_Y + 5.2} value={Math.floor(Math.max(0, Math.min(1, progress)) * 999)} />
        <circle cx="33" cy={TAPE_Y + 7.2} r="1.1" fill={engaged ? '#fb923c' : '#3b3f47'} style={{ filter: engaged ? 'drop-shadow(0 0 1.2px rgba(251,146,60,.9))' : undefined, transition: reduced ? undefined : 'fill .3s ease' }} />
        <circle cx="56" cy={TAPE_Y + 7.2} r="1.5" fill="#1a1e26" stroke="#6b7280" strokeWidth="0.35" />
        <line x1="56" y1={TAPE_Y + 5.9} x2="56" y2={TAPE_Y + 6.8} stroke="#cbd5e1" strokeWidth="0.35" strokeLinecap="round" />

        {/* The capstan: a steel shaft, fixed. The tape is pulled past the heads
            by it alone — which is why the pinch roller below is this machine's
            arm coming down. */}
        <circle cx={CAPSTAN.x} cy={CAPSTAN.y} r={CAPSTAN.r + 1.1} fill="#232833" stroke="rgba(255,255,255,.1)" strokeWidth="0.3" />
        <circle cx={CAPSTAN.x} cy={CAPSTAN.y} r={CAPSTAN.r} fill={`url(#${chrome})`} stroke="#475569" strokeWidth="0.3" />

        {/* The pinch roller and its lever, which swing UP to press the tape
            against the capstan as play latches — and drop away again on
            every change of track, the handover the other decks show with an
            arm or a laser. */}
        <g
          style={{
            transform: `translateY(${engaged ? 0 : 3.2}px)`,
            // The same settle as the tonearm's landing and the cassette's head:
            // a mechanism latching, not a thing fading in.
            transition: reduced ? undefined : 'transform 1.05s cubic-bezier(.34,1.2,.4,1)',
          }}
        >
          <line x1={PINCH.x} y1={PINCH.y} x2={PINCH.x + 8} y2={PINCH.y + 6.5} stroke="#4b5563" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx={PINCH.x + 8} cy={PINCH.y + 6.5} r="1.3" fill="#374151" stroke="#6b7280" strokeWidth="0.4" />
          <circle cx={PINCH.x} cy={PINCH.y} r={PINCH.r} fill="#2a2f39" stroke="#8b94a3" strokeWidth="0.5" />
          <circle cx={PINCH.x} cy={PINCH.y} r={PINCH.r - 0.9} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="0.5" />
          {/* One mark on the rubber, or a plain circle turning is a plain
              circle. Clockwise: its top runs WITH the tape. */}
          <g
            style={{
              transformOrigin: `${PINCH.x}px ${PINCH.y}px`,
              animation: reduced ? undefined : 'jb-spin 0.42s linear infinite',
              animationPlayState: spinning ? 'running' : 'paused',
            }}
          >
            <path d={`M${PINCH.x} ${PINCH.y - PINCH.r + 0.5} L${PINCH.x} ${PINCH.y - 1}`} stroke="#94a3b8" strokeWidth="0.6" strokeLinecap="round" />
          </g>
          <circle cx={PINCH.x} cy={PINCH.y} r="1.1" fill={`url(#${chrome})`} stroke="#475569" strokeWidth="0.25" />
        </g>

        {/* ── The transport strip ─────────────────────────────────────────── */}
        <rect x="3" y="74" width="94" height="13" rx="2.2" fill="#161a21" stroke="rgba(255,255,255,.08)" strokeWidth="0.4" />
        <Meter x={5} lit={engaged} reading={reading} reduced={reduced} fill={meterLit} delay="0s" />
        <Meter x={76} lit={engaged} reading={reading} reduced={reduced} fill={meterLit} delay="-0.37s" />
        <Keys engaged={engaged} spinning={spinning} />
      </svg>

      {controls && (
        <>
          {/* Positions are the keys' own, as shares of the drawing's 100 × 90. */}
          <KeyButton label="Previous track" x={KEY_X[0]} onPress={controls.previous} />
          <KeyButton label="Play" x={KEY_X[1]} onPress={() => !controls.playing && controls.toggle()} />
          <KeyButton label="Pause" x={KEY_X[2]} onPress={() => controls.playing && controls.toggle()} />
          <KeyButton label="Next track" x={KEY_X[3]} onPress={controls.next} />
        </>
      )}

      {/* Either spool, wound by hand. ⚠️ ANTICLOCKWISE IS ON, the way the
          spools turn when the tape plays (see `Spool`) — so the finger follows
          the tape, where the cassette and the pocket player go clockwise. */}
      {controls && engaged && controls.durationSec > 0 &&
        [REEL.SUPPLY, REEL.TAKE_UP].map((reel) => (
          <Scrubber
            key={reel.x}
            controls={controls}
            position={progress}
            held={held}
            setHeld={setHeld}
            detents={rotaryDetents(controls.durationSec)}
            label="Tape spool — circle it anticlockwise to wind on through the song, clockwise to wind back"
            className="aspect-square cursor-grab rounded-full active:cursor-grabbing"
            style={{
              left: `${reel.x}%`,
              top: `${(reel.y / 90) * 100}%`,
              width: 'max(44px, 44%)',
              transform: 'translate(-50%, -50%)',
            }}
            begin={(x0, y0, from, el) => {
              const box = el.getBoundingClientRect()
              const base = turn
              setWinding(true)
              return rotary(
                box.left + box.width / 2,
                box.top + box.height / 2,
                x0,
                y0,
                from,
                -turnShare(controls.durationSec),
                (degrees) => setTurn(base + degrees),
              )
            }}
            onEnd={() => setWinding(false)}
            bubble="inside"
          />
        ))}
    </div>
  )
}

/**
 * One reel's front flange and hub — the part that turns — with whatever is on
 * the hub (`children`: the album, or the machine's bare metal) turning with it.
 *
 * ⚠️ THE TWO REELS TURN AT DIFFERENT, CHANGING SPEEDS, which is what the
 * cassette's reels were written to do and then taken out of (see `Reel` in
 * `CassetteDeck.tsx`). Its reason was sound: changing `animation-duration` as
 * the track plays makes CSS keep the ELAPSED time and re-derive the angle from
 * it, so the reel jumps on every update, further the longer the track runs.
 * `useTurnRate` goes round that rather than through it — see there.
 *
 * Anticlockwise, both of them (`reverse`): the tape comes off the outside-left
 * of the supply reel and on to the outside-right of the take-up, and the reel
 * surface there moves with it.
 */
function Spool({
  at, radius, turn, spinning, reduced, mask, metal, children,
}: {
  at: Point
  radius: number
  /** How far a finger has wound it, degrees — outside the motor's turn. */
  turn: number
  spinning: boolean
  reduced: boolean
  mask: string
  metal: string
  children: ReactNode
}) {
  const turning = useRef<SVGGElement>(null)
  const base = useTurnRate(turning, revolutionSeconds(radius, TAPE_SPEED))
  return (
    <g transform={turn ? `rotate(${turn % 360} ${at.x} ${at.y})` : undefined}>
    <g
      ref={turning}
      style={{
        transformOrigin: `${at.x}px ${at.y}px`,
        animation: reduced ? undefined : `jb-spin ${base}s linear infinite reverse`,
        // Paused rather than removed, like the platter: taking the animation
        // off snaps the reel back to where it started.
        animationPlayState: spinning ? 'running' : 'paused',
      }}
    >
      <g transform={`translate(${at.x} ${at.y})`}>
        <circle cx="0" cy="0" r={REEL.FLANGE} fill={`url(#${metal})`} mask={`url(#${mask})`} />
        {/* The rim, and the lathe's rings. */}
        <circle cx="0" cy="0" r={REEL.FLANGE - 0.25} fill="none" stroke="rgba(15,23,42,.35)" strokeWidth="0.5" />
        <circle cx="0" cy="0" r={REEL.WINDOW_OUT + 1.2} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.3" />
        <circle cx="0" cy="0" r={REEL.WINDOW_IN - 1} fill="none" stroke="rgba(15,23,42,.2)" strokeWidth="0.3" />
      </g>
      {children}
      {/* The spindle and its three-lug lock, over the label. */}
      <circle cx={at.x} cy={at.y} r="2.3" fill="#e5e9ef" stroke="#64748b" strokeWidth="0.35" />
      {[0, 120, 240].map((a) => (
        <rect
          key={a}
          x={at.x - 0.55}
          y={at.y - 3.3}
          width="1.1"
          height="1.8"
          rx="0.4"
          fill="#94a3b8"
          transform={`rotate(${a} ${at.x} ${at.y})`}
        />
      ))}
      <circle cx={at.x} cy={at.y} r="0.8" fill="#475569" />
    </g>
    </g>
  )
}

/**
 * Turn a reel at `seconds` a revolution, as that changes, WITHOUT a jump.
 *
 * ⚠️ BY THE ANIMATION'S PLAYBACK RATE, NOT ITS DURATION. The duration is fixed
 * at whatever the reel's speed was when it mounted (`base`, returned for the
 * `animation` shorthand) and never touched again; what follows the pack is
 * `Animation.updatePlaybackRate()`, which — unlike a new duration — keeps the
 * animation's current position and only changes how fast it moves on from
 * there. So a reel speeds up as it empties without ever skipping a frame.
 *
 * ⚠️ In a layout effect, so the new rate is in before the frame is painted,
 * and with no dependency list: `getAnimations()` is cheap, the rate only moves
 * four times a second (`timeupdate`), and the animation can be REPLACED under
 * it — reduced motion switched off, a remount — without anything here being
 * told. Setting the same rate again is a no-op.
 *
 * An engine without the Web Animations API (or a test's DOM) just turns the
 * reel at `base`, which is what the cassette's reels do all the time.
 */
function useTurnRate(ref: RefObject<SVGGElement | null>, seconds: number): number {
  const [base] = useState(() => (Number.isFinite(seconds) ? Math.round(seconds * 100) / 100 : 2))
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.getAnimations !== 'function' || !Number.isFinite(seconds) || seconds <= 0) return
    const rate = base / seconds
    for (const animation of el.getAnimations()) {
      if (Math.abs(animation.playbackRate - rate) < 0.002) continue
      if (typeof animation.updatePlaybackRate === 'function') animation.updatePlaybackRate(rate)
      else animation.playbackRate = rate
    }
  })
  return base
}

/** A three-digit tape counter: white numerals on black wheels. */
function Counter({ x, y, value }: { x: number; y: number; value: number }) {
  const digits = String(Math.max(0, Math.min(999, Math.round(value)))).padStart(3, '0')
  return (
    <g>
      <rect x={x - 0.6} y={y - 0.6} width="15.6" height="5.6" rx="0.9" fill="#0b0f16" stroke="rgba(255,255,255,.12)" strokeWidth="0.3" />
      {[...digits].map((d, i) => (
        <g key={i}>
          <rect x={x + i * 4.9} y={y} width="4.4" height="4.4" rx="0.5" fill="#161a21" />
          <text x={x + i * 4.9 + 2.2} y={y + 3.45} fontSize="3.6" fontWeight="600" textAnchor="middle" fill="#f1f5f9" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            {d}
          </text>
        </g>
      ))}
      {/* The wheels' shadow top and bottom, so they read as drums. */}
      <rect x={x} y={y} width="14.2" height="1" fill="rgba(0,0,0,.35)" />
      <rect x={x} y={y + 3.4} width="14.2" height="1" fill="rgba(0,0,0,.35)" />
    </g>
  )
}

/**
 * A VU meter: a lit face and a needle.
 *
 * ⚠️ THE NEEDLE IS NOT READING THE MUSIC. The jukebox face's meter does
 * (`useLevels`), and it can only because building that Web Audio graph is a
 * one-way door the jukebox takes deliberately (`lib/audioGraph.ts`) — a second
 * face walking through it for a pair of needles is not a trade worth making.
 * So these swing gently round the zero mark while the tape is moving and fall
 * back to rest when it stops: a meter showing the machine is RUNNING, which is
 * true, rather than a level, which would be made up.
 */
function Meter({
  x, lit, reading, reduced, fill, delay,
}: { x: number; lit: boolean; reading: boolean; reduced: boolean; fill: string; delay: string }) {
  const y = 75.6
  const w = 19
  const h = 9.8
  const pivot = { x: x + w / 2, y: y + h + 3.2 }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="1.1" fill="#0b0f16" />
      <rect
        x={x + 0.6}
        y={y + 0.6}
        width={w - 1.2}
        height={h - 1.2}
        rx="0.7"
        fill={lit ? `url(#${fill})` : '#3a3a36'}
        style={{ transition: reduced ? undefined : 'opacity .4s ease' }}
        opacity={lit ? 1 : 0.9}
      />
      {/* The scale: an arc of ticks, the last three red. */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = (-40 + i * 10) * (Math.PI / 180)
        const r1 = 8.6
        const r2 = i % 2 === 0 ? 10 : 9.4
        return (
          <line
            key={i}
            x1={pivot.x + r1 * Math.sin(a)}
            y1={pivot.y - r1 * Math.cos(a)}
            x2={pivot.x + r2 * Math.sin(a)}
            y2={pivot.y - r2 * Math.cos(a)}
            stroke={i >= 6 ? '#c2410c' : lit ? '#44403c' : '#78716c'}
            strokeWidth="0.35"
          />
        )
      })}
      <path
        d={`M ${pivot.x - 8.6 * Math.sin((40 * Math.PI) / 180)} ${pivot.y - 8.6 * Math.cos((40 * Math.PI) / 180)} A 8.6 8.6 0 0 1 ${pivot.x + 8.6 * Math.sin((40 * Math.PI) / 180)} ${pivot.y - 8.6 * Math.cos((40 * Math.PI) / 180)}`}
        fill="none"
        stroke={lit ? '#57534e' : '#78716c'}
        strokeWidth="0.3"
      />
      {/* The needle: rest hard left, or up round zero while the tape moves —
          and swinging there, paused never removed. */}
      <g
        style={{
          transformOrigin: `${pivot.x}px ${pivot.y}px`,
          transform: `rotate(${reading ? -2 : -44}deg)`,
          transition: reduced ? undefined : 'transform 0.6s cubic-bezier(.3,1.35,.5,1)',
        }}
      >
        <g
          style={{
            transformOrigin: `${pivot.x}px ${pivot.y}px`,
            animation: reduced ? undefined : `jb-vu 2.3s ease-in-out ${delay} infinite`,
            animationPlayState: reading ? 'running' : 'paused',
          }}
        >
          <line x1={pivot.x} y1={pivot.y} x2={pivot.x} y2={pivot.y - 10.4} stroke="#1c1917" strokeWidth="0.45" strokeLinecap="round" />
        </g>
      </g>
      {/* The bezel's lower lip hides the pivot. */}
      <rect x={x} y={y + h - 1.6} width={w} height="1.6" fill="#0b0f16" />
    </g>
  )
}

/** The four transport keys' left edges, in the drawing's units. */
const KEY_X = [31, 41, 51, 61]
const KEY = { y: 76.4, w: 8, h: 8.8 }

/**
 * Rewind, play, pause, fast-forward: piano keys, PLAY latched down (and lit)
 * while the head is on the tape, PAUSE latched down over it when the reels
 * stop. What is down is the machine's state, as it would be on the real thing.
 */
function Keys({ engaged, spinning }: { engaged: boolean; spinning: boolean }) {
  const down = [false, engaged, engaged && !spinning, false]
  const icons = [
    // ◀◀
    'M-2.6 0 L0 -1.6 L0 1.6 Z M0 0 L2.6 -1.6 L2.6 1.6 Z',
    // ▶
    'M-1.3 -1.8 L2 0 L-1.3 1.8 Z',
    // ❚❚
    'M-1.8 -1.7 H-0.5 V1.7 H-1.8 Z M0.5 -1.7 H1.8 V1.7 H0.5 Z',
    // ▶▶
    'M-2.6 -1.6 L0 0 L-2.6 1.6 Z M0 -1.6 L2.6 0 L0 1.6 Z',
  ]
  return (
    <g>
      {KEY_X.map((x, i) => {
        const pressed = down[i]
        const drop = pressed ? 0.9 : 0
        return (
          <g key={i}>
            <rect x={x} y={KEY.y} width={KEY.w} height={KEY.h} rx="1" fill="#0b0f16" />
            <rect
              x={x + 0.35}
              y={KEY.y + 0.3 + drop}
              width={KEY.w - 0.7}
              height={KEY.h - 0.8 - drop}
              rx="0.8"
              fill={pressed ? '#9aa3b1' : '#d5dbe3'}
            />
            <rect x={x + 0.35} y={KEY.y + 0.3 + drop} width={KEY.w - 0.7} height="1.1" rx="0.55" fill="rgba(255,255,255,.55)" />
            <path d={icons[i]} transform={`translate(${x + KEY.w / 2} ${KEY.y + KEY.h / 2 + drop / 2 + 0.3})`} fill={i === 1 && pressed ? '#E05504' : '#334155'} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * One transport key, as a button over the drawing.
 *
 * ⚠️ STOPS THE CLICK, and the key — the pocket player's `WheelButton` note:
 * the whole deck is a button that opens the album (`Deck.tsx`), so a press that
 * got through would change track AND leave the page.
 */
function KeyButton({ label, x, onPress }: { label: string; x: number; onPress(): void }): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
        onPress()
      }}
      onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
      className="absolute cursor-pointer rounded-[18%] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E05504] active:bg-white/15"
      style={{
        left: `${x}%`,
        top: `${(KEY.y / 90) * 100}%`,
        width: `${KEY.w}%`,
        height: `${(KEY.h / 90) * 100}%`,
      }}
    />
  )
}

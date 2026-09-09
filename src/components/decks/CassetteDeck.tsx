import { useId } from 'react'
import type { DeckFaceProps } from './face'

// The cassette — a Walkman shell with the window facing you.
//
// ⚠️ Same `progress`, `engaged`, `spinning` as the other two, same ceremony
// timeline. What is different is where the progress GOES: there is no pickup
// creeping across anything here, because on a cassette how far through you are
// is simply how full the two reels are. That is the nicest thing about this
// deck and the reason it earns its place next to the other two.

/**
 * The reel geometry, in the SVG's own units (the shell is 100 × 66).
 *
 * ⚠️ `pack()` is not linear, and the square root is the whole reason it looks
 * right. Tape is a constant thickness, so what grows evenly as it spools is the
 * AREA of the annulus, not the radius — a take-up reel gains radius fast at
 * first and barely moves by the end. Interpolating the radius straight from 0
 * to 1 gives two reels that visibly do not conserve tape, which is the sort of
 * thing nobody can name and everybody can see.
 */
const REEL = {
  LEFT_X: 32,
  RIGHT_X: 68,
  Y: 44.5,
  /** The bare hub. */
  HUB: 4,
  /** A full reel. Fits the window with a little air. */
  MAX: 11.5,
}

function pack(fraction: number): number {
  const f = Math.max(0, Math.min(1, fraction))
  return Math.sqrt(REEL.HUB * REEL.HUB + (REEL.MAX * REEL.MAX - REEL.HUB * REEL.HUB) * f)
}

export default function CassetteDeck({ progress, engaged, spinning, reduced, url, hue, arrival }: DeckFaceProps) {
  // ⚠️ `useId` gives ids with colons in them, which are legal in HTML but break
  // `url(#…)` references in some engines. Strip them; the point is only that
  // two decks on one page cannot share a clip path.
  const uid = useId().replace(/:/g, '')
  const labelClip = `jb-cass-label-${uid}`
  const shellClip = `jb-cass-shell-${uid}`
  const labelFill = `jb-cass-fill-${uid}`

  // Supply reel empties as the take-up reel fills. Together they always hold
  // one cassette's worth of tape.
  const left = pack(1 - progress)
  const right = pack(progress)

  return (
    // ⚠️ The arrival is on EVERYTHING here, unlike the other two faces. A
    // cassette deck is a slot: the shell, its window and the head that meets it
    // are one drawing, and there is no "player" left behind when the tape comes
    // out. See `arrival` in `decks/face.ts`.
    <div className="absolute inset-0" style={{ animation: arrival }}>
      <svg viewBox="0 0 100 66" className="h-full w-full drop-shadow-xl" aria-hidden>
        <defs>
          <clipPath id={labelClip}>
            <rect x="7" y="5" width="86" height="22" rx="2" />
          </clipPath>
          <clipPath id={shellClip}>
            <rect x="0.5" y="0.5" width="99" height="65" rx="5" />
          </clipPath>
          <linearGradient id={labelFill} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`hsl(${hue} 46% 62%)`} />
            <stop offset="100%" stopColor={`hsl(${(hue + 28) % 360} 44% 44%)`} />
          </linearGradient>
        </defs>

        {/* The shell. Dark in both themes — so is every cassette ever made. */}
        <rect x="0.5" y="0.5" width="99" height="65" rx="5" fill="#141b2b" stroke="rgba(255,255,255,.14)" strokeWidth="1" />

        <g clipPath={`url(#${shellClip})`}>
          {/* The inlay card IS the album art — the cassette's answer to the
              centre label, and the same reason the artwork extraction pays for
              itself on every deck. */}
          {url ? (
            <image
              href={url}
              x="7"
              y="5"
              width="86"
              height="22"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${labelClip})`}
            />
          ) : (
            <rect x="7" y="5" width="86" height="22" rx="2" fill={`url(#${labelFill})`} />
          )}
          <rect x="7" y="5" width="86" height="22" rx="2" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="0.7" />

          {/* The window. */}
          <rect x="13" y="31" width="74" height="27" rx="3" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.16)" strokeWidth="0.7" />

          <Reel x={REEL.LEFT_X} radius={left} spinning={spinning} reduced={reduced} />
          <Reel x={REEL.RIGHT_X} radius={right} spinning={spinning} reduced={reduced} />

          {/* The head and the pinch roller, which come UP into the tape path
              through the openings in the bottom of the shell when you press
              play — this deck's version of the arm coming down. Retracted, they
              slide back inside the mechanism, which is what the clip path above
              is for. */}
          <g
            style={{
              transform: `translateY(${engaged ? 0 : 8}px)`,
              // The same settle as the tonearm's landing: a mechanism latching,
              // not a thing fading in.
              transition: reduced ? undefined : 'transform 1.05s cubic-bezier(.34,1.2,.4,1)',
            }}
          >
            <rect x="42" y="57.5" width="10" height="7" rx="1.2" fill="#94a3b8" />
            <rect x="46.6" y="57.5" width="0.8" height="7" fill="#334155" />
            <circle
              cx="62"
              cy="61"
              r="2.7"
              fill="#0f172a"
              stroke="#64748b"
              strokeWidth="0.8"
              style={{
                transformOrigin: '62px 61px',
                animation: reduced ? undefined : 'jb-spin 0.5s linear infinite',
                animationPlayState: spinning ? 'running' : 'paused',
              }}
            />
            {/* One mark on the roller, or a plain circle turning is a plain
                circle. */}
            <path
              d="M62 58.6 L62 60"
              stroke="#94a3b8"
              strokeWidth="0.7"
              strokeLinecap="round"
              style={{
                transformOrigin: '62px 61px',
                animation: reduced ? undefined : 'jb-spin 0.5s linear infinite',
                animationPlayState: spinning ? 'running' : 'paused',
              }}
            />
          </g>

          {/* The tape itself, drawn LAST so it passes in front of the head — the
              way it physically does. Its ends follow the packs, so it stays
              attached to the reels as they change size. */}
          <path
            d={`M ${REEL.LEFT_X - left} ${REEL.Y} C ${REEL.LEFT_X - left} 54, 18 53, 18 60 L 82 60 C 82 53, ${REEL.RIGHT_X + right} 54, ${REEL.RIGHT_X + right} ${REEL.Y}`}
            fill="none"
            stroke="#6b4a30"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  )
}

/**
 * One reel: the hub, its teeth, and the tape wound on it.
 *
 * ⚠️ Both reels turn at the SAME rate, which is not what a cassette does — a
 * near-empty supply reel spins visibly faster than a full take-up one. It was
 * written that way and then taken out: the honest version means recomputing
 * `animation-duration` four times a second off `timeupdate`, and CSS keeps the
 * ELAPSED time when a duration changes, so the phase jumps further on every
 * update the longer the track runs. A reel that stutters once a second is a
 * worse lie than one turning at a constant speed, and the reels changing SIZE
 * already carries the information.
 */
function Reel({
  x, radius, spinning, reduced,
}: { x: number; radius: number; spinning: boolean; reduced: boolean }) {
  const y = REEL.Y
  return (
    <g
      style={{
        transformOrigin: `${x}px ${y}px`,
        animation: reduced ? undefined : 'jb-spin 1.4s linear infinite',
        animationPlayState: spinning ? 'running' : 'paused',
      }}
    >
      <circle cx={x} cy={y} r={radius} fill="#5b3f28" />
      <circle cx={x} cy={y} r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="0.5" />
      {/* Two faint streaks, so a brown disc turning looks like it is turning. */}
      <path d={`M${x} ${y} L${x} ${y - radius}`} stroke="rgba(255,255,255,.10)" strokeWidth="0.7" />
      <path
        d={`M${x} ${y} L${x} ${y - radius}`}
        stroke="rgba(255,255,255,.10)"
        strokeWidth="0.7"
        transform={`rotate(140 ${x} ${y})`}
      />
      <circle cx={x} cy={y} r={REEL.HUB} fill="#cbd5e1" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={x - 0.65}
          y={y - REEL.HUB}
          width="1.3"
          height="2"
          rx="0.5"
          fill="#64748b"
          transform={`rotate(${i * 60} ${x} ${y})`}
        />
      ))}
    </g>
  )
}

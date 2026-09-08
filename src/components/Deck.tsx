import { coverUrl, fallbackHue } from '../lib/art'
import { navigate } from '../lib/route'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { usePlayerStore } from '../stores/playerStore'
import type { Album } from '../lib/types'

// The deck: a record turning, with the album's cover as its centre label, the
// arm coming down onto it when you put something on — and the needle working
// its way in across the record as the track plays.
//
// ⚠️ THIS COMPONENT OWNS NO TIMING. The ceremony's beats (§22.9) live in
// `playerStore`, and this reads `armDown` / `ceremonyCount` off it.
//
// That split is not tidiness. The timeline WAS here, and because the ceremonial
// deck is only mounted on Now Playing, pressing Play from an album set the
// ceremony going with nothing to finish it — and since the ceremony loads the
// audio without playing it, the result was silence that never resolved. A view
// cannot be responsible for something that has to happen whether or not the
// view exists.
//
// The beats, for reference (they are asserted in the store):
//   0.00s  platter spins up, arm parked, 3 · 2 · 1 counts BESIDE the deck
//   0.78s  "2" — the arm starts its swing
//   1.56s  "1" — the arm is most of the way across
//   1.83s  the arm lands: thunk, then crackle fading under the music
//   2.34s  numerals clear, playback starts, the platter keeps turning
//
// After that the arm is no longer the ceremony's: it belongs to the TRACK. The
// needle creeps inward from the outer groove to the label over the track's
// length (`ARM`, below, off `currentSec / durationSec`), and `playerStore`'s
// needle handover lifts it and sends it back out to the start between tracks.
//
// ⚠️ And it FREEZES on pause rather than resetting — both the platter, whose
// `animation-play-state` is paused and never removed, and the needle, whose
// angle comes from `currentSec` and so stays exactly where the music stopped.
// Pressing pause on a record player does not spin the label back to the top or
// throw the needle back to track one.

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
 */
const ARM = {
  /** The outer groove — where the needle lands. */
  TRACK_START: -14,
  /** How far it creeps inward over a whole track. */
  TRACK_TRAVEL: 24,
  /** How far ABOVE its current position the arm sits when lifted. */
  LIFT: -24,
}

interface DeckProps {
  album: Album | undefined
  /** Big on Now Playing, small in the mini player. */
  size: number
  /** Only the Now Playing deck runs the ceremony. */
  ceremonial?: boolean
}

export default function Deck({ album, size, ceremonial = false }: DeckProps) {
  const playing = usePlayerStore((s) => s.playing)
  const ceremony = usePlayerStore((s) => s.ceremony)
  const armDownState = usePlayerStore((s) => s.armDown)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const durationSec = usePlayerStore((s) => s.durationSec)
  const reduced = usePrefersReducedMotion()

  const active = ceremonial && ceremony
  // A non-ceremonial deck (the mini player) always shows the arm down while
  // something is playing — it is a picture of the state, not of the ceremony.
  const armDown = ceremonial ? armDownState : playing

  /**
   * How far through the track we are, 0 → 1, and therefore how far across the
   * record the needle has travelled.
   *
   * ⚠️ Guarded on a KNOWN duration. A track whose length the browser has not
   * worked out yet reports NaN or Infinity; dividing by either gives a rotation
   * of `NaNdeg`, which CSS drops on the floor — the arm would simply stop
   * following the music, with nothing anywhere raising an error.
   */
  const progress =
    Number.isFinite(durationSec) && durationSec > 0
      ? Math.max(0, Math.min(1, currentSec / durationSec))
      : 0
  const trackAngle = ARM.TRACK_START + progress * ARM.TRACK_TRAVEL

  const url = album ? coverUrl(album.id, album.cover) : null
  const hue = album ? fallbackHue(album.id) : 24
  // ⚠️ Spins during the ceremony TOO. Beat 0.00s of §22.9 is "the platter spins
  // up, the arm is still parked" — a still platter with an arm swinging onto it
  // is a record player that is not running, which is the one thing the whole
  // animation is meant to show. This read `playing && !active`, which was
  // exactly backwards for the two seconds anybody is actually watching.
  const spinning = playing || active

  const openAlbum = () => {
    if (album) navigate({ view: 'album', albumId: album.id })
  }

  return (
    <div className="group flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        aria-label={album ? `Open ${album.title}` : 'Open album'}
        onClick={openAlbum}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openAlbum()
          }
        }}
        className="relative cursor-pointer transition-transform duration-200 hover:-translate-y-[3px] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#E05504]"
        style={{ width: size, height: size, borderRadius: '50%' }}
      >
        {/* The record. */}
        <div
          className="absolute inset-0 rounded-full bg-slate-900 shadow-xl dark:bg-[#12192b]"
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
          {/* Grooves. Rendered as repeating rings in one gradient rather than N
              elements: at 420px this is one paint instead of twenty. */}
          <div
            className="absolute inset-0 rounded-full opacity-[0.16]"
            style={{
              background:
                'repeating-radial-gradient(circle at 50% 50%, transparent 0 3px, rgba(255,255,255,.5) 3px 4px)',
            }}
          />
          {/* The cover IS the centre label — which is what earns the artwork all
              the extraction work bought. */}
          <div
            className="absolute overflow-hidden rounded-full ring-1 ring-white/10"
            style={{ inset: '30%' }}
          >
            {url ? (
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue} 46% 62%), hsl(${(hue + 28) % 360} 44% 44%))`,
                }}
              />
            )}
          </div>
          {/* Spindle hole. */}
          <div
            className="absolute rounded-full bg-slate-100 dark:bg-slate-900"
            style={{ inset: '48.4%' }}
          />
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
                transform: `rotate(${armDown ? 0 : ARM.LIFT}deg)`,
                // Overshoots a touch and settles, like a real arm being cued.
                transition: reduced ? undefined : 'transform 1.05s cubic-bezier(.34,1.2,.4,1)',
              }}
            >
              <path d="M78 12 L48 62" stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="6" strokeLinecap="round" />
              <path d="M48 62 L42 74" stroke="currentColor" className="text-slate-500 dark:text-slate-400" strokeWidth="11" strokeLinecap="round" />
            </g>
          </g>
        </svg>

        {/* Drifting notes — pure decoration, and only while the arm is down and
            something is playing. */}
        {spinning && !reduced && <Notes />}
      </div>

      {/* The affordance, kept quiet: the deck is also the thing you are meant to
          just watch. */}
      <p className="mt-3 text-[11px] text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500">
        Open album
      </p>

      {/* ⚠️ There is deliberately NO countdown rendered here. The numerals are
          `CeremonyCount`, which NowPlaying renders into the INFO COLUMN beside
          the deck — never over it. The first design pass put a full-screen
          overlay in front of the deck, which hid the arm coming across, i.e.
          the only reason to run the animation at all. This is the obvious place
          to put it back; don't. */}
    </div>
  )
}

/**
 * The numerals, rendered by the INFO COLUMN so they take the space the track
 * title occupies the rest of the time — nothing moves that wasn't going to.
 */
export function CeremonyCount() {
  const count = usePlayerStore((s) => s.ceremonyCount)
  if (count === null) return null
  return (
    <p
      key={count}
      className="text-6xl font-semibold tracking-tight text-orange-600 tabular-nums dark:text-orange-400"
      style={{ animation: 'jb-count 780ms ease-out' }}
      aria-hidden
    >
      {count}
    </p>
  )
}

/** Two notes drifting off the headshell. CSS only; stops with the music. */
function Notes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute text-orange-500/70 dark:text-orange-400/70"
          style={{
            right: '4%',
            top: '58%',
            fontSize: 20,
            animation: `jb-drift 3.4s ease-out ${i * 1.7}s infinite`,
          }}
        >
          ♪
        </span>
      ))}
    </div>
  )
}

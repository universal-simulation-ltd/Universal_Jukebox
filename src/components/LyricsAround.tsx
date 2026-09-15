import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { activeLine, type LyricLine } from '../lib/lyrics'
import { orbitHead, orbitRibbon } from '../lib/lyricOrbit'
import { wordWidths } from '../lib/textWidth'
import { countIn } from '../lib/countIn'
import { nextSungLine } from '../lib/singing'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { useLyricsStore } from '../stores/lyricsStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useSettingsStore } from '../stores/settingsStore'

// The words around the spinning record (James, 2026-09-11: "could we have a
// lyrics visualiser option? So you see the record spinning and the words fading
// in and out around it" — the arc; "a cool style option would be at the start
// of the song it just shows the first sentence visualised as it plays" — the
// opening line).
//
// - OPENING: until the first line has been sung, that line is shown big across
//   the record, a word at a time as it goes by. A lyric file times LINES, not
//   words, so the words are spread across the line's own time.
// - THEN THE ARC: the line being sung curves over the top of the record and
//   fades in; the next one waits faintly along the bottom.
//
// ...and since 2026-09-15 a third style, `orbit`, which is a different idea
// rather than a variation on those two: every word of the song written once
// around a ring that turns anti-clockwise under a reading point at the top
// (James: "Anti clockwise rotation of the lyrics around the record so the
// current word is always near the top"). It is all in `Orbit` below and
// `lib/lyricOrbit.ts`; the two older styles are untouched by it.
//
// Synced lyrics only — there is nothing to follow without the times. Drawn
// INSIDE the deck, over the record and under the tonearm (`underArm` — James,
// 2026-09-11: "show them behind the record hand not in front"), centred on the
// frame.

/** How faint the words still to come in a big line are. */
const GHOST = 0.28

// ── The orbit style's numbers ────────────────────────────────────────────────
/** How long the ring takes to reach each new position — see the note on `Orbit`. */
const TURN_MS = 320
/** A turn bigger than this is a jump, not a drift: no transition. */
const SNAP_DEG = 50
/** How far either side of the top a word is perfectly sharp. */
const SHARP_DEG = 26
/** ...and how far round it is gone altogether. */
const VISIBLE_DEG = 150
/** The blur on a word at the very edge of that. */
const MAX_BLUR_PX = 3

export default function LyricsAround({ size }: { size: number }) {
  const track = usePlayerStore(currentTrack)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const sheet = useLyricsStore((s) => s.sheet)
  const lyricsFor = useLyricsStore((s) => s.trackId)
  const status = useLyricsStore((s) => s.status)
  const load = useLyricsStore((s) => s.load)
  const style = useSettingsStore((s) => s.lyricsAroundStyle)
  const reduced = usePrefersReducedMotion()

  // Fetched for the record, whether or not the lyrics list is open.
  useEffect(() => {
    if (track) load(track)
  }, [track, load])

  if (!track || status !== 'ready' || lyricsFor !== track.id || !sheet?.synced) return null
  const lines = sheet.lines
  const active = activeLine(lines, currentSec)
  const first = nextSungLine(lines, -1)
  if (first < 0) return null

  // ── The ring ──
  // ⚠️ Reduced motion gets the ARC instead, not a ring that has stopped
  // turning. The turning IS this style — a still one is the same words parked
  // wherever the song happened to be, half of them upside down at the bottom.
  // The arc says the same thing without moving, which is what was asked for.
  if (style === 'orbit' && !reduced) return <Orbit size={size} lines={lines} currentSec={currentSec} />

  // ── A line big across the record, word by word ──
  // The opening line in the `arc` style; EVERY line in `lines` (James,
  // 2026-09-11: "have the lyrics always like the first line lyrics"). Between
  // lines — before one, or in an instrumental gap — the one coming next waits,
  // its words not yet shown.
  const bigIndex =
    style === 'lines' ? (active >= 0 && lines[active]?.text.trim() ? active : nextSungLine(lines, active)) : active <= first ? first : -1

  if (bigIndex >= 0) {
    const line = lines[bigIndex]
    const start = line.timeSec ?? 0
    const end = lines[bigIndex + 1]?.timeSec ?? start + 4
    const words = line.text.split(/\s+/).filter(Boolean)
    const shown = currentSec < start ? 0 : Math.max(1, Math.min(words.length, Math.ceil(((currentSec - start) / Math.max(0.5, end - start)) * words.length)))
    return (
      <div
        key={`line-${bigIndex}`}
        data-lyrics-around="line"
        aria-hidden
        className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-wrap justify-center gap-x-[0.3em] text-center leading-tight font-bold text-white"
        style={{ top: '50%', width: size * 0.92, fontSize: Math.max(18, Math.min(30, size / 10)), textShadow: '0 2px 10px rgba(0,0,0,.75), 0 0 2px rgba(0,0,0,.9)' }}
      >
        {words.map((word, i) => (
          <span
            key={`${bigIndex}-${i}`}
            style={{
              // The words still to come are a GHOST, not hidden (James,
              // 2026-09-11: "always show a ghost of the coming words from that
              // line in case not in sync") — the line reads whole even when
              // the lyric's timing is off; each word brightens as it is sung.
              opacity: i < shown ? 1 : GHOST,
              transition: reduced ? undefined : 'opacity 320ms ease-out',
            }}
          >
            {word}
          </span>
        ))}
      </div>
    )
  }
  if (style === 'lines') return null

  // ── The arc: now over the top, next along the bottom ──
  const now = lines[active]?.text.trim() ? lines[active].text.trim() : ''
  const nextIndex = nextSungLine(lines, active)
  const next = nextIndex >= 0 ? lines[nextIndex].text.trim() : ''
  // 3, 2, 1 in front of the waiting line before it goes up top — see `countIn`.
  const count = countIn(lines, active, nextIndex, currentSec)
  const box = size + 140
  const c = box / 2
  const topR = size / 2 + 12
  const font = (text: string, radius: number) => Math.max(11, Math.min(16, (Math.PI * radius) / Math.max(1, text.length * 0.56)))
  const topFont = font(now, topR)
  const bottomFont = Math.min(topFont, font(next, size / 2 + 26))
  const bottomR = size / 2 + 8 + bottomFont
  return (
    <svg
      data-lyrics-around="arc"
      aria-hidden
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
      style={{ top: '50%' }}
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
    >
      <defs>
        {/* Over the top, left to right; along the bottom, left to right —
            each drawn so its words stand upright. */}
        <path id="jb-arc-top" d={`M ${c - topR} ${c} A ${topR} ${topR} 0 0 1 ${c + topR} ${c}`} />
        <path id="jb-arc-bottom" d={`M ${c - bottomR} ${c} A ${bottomR} ${bottomR} 0 0 0 ${c + bottomR} ${c}`} />
      </defs>
      {now && (
        <text
          key={`now-${active}`}
          className="fill-slate-800 font-semibold dark:fill-slate-100"
          style={{ fontSize: topFont, animation: reduced ? undefined : 'jb-lyric-in 450ms ease-out both', paintOrder: 'stroke', stroke: 'rgba(255,255,255,.55)', strokeWidth: 3 }}
        >
          <textPath href="#jb-arc-top" startOffset="50%" textAnchor="middle">
            {now}
          </textPath>
        </text>
      )}
      {next && (
        <text
          key={`next-${nextIndex}`}
          className="fill-slate-500 dark:fill-slate-400"
          // A little brighter while it counts in: it is about to be the line.
          style={{ fontSize: bottomFont, opacity: count !== null ? 0.85 : 0.6, animation: reduced ? undefined : 'jb-lyric-in 450ms ease-out both' }}
        >
          <textPath href="#jb-arc-bottom" startOffset="50%" textAnchor="middle">
            {count !== null && (
              <tspan className="fill-orange-600 font-bold dark:fill-orange-400">
                {count}
                {' '}
              </tspan>
            )}
            {next}
          </textPath>
        </text>
      )}
    </svg>
  )
}

/**
 * The words turning anti-clockwise around the record (`lyricsAroundStyle:
 * 'orbit'`) — the geometry is all in `lib/lyricOrbit.ts`; this is the part that
 * puts it on the screen.
 *
 * ⚠️ ONE ELEMENT TURNS, NOT EVERY WORD. Each word is placed once, at its own
 * fixed angle on the ribbon, and the ring around them carries the rotation —
 * so the whole song moves with one `transform`, and every word stays tangent to
 * the circle for free. Writing each word's screen angle instead would be the
 * same picture at forty times the cost.
 *
 * ⚠️ AND IT TURNS ON A CSS TRANSITION, because `currentSec` does not move
 * smoothly. It comes from the audio element's `timeupdate`, which fires about
 * four times a second, so a ring rotated straight from it steps four times a
 * second — the one thing a style built entirely out of motion cannot do. A
 * linear transition a little longer than the gap between ticks turns those
 * steps into the continuous drift this is supposed to be, with no animation
 * frame loop and no extra renders. `snap` is the exception that proves it: a
 * seek, a new song or a swipe between decks moves the ribbon a long way at
 * once, and sliding all the way round to catch up would look like a fault.
 */
function Orbit({ size, lines, currentSec }: { size: number; lines: LyricLine[]; currentSec: number }) {
  const font = Math.max(11, Math.min(18, size / 16))
  const radius = size / 2 + 18
  const ribbon = useMemo(() => orbitRibbon(lines, radius, font, wordWidths(font)), [lines, radius, font])
  const head = orbitHead(ribbon, currentSec)

  // Was the last turn a drift, or a jump? See the note above.
  //
  // ⚠️ Read in the render and written in a layout EFFECT, never written here.
  // A ref written during a render is a ref written twice for every render
  // React throws away — and under StrictMode in development that is every
  // render, so the second pass would compare the head against itself, find no
  // jump, and quietly turn off the one case this exists for.
  const previous = useRef<{ lines: LyricLine[]; head: number } | null>(null)
  const was = previous.current
  const snap = !was || was.lines !== lines || Math.abs(head - was.head) > SNAP_DEG
  useLayoutEffect(() => {
    previous.current = { lines, head }
  })

  if (ribbon.words.length === 0) return null
  return (
    <div
      data-lyrics-around="orbit"
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 h-0 w-0 overflow-visible"
    >
      <div
        className="absolute h-0 w-0"
        style={{
          transform: `rotate(${-head}deg)`,
          transition: snap ? 'none' : `transform ${TURN_MS}ms linear`,
        }}
      >
        {ribbon.words.map((word) => {
          // Clockwise from the top: positive is climbing the right-hand side,
          // negative is falling down the left.
          const at = word.deg - head
          const away = Math.abs(at)
          if (away > VISIBLE_DEG) return null
          // Sharp at the top and softening away from it, so the eye lands where
          // the singing is and the words arriving and leaving are a blur rather
          // than a queue of things to read (James: "perhaps with a blur so it's
          // not so hard").
          //
          // ⚠️ The blur is QUANTISED and not transitioned. A filter that
          // changes by a hair every quarter of a second is a full re-raster of
          // every word on screen, four times a second, for a difference nobody
          // can see; in steps it is redrawn when it visibly changes and left
          // alone otherwise. Opacity is cheap and does transition.
          const out = clamp01((away - SHARP_DEG) / (VISIBLE_DEG - SHARP_DEG))
          const blur = Math.round(out * MAX_BLUR_PX * 4) / 4
          return (
            <span
              key={`${word.line}-${word.index}`}
              className="jb-orbit-word absolute top-0 left-0 font-semibold whitespace-nowrap text-slate-900 dark:text-slate-50"
              style={{
                fontSize: font,
                // Each word: out to its place on the ring, and turned so it
                // lies along it. `translate(-50%,-50%)` first, so what lands on
                // the ring is the middle of the word.
                transform: `translate(-50%,-50%) rotate(${word.deg}deg) translateY(${-radius}px)`,
                opacity: (1 - out) ** 1.25,
                filter: blur > 0 ? `blur(${blur}px)` : undefined,
                transition: snap ? 'none' : `opacity ${TURN_MS}ms linear`,
              }}
            >
              {word.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

import { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef } from 'react'
import { activeLine, type LyricLine } from '../lib/lyrics'
import { orbitHead, orbitRibbon } from '../lib/lyricOrbit'
import { wordWidths } from '../lib/textWidth'
import { countIn } from '../lib/countIn'
import { wordsToDraw, type ShownWords } from '../lib/leavingWords'
import { bottomPath, cornerRadii, isCircle, loopPath, topPath, type Corners } from '../lib/outline'
import { nextSungLine } from '../lib/singing'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { useLyricsStore } from '../stores/lyricsStore'
import { HANDOVER, currentTrack, usePlayerStore } from '../stores/playerStore'
import { useSettingsStore, type LyricsAroundStyle } from '../stores/settingsStore'
import { DeckOutlineContext } from './decks/outline'
import { DeckSlideContext } from './decks/slide'

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
//
// ⚠️ WHEN THE RECORD CHANGES, THE OLD WORDS GO WITH IT (James, 2026-09-15:
// "When the last track moves out on disc change, the lyrics should fade out
// slowly instead of just disappearing"). The player is on the new song while
// the old record is still on its way off the deck, so the old words are frozen
// where they were and faded over the time it takes to go — the whole
// crossfade, or the lift when there is none. `lib/leavingWords.ts` is the rule.

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
/** How far outside the machine the ribbon runs. */
const ORBIT_GAP = 18

/** The machine the words go round: its frame, and whether that is a record. */
interface Shape {
  width: number
  height: number
  corners: Corners
  /** The record — a circle, which `Orbit` and the arc draw as a ring. */
  round: boolean
}

export default function LyricsAround({ size }: { size: number }) {
  const track = usePlayerStore(currentTrack)
  const currentSec = usePlayerStore((s) => s.currentSec)
  // The old record still on the deck while the player has moved on — see the
  // note at the top.
  const leaving = usePlayerStore((s) => s.deckPhase === 'leaving')
  const blendMs = usePlayerStore((s) => s.blend?.ms)
  const sheet = useLyricsStore((s) => s.sheet)
  const lyricsFor = useLyricsStore((s) => s.trackId)
  const status = useLyricsStore((s) => s.status)
  const load = useLyricsStore((s) => s.load)
  const style = useSettingsStore((s) => s.lyricsAroundStyle)
  const reduced = usePrefersReducedMotion()
  // ⚠️ THE MACHINE'S OWN OUTLINE, not a circle (James, 2026-09-15: "check how
  // lyrics are handled for the other type of players e.g. casette and have them
  // follow an appropiate path"). `Deck` says which frame it drew; with nothing
  // to say, the words go round a record as they always did.
  const frame = useContext(DeckOutlineContext)
  const slide = useContext(DeckSlideContext)
  const shape = useMemo<Shape>(() => {
    const width = frame?.width ?? size
    const height = frame?.height ?? size
    const corners = cornerRadii(frame?.radius ?? '50%', width, height)
    return { width, height, corners, round: isCircle(width, height, corners) }
  }, [frame, size])

  // Fetched for the record, whether or not the lyrics list is open.
  useEffect(() => {
    if (track) load(track)
  }, [track, load])

  const live: ShownWords | null =
    track && status === 'ready' && lyricsFor === track.id && sheet?.synced
      ? { trackId: track.id, lines: sheet.lines, sec: currentSec }
      : null
  // The words drawn last: what is left to fade when the record changes. Read
  // here and written after the commit, never during a render — the same rule,
  // for the same reason, as `previous` in `Orbit` below.
  const last = useRef<ShownWords | null>(null)
  const { words, going } = wordsToDraw({ leaving, reduced, live, last: last.current, trackId: track?.id })
  useLayoutEffect(() => {
    if (words && !going) last.current = words
  })

  if (!words) return null
  // Two ways out, one for each way a record leaves:
  //   - a record change the player makes (`going`): frozen, and faded over as
  //     long as the old record takes to go — the whole blend, or the lift;
  //   - ⚠️ A SWIPE (James, 2026-09-15: the lyrics "didn't fade when track leaves
  //     to left"). A swipe changes track only once the record is at the side,
  //     and in that same commit a stand-in covers the deck — so the words rode
  //     off at full strength and were gone in one frame. Faded by how far the
  //     record has gone (`DeckSlide.away`), following the finger, they are gone
  //     by the time it is a peek, and come back if the swipe springs back.
  // During a blend both apply, and the animation wins — CSS animations outrank
  // an inline value.
  const leave: React.CSSProperties | undefined = going
    ? { animation: `jb-lyric-out ${blendMs ?? HANDOVER.LIFT_MS}ms ease-in forwards` }
    : slide
      ? { opacity: 1 - (slide.away ?? 0), transition: slide.animate ? `opacity ${slide.ms ?? 240}ms ease-out` : undefined }
      : undefined
  return (
    // Keyed on the song, so the next song's words start clean rather than
    // inheriting the fade.
    <div key={words.trackId} className="pointer-events-none absolute inset-0" style={leave}>
      <Words size={size} shape={shape} lines={words.lines} currentSec={words.sec} style={style} reduced={reduced} />
    </div>
  )
}

/** One song's words at one moment in it, in the chosen style. */
function Words({ size, shape, lines, currentSec, style, reduced }: {
  size: number
  shape: Shape
  lines: LyricLine[]
  currentSec: number
  style: LyricsAroundStyle
  reduced: boolean
}) {
  const active = activeLine(lines, currentSec)
  const first = nextSungLine(lines, -1)
  if (first < 0) return null

  // ── The ring ──
  // ⚠️ Reduced motion gets the ARC instead, not a ring that has stopped
  // turning. The turning IS this style — a still one is the same words parked
  // wherever the song happened to be, half of them upside down at the bottom.
  // The arc says the same thing without moving, which is what was asked for.
  if (style === 'orbit' && !reduced) {
    return shape.round ? (
      <Orbit size={size} lines={lines} currentSec={currentSec} />
    ) : (
      <PathOrbit size={size} shape={shape} lines={lines} currentSec={currentSec} />
    )
  }

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
  const lineKeys = { nowKey: `now-${active}`, nextKey: `next-${nextIndex}` }
  // Anything that is not a record has the lines along its own outline instead.
  if (!shape.round) {
    return <ArcAround shape={shape} now={now} next={next} count={count} reduced={reduced} {...lineKeys} />
  }
  const box = size + 140
  const c = box / 2
  const topR = size / 2 + 12
  const topFont = arcFont(now, Math.PI * topR)
  const bottomFont = Math.min(topFont, arcFont(next, Math.PI * (size / 2 + 26)))
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
      <ArcWords
        topHref="#jb-arc-top"
        bottomHref="#jb-arc-bottom"
        now={now}
        next={next}
        count={count}
        topFont={topFont}
        bottomFont={bottomFont}
        reduced={reduced}
        {...lineKeys}
      />
    </svg>
  )
}

interface ArcLines {
  /** The line being sung, over the top. */
  now: string
  /** The one waiting, underneath. */
  next: string
  /** 3, 2, 1 in front of the waiting line — `countIn`. */
  count: number | null
  /** Each line's own key, so a new one fades in rather than replacing the old in place. */
  nowKey: string
  nextKey: string
  reduced: boolean
}

/** The arc's two lines, written along whichever paths they are given. */
function ArcWords({ topHref, bottomHref, now, next, count, nowKey, nextKey, topFont, bottomFont, reduced }: ArcLines & {
  topHref: string
  bottomHref: string
  topFont: number
  bottomFont: number
}) {
  return (
    <>
      {now && (
        <text
          key={nowKey}
          className="fill-slate-800 font-semibold dark:fill-slate-100"
          style={{ fontSize: topFont, animation: reduced ? undefined : 'jb-lyric-in 450ms ease-out both', paintOrder: 'stroke', stroke: 'rgba(255,255,255,.55)', strokeWidth: 3 }}
        >
          <textPath href={topHref} startOffset="50%" textAnchor="middle">
            {now}
          </textPath>
        </text>
      )}
      {next && (
        <text
          key={nextKey}
          className="fill-slate-500 dark:fill-slate-400"
          // A little brighter while it counts in: it is about to be the line.
          style={{ fontSize: bottomFont, opacity: count !== null ? 0.85 : 0.6, animation: reduced ? undefined : 'jb-lyric-in 450ms ease-out both' }}
        >
          <textPath href={bottomHref} startOffset="50%" textAnchor="middle">
            {count !== null && (
              <tspan className="fill-orange-600 font-bold dark:fill-orange-400">
                {count}
                {'\u2003'}
              </tspan>
            )}
            {next}
          </textPath>
        </text>
      )}
    </>
  )
}

/**
 * The arc round a machine that is not a record: the line being sung along the
 * top of its outline and the next along the bottom — level across a cassette's
 * long edge and round its corners, over the jukebox's arch.
 *
 * ⚠️ Drawn in the FRAME's own pixels (`lib/outline.ts`), on an SVG that reaches
 * `PAD` beyond the frame on every side and is shifted back by as much, so the
 * paths need no centring of their own.
 */
function ArcAround({ shape, now, next, count, nowKey, nextKey, reduced }: ArcLines & { shape: Shape }) {
  // The old record's words and the new one's can be on the page together, so
  // the paths' ids are this component's own rather than fixed names.
  const id = `jb-arc-${useId().replace(/:/g, '')}`
  const { width, height, corners } = shape
  const PAD = 70
  const top = topPath(width, height, corners, 12)
  const topFont = arcFont(now, top.length)
  const bottomFont = Math.min(topFont, arcFont(next, bottomPath(width, height, corners, 26).length))
  const bottom = bottomPath(width, height, corners, 8 + bottomFont)
  return (
    <svg
      data-lyrics-around="arc"
      aria-hidden
      className="pointer-events-none absolute overflow-visible"
      style={{ left: -PAD, top: -PAD }}
      width={width + 2 * PAD}
      height={height + 2 * PAD}
      viewBox={`${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}`}
    >
      <defs>
        <path id={`${id}-top`} d={top.d} />
        <path id={`${id}-bottom`} d={bottom.d} />
      </defs>
      <ArcWords
        topHref={`#${id}-top`}
        bottomHref={`#${id}-bottom`}
        now={now}
        next={next}
        count={count}
        topFont={topFont}
        bottomFont={bottomFont}
        reduced={reduced}
        nowKey={nowKey}
        nextKey={nextKey}
      />
    </svg>
  )
}

/** How big a line of the arc is set: as large as fits along `lengthPx` of path, from 11 to 16. */
function arcFont(text: string, lengthPx: number): number {
  return Math.max(11, Math.min(16, lengthPx / Math.max(1, text.length * 0.56)))
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
  const font = orbitFont(size)
  const radius = size / 2 + ORBIT_GAP
  const ribbon = useMemo(() => orbitRibbon(lines, radius, font, wordWidths(font)), [lines, radius, font])
  const head = orbitHead(ribbon, currentSec)
  const snap = useSnap(lines, head)

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
          const look = wordLook(word.deg - head)
          if (!look) return null
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
                opacity: look.opacity,
                filter: look.filter,
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

/**
 * The same ribbon, following the outline of a machine that is not a record —
 * the cassette, the CD player, the jukebox, the pocket player (James,
 * 2026-09-15: "check how lyrics are handled for the other type of players e.g.
 * casette and have them follow an appropiate path").
 *
 * ⚠️ NOTHING HERE CAN TURN. A ring carries every word with one rotation (see
 * `Orbit`); a rounded rectangle has no rotation that lays it back on itself. So
 * each word is put ON the outline with CSS `offset-path`, and moved along it
 * with `offset-distance` — which the browser transitions ALONG the path, round
 * the corners, where a transition on a transform would cut across them.
 * `offset-rotate: auto` turns each word to lie along the path wherever it is.
 *
 * ⚠️ THE RIBBON STILL COUNTS IN DEGREES — degrees of the outline, a lap being
 * 360 — so the layout, the pacing and the blur are `Orbit`'s own. `orbitRibbon`
 * is given the radius of the circle whose circumference is the outline's
 * length, which makes a degree the same number of pixels on both.
 */
function PathOrbit({ size, shape, lines, currentSec }: { size: number; shape: Shape; lines: LyricLine[]; currentSec: number }) {
  const font = orbitFont(size)
  const loop = useMemo(() => loopPath(shape.width, shape.height, shape.corners, ORBIT_GAP), [shape])
  const ribbon = useMemo(
    () => orbitRibbon(lines, loop.length / (2 * Math.PI), font, wordWidths(font)),
    [lines, loop, font],
  )
  const head = orbitHead(ribbon, currentSec)
  const snap = useSnap(lines, head)
  const perDeg = loop.length / 360

  if (ribbon.words.length === 0) return null
  return (
    // ⚠️ AT THE FRAME'S TOP-LEFT, and every word at this box's top-left too.
    // The outline is in the frame's pixels from that corner, and a `path()`
    // is laid out from the corner of the box its element is placed in — so
    // with the word, its box and the frame all sharing one corner, the path
    // lands where it was drawn.
    <div data-lyrics-around="orbit" aria-hidden className="pointer-events-none absolute top-0 left-0 h-0 w-0 overflow-visible">
      {ribbon.words.map((word) => {
        const at = word.deg - head
        const look = wordLook(at)
        if (!look) return null
        return (
          <span
            key={`${word.line}-${word.index}`}
            className="jb-orbit-word absolute top-0 left-0 font-semibold whitespace-nowrap text-slate-900 dark:text-slate-50"
            style={{
              fontSize: font,
              offsetPath: `path('${loop.d}')`,
              // The middle of the top is `loop.top` along the outline; a word
              // `at` degrees round from the reading point is that far past it.
              offsetDistance: `${loop.top + at * perDeg}px`,
              offsetRotate: 'auto',
              opacity: look.opacity,
              filter: look.filter,
              transition: snap ? 'none' : `offset-distance ${TURN_MS}ms linear, opacity ${TURN_MS}ms linear`,
            }}
          >
            {word.text}
          </span>
        )
      })}
    </div>
  )
}

/** The ribbon's type size, for a deck `size` pixels across. */
const orbitFont = (size: number) => Math.max(11, Math.min(18, size / 16))

/**
 * Was the last turn a drift, or a jump? See the note on `Orbit`.
 *
 * ⚠️ Read in the render and written in a layout EFFECT, never written here.
 * A ref written during a render is a ref written twice for every render React
 * throws away — and under StrictMode in development that is every render, so
 * the second pass would compare the head against itself, find no jump, and
 * quietly turn off the one case this exists for.
 */
function useSnap(lines: LyricLine[], head: number): boolean {
  const previous = useRef<{ lines: LyricLine[]; head: number } | null>(null)
  const was = previous.current
  const snap = !was || was.lines !== lines || Math.abs(head - was.head) > SNAP_DEG
  useLayoutEffect(() => {
    previous.current = { lines, head }
  })
  return snap
}

/**
 * How a word `at` degrees round from the reading point is drawn — or null,
 * when it is too far round to be drawn at all.
 *
 * Sharp at the top and softening away from it, so the eye lands where the
 * singing is and the words arriving and leaving are a blur rather than a queue
 * of things to read (James: "perhaps with a blur so it's not so hard").
 *
 * ⚠️ The blur is QUANTISED and not transitioned. A filter that changes by a
 * hair every quarter of a second is a full re-raster of every word on screen,
 * four times a second, for a difference nobody can see; in steps it is redrawn
 * when it visibly changes and left alone otherwise. Opacity is cheap and does
 * transition.
 */
function wordLook(at: number): { opacity: number; filter: string | undefined } | null {
  const away = Math.abs(at)
  if (away > VISIBLE_DEG) return null
  const out = clamp01((away - SHARP_DEG) / (VISIBLE_DEG - SHARP_DEG))
  const blur = Math.round(out * MAX_BLUR_PX * 4) / 4
  return { opacity: (1 - out) ** 1.25, filter: blur > 0 ? `blur(${blur}px)` : undefined }
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

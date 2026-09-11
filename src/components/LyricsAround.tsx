import { useEffect } from 'react'
import { activeLine } from '../lib/lyrics'
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
// Synced lyrics only — there is nothing to follow without the times. Drawn
// INSIDE the deck, over the record and under the tonearm (`underArm` — James,
// 2026-09-11: "show them behind the record hand not in front"), centred on the
// frame.

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
              opacity: i < shown ? 1 : 0,
              transform: i < shown || reduced ? 'none' : 'translateY(6px)',
              transition: reduced ? undefined : 'opacity 320ms ease-out, transform 320ms ease-out',
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
        <text key={`next-${nextIndex}`} className="fill-slate-500 dark:fill-slate-400" style={{ fontSize: bottomFont, opacity: 0.6, animation: reduced ? undefined : 'jb-lyric-in 450ms ease-out both' }}>
          <textPath href="#jb-arc-bottom" startOffset="50%" textAnchor="middle">
            {next}
          </textPath>
        </text>
      )}
    </svg>
  )
}

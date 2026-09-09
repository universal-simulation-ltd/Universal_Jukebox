import { describe, expect, it } from 'vitest'
import { activeLine, parseLyrics } from './lyrics'

// The LRC parser, and the four ways it can be wrong without anybody noticing:
// a sheet that follows the music half a second out, a chorus that only appears
// once, a plain sheet mistaken for a timed one, and an `[offset:]` applied
// backwards. None of those look like a failure on screen — they look like
// somebody else's badly made lyric file.
//
// The text below is the doggerel from `scripts/make-fixtures.py`, for the same
// reason it is there: a test needs an exact string, and this is text nobody
// owns.

const LINE_A = 'The arm comes down'
const LINE_B = 'and the dust begins to sing'
const CHORUS = 'Round and round and round'
const LINE_C = 'Side two is where the quiet is'

describe('parseLyrics — plain sheets', () => {
  it('keeps the words and reports itself untimed', () => {
    const sheet = parseLyrics(`${LINE_A}\n${LINE_B}`)
    expect(sheet?.synced).toBe(false)
    expect(sheet?.lines.map((l) => l.text)).toEqual([LINE_A, LINE_B])
    expect(sheet?.lines.every((l) => l.timeSec === null)).toBe(true)
  })

  // A lyric sheet without its stanza breaks is a wall of text, and the breaks
  // are the only structure a plain sheet has.
  it('keeps blank lines in the middle and drops them at the ends', () => {
    const sheet = parseLyrics(`\n\n${LINE_A}\n\n${LINE_C}\n\n`)
    expect(sheet?.lines.map((l) => l.text)).toEqual([LINE_A, '', LINE_C])
  })

  it('is nothing at all for empty or whitespace-only text', () => {
    expect(parseLyrics('')).toBeNull()
    expect(parseLyrics('   \n\n  ')).toBeNull()
  })

  // ⚠️ A stray `[00:00.00]` at the top of an otherwise plain sheet is common,
  // and following it would light one line for the whole song.
  it('does not call a sheet timed on the strength of one timestamp', () => {
    const sheet = parseLyrics(`[00:00.00]${LINE_A}\n${LINE_B}\n${LINE_C}`)
    expect(sheet?.synced).toBe(false)
    expect(sheet?.lines.map((l) => l.text)).toEqual([LINE_A, LINE_B, LINE_C])
  })

  // Half-timed reads as plain on purpose: shown as synced, every untimed line
  // would simply be missing, which is a sheet with holes in it.
  it('treats a half-timed sheet as plain rather than hiding the untimed half', () => {
    const sheet = parseLyrics(`[00:01.00]${LINE_A}\n${LINE_B}\n${LINE_C}\n${LINE_C}`)
    expect(sheet?.synced).toBe(false)
    expect(sheet?.lines).toHaveLength(4)
  })

  // "[Chorus]" and "[Verse 1: Someone]" are section markers a person wrote, not
  // tags. Peeling them off would delete the structure of the sheet.
  it('leaves bracketed section markers in the text', () => {
    const sheet = parseLyrics(`[Chorus]\n${LINE_A}\n[Verse 2: Someone]\n${LINE_B}`)
    expect(sheet?.lines.map((l) => l.text)).toEqual(['[Chorus]', LINE_A, '[Verse 2: Someone]', LINE_B])
  })
})

describe('parseLyrics — timed sheets', () => {
  const sheet = parseLyrics(
    [
      '[ar:The Tone Arms]',
      '[ti:Needle Drop]',
      `[00:01.00]${LINE_A}`,
      `[00:04.50]${LINE_B}`,
      `[00:09.25][00:21.25]${CHORUS}`,
      '[00:14.00]',
      `[00:16.75]${LINE_C}`,
    ].join('\n'),
  )

  it('reads the times and drops the metadata tags', () => {
    expect(sheet?.synced).toBe(true)
    expect(sheet?.lines[0]).toEqual({ timeSec: 1, text: LINE_A })
    expect(sheet?.lines[1]).toEqual({ timeSec: 4.5, text: LINE_B })
    expect(sheet?.lines.some((l) => l.text.includes('The Tone Arms'))).toBe(false)
  })

  // ⚠️ The whole reason the peel loop loops. A chorus is written once and
  // stamped for every time it is sung; taking only the first timestamp leaves
  // the sheet stuck three minutes from the end.
  it('plays a line once per timestamp it carries', () => {
    const chorus = sheet?.lines.filter((l) => l.text === CHORUS) ?? []
    expect(chorus.map((l) => l.timeSec)).toEqual([9.25, 21.25])
  })

  it('puts the lines in time order whatever order they were written in', () => {
    const times = (sheet?.lines ?? []).map((l) => l.timeSec ?? 0)
    expect([...times]).toEqual([...times].sort((a, b) => a - b))
  })

  // An empty timed line is the gap for a solo. It has to survive, or the
  // highlight jumps to the next verse while the guitar is still going.
  it('keeps an empty timed line as a gap', () => {
    expect(sheet?.lines.find((l) => l.timeSec === 14)).toEqual({ timeSec: 14, text: '' })
  })

  it('reads hundredths, thousandths and the old colon form alike', () => {
    const parsed = parseLyrics(`[00:01.5]a\n[00:02.250]b\n[01:03:75]c\n[2:04]d`)
    expect(parsed?.lines.map((l) => l.timeSec)).toEqual([1.5, 2.25, 63.75, 124])
  })

  // ⚠️ The sign. A positive offset means the sheet should appear EARLIER — it
  // is there to correct a sheet that lags — so the correction subtracts. Adding
  // it doubles the error instead of removing it, on the few sheets that carry
  // one, which is why nobody ever catches this.
  it('subtracts a positive offset and adds a negative one', () => {
    const late = parseLyrics(`[offset:+500]\n[00:10.00]a\n[00:20.00]b`)
    expect(late?.lines.map((l) => l.timeSec)).toEqual([9.5, 19.5])
    const early = parseLyrics(`[offset:-500]\n[00:10.00]a\n[00:20.00]b`)
    expect(early?.lines.map((l) => l.timeSec)).toEqual([10.5, 20.5])
  })

  it('never lets an offset push a line before the start of the track', () => {
    const shifted = parseLyrics(`[offset:+5000]\n[00:01.00]a\n[00:20.00]b`)
    expect(shifted?.lines[0].timeSec).toBe(0)
  })

  it('remembers where it came from', () => {
    expect(parseLyrics(`[00:01.00]a\n[00:02.00]b`, 'online')?.source).toBe('online')
    expect(parseLyrics(`${LINE_A}\n${LINE_B}`)?.source).toBe('file')
  })
})

describe('activeLine', () => {
  const lines = [
    { timeSec: 1, text: LINE_A },
    { timeSec: 4.5, text: LINE_B },
    { timeSec: 9.25, text: CHORUS },
  ]

  // ⚠️ The LAST line whose time has passed, never the nearest. "Nearest" lights
  // the next line up before it is sung, which is the single most noticeable way
  // for a lyric panel to be wrong.
  it('is the last line whose time has passed', () => {
    expect(activeLine(lines, 0.5)).toBe(-1)
    expect(activeLine(lines, 1)).toBe(0)
    expect(activeLine(lines, 4.49)).toBe(0)
    expect(activeLine(lines, 4.5)).toBe(1)
    expect(activeLine(lines, 600)).toBe(2)
  })

  it('is nothing before the first line, which is the intro and not an error', () => {
    expect(activeLine(lines, 0)).toBe(-1)
    expect(activeLine([], 30)).toBe(-1)
  })
})

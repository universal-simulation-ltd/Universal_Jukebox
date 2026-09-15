import { describe, expect, it } from 'vitest'
import type { LyricLine } from './lyrics'
import { orbitHead, orbitRibbon } from './lyricOrbit'

const line = (timeSec: number | null, text: string): LyricLine => ({ timeSec, text })

/** A radius and font size that make the arithmetic easy to talk about. */
const R = 160
const F = 16

/** Where a word sits on screen at `sec`, clockwise from the top of the record. */
const screen = (lines: LyricLine[], sec: number, line: number, index: number): number => {
  const ribbon = orbitRibbon(lines, R, F)
  const word = ribbon.words.find((w) => w.line === line && w.index === index)
  if (!word) throw new Error('no such word')
  return word.deg - orbitHead(ribbon, sec)
}

describe('orbitRibbon', () => {
  const sheet = [line(10, 'one two three'), line(14, 'four five'), line(null, 'no time')]

  it('writes every word of every sung line once, in order', () => {
    const { words } = orbitRibbon(sheet, R, F)
    expect(words.map((w) => w.text)).toEqual(['one', 'two', 'three', 'four', 'five'])
    for (let i = 1; i < words.length; i++) expect(words[i].deg).toBeGreaterThan(words[i - 1].deg)
  })

  it('leaves out a line the sheet gave no time to', () => {
    expect(orbitRibbon(sheet, R, F).words.some((w) => w.text === 'no')).toBe(false)
  })

  it('wraps a line further round a smaller record', () => {
    const small = orbitRibbon(sheet, 80, F).lines[0].spanDeg
    const big = orbitRibbon(sheet, 320, F).lines[0].spanDeg
    expect(small).toBeGreaterThan(big * 3.5)
  })

  it('ends a line where the next timed row starts, even a blank one', () => {
    const withGap = [line(10, 'one two'), line(12, ''), line(30, 'after the solo')]
    const [first] = orbitRibbon(withGap, R, F).lines
    expect(first.sungEndSec).toBe(12)
  })

  it('gives an instrumental more ribbon than a line change, up to a limit', () => {
    const tight = orbitRibbon([line(10, 'a'), line(11, 'b')], R, F).lines
    const loose = orbitRibbon([line(10, 'a'), line(11, ''), line(40, 'b')], R, F).lines
    const between = (ls: typeof tight) => ls[1].startDeg - (ls[0].startDeg + ls[0].spanDeg)
    expect(between(loose)).toBeGreaterThan(between(tight))
    // Capped, or a three-minute solo would turn the ring several times over.
    expect(between(loose)).toBeLessThanOrEqual(240 + 18)
  })
})

describe('orbitHead', () => {
  const sheet = [line(10, 'one two three four'), line(14, 'five six seven'), line(18, '')]

  it('turns the ribbon anti-clockwise as the song plays', () => {
    const ribbon = orbitRibbon(sheet, R, F)
    let last = orbitHead(ribbon, 9)
    for (let sec = 9.5; sec <= 20; sec += 0.5) {
      const now = orbitHead(ribbon, sec)
      expect(now).toBeGreaterThanOrEqual(last)
      last = now
    }
    // Anti-clockwise on screen IS the head growing: a word's angle is
    // `deg - head`, so a rising head walks every word towards the top and past
    // it to the left.
    expect(screen(sheet, 10, 0, 0)).toBeGreaterThan(screen(sheet, 13, 0, 0))
  })

  it('has the word being sung near the top', () => {
    // The first word as its line begins, and the last as the line ends.
    expect(Math.abs(screen(sheet, 10, 0, 0))).toBeLessThan(20)
    expect(Math.abs(screen(sheet, 13.9, 0, 3))).toBeLessThan(30)
    expect(Math.abs(screen(sheet, 14, 1, 0))).toBeLessThan(20)
  })

  it('has each line come up from the bottom and leave at the bottom', () => {
    // Well before its line, the second line's first word is down the right.
    expect(screen(sheet, 10, 1, 0)).toBeGreaterThan(70)
    // Well after, the first line's first word is down the left.
    expect(screen(sheet, 17, 0, 0)).toBeLessThan(-70)
  })

  it('parks the opening line off the bottom until the song reaches it', () => {
    expect(screen(sheet, 0, 0, 0)).toBeGreaterThan(100)
    // ...and leans it in over the seconds before it is sung.
    expect(screen(sheet, 8, 0, 0)).toBeLessThan(screen(sheet, 0, 0, 0))
  })

  it('carries the last line away rather than leaving it at the top', () => {
    const ending = [line(10, 'the last line')]
    const ribbon = orbitRibbon(ending, R, F)
    const word = ribbon.words[ribbon.words.length - 1]
    expect(word.deg - orbitHead(ribbon, 30)).toBeLessThan(-100)
  })

  it('never jumps, even where a sheet times one line onto the end of the last', () => {
    const packed = [line(10, 'one two'), line(12, 'three four'), line(14, 'five six'), line(16, '')]
    const ribbon = orbitRibbon(packed, R, F)
    let last = orbitHead(ribbon, 9.9)
    for (let sec = 9.9; sec <= 17; sec += 0.05) {
      const now = orbitHead(ribbon, sec)
      expect(now - last).toBeLessThan(8)
      last = now
    }
  })

  it('answers for a sheet with nothing in it', () => {
    expect(orbitHead(orbitRibbon([], R, F), 12)).toBe(0)
  })
})

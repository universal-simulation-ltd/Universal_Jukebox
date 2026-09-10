import { describe, expect, it } from 'vitest'
import { activeLine, type LyricLine } from './lyrics'
import { LAST_LINE_SEC, firstSungLine, lastSungLine, micPhase, nextSungLine } from './singing'

// What the lyrics panel shows next, and what the microphone is doing.

const sheet: LyricLine[] = [
  { timeSec: 10, text: 'First line' },
  { timeSec: 14, text: 'Second line' },
  { timeSec: 18, text: '' }, // an instrumental gap
  { timeSec: 30, text: 'Third line' },
  { timeSec: 34, text: 'Last line' },
  { timeSec: 40, text: '' }, // the song goes on without words
]

const at = (sec: number, playing = true) => micPhase(sheet, activeLine(sheet, sec), sec, playing)

describe('nextSungLine', () => {
  it('is the first line during the intro, so it is ready before it is sung', () => {
    expect(nextSungLine(sheet, -1)).toBe(0)
  })

  it('is the line after the one being sung', () => {
    expect(nextSungLine(sheet, 0)).toBe(1)
  })

  it('SKIPS an instrumental gap — the next thing to sing, not the next row', () => {
    expect(nextSungLine(sheet, 1)).toBe(3)
  })

  it('is -1 once there is nothing left to sing', () => {
    expect(nextSungLine(sheet, 4)).toBe(-1)
  })
})

describe('first and last sung lines', () => {
  it('ignore blank lines at either end', () => {
    const padded: LyricLine[] = [{ timeSec: 1, text: '' }, ...sheet]
    expect(firstSungLine(padded)).toBe(1)
    expect(lastSungLine(padded)).toBe(5)
  })
})

describe('micPhase', () => {
  it('rests through the intro', () => {
    expect(at(5)).toBe('resting')
  })

  it('sings while a line with words is on', () => {
    expect(at(11)).toBe('singing')
  })

  it('holds still through an instrumental gap', () => {
    expect(at(20)).toBe('holding')
  })

  it('holds still when the music is paused mid-line', () => {
    expect(at(11, false)).toBe('holding')
  })

  it('is dropped once the last sung line is over', () => {
    expect(at(35)).toBe('singing')
    expect(at(41)).toBe('dropped')
  })

  it('drops a few seconds after the last line when nothing timed follows it', () => {
    const noTail = sheet.slice(0, 5)
    const phase = (sec: number) => micPhase(noTail, activeLine(noTail, sec), sec, true)
    expect(phase(34 + LAST_LINE_SEC - 1)).toBe('singing')
    expect(phase(34 + LAST_LINE_SEC)).toBe('dropped')
  })

  it('is picked back up by a seek backwards — nothing has to be reset', () => {
    expect(at(41)).toBe('dropped')
    expect(at(15)).toBe('singing')
  })

  it('rests for a sheet with no words at all', () => {
    const silent: LyricLine[] = [{ timeSec: 0, text: '' }, { timeSec: 5, text: ' ' }]
    expect(micPhase(silent, activeLine(silent, 6), 6, true)).toBe('resting')
  })
})

import { describe, expect, it } from 'vitest'
import { countIn } from './countIn'

// The count-in before the next lyric line goes up top — `countIn.ts`.

const lines = [{ timeSec: 10 }, { timeSec: 12 }, { timeSec: 30 }]

describe('countIn', () => {
  it('counts 3, 2, 1 down to a line after a long wait', () => {
    // Sung line 1 at 12s; the next is at 30s.
    expect(countIn(lines, 1, 2, 26.5)).toBeNull()
    expect(countIn(lines, 1, 2, 27.2)).toBe(3)
    expect(countIn(lines, 1, 2, 28.1)).toBe(2)
    expect(countIn(lines, 1, 2, 29.9)).toBe(1)
    expect(countIn(lines, 1, 2, 30)).toBeNull()
  })

  it('stays quiet between lines that follow each other closely', () => {
    // Line 0 at 10s, line 1 at 12s: a two-second wait is not worth a count.
    expect(countIn(lines, 0, 1, 11)).toBeNull()
  })

  it('has nothing to count to without a next line or its time', () => {
    expect(countIn(lines, 2, -1, 31)).toBeNull()
    expect(countIn([{ timeSec: 1 }, { timeSec: null }], 0, 1, 5)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { linesOf } from './lockLinesAhead'

describe('linesOf', () => {
  it('sends a synced sheet as timed lines, in order', () => {
    expect(
      linesOf({ synced: true, source: 'file', lines: [{ timeSec: 1.5, text: 'One' }, { timeSec: 4, text: '' }] }),
    ).toEqual([{ t: 1.5, text: 'One' }, { t: 4, text: '' }])
  })
  it('sends nothing for a plain sheet or none', () => {
    expect(linesOf({ synced: false, source: 'file', lines: [{ timeSec: null, text: 'One' }] })).toBeNull()
    expect(linesOf(null)).toBeNull()
  })
  it('stops where the timings do, as activeLine does', () => {
    expect(
      linesOf({ synced: true, source: 'file', lines: [{ timeSec: 2, text: 'A' }, { timeSec: null, text: 'B' }, { timeSec: 9, text: 'C' }] }),
    ).toEqual([{ t: 2, text: 'A' }])
  })
})

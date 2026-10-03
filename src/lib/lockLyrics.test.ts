import { describe, expect, it } from 'vitest'
import { lockScreenLine } from './lockLyrics'
import type { LyricSheet } from './lyrics'

const sheet: LyricSheet = {
  synced: true,
  source: 'file',
  lines: [
    { timeSec: 2, text: 'First line' },
    { timeSec: 5, text: '  ' },
    { timeSec: 8, text: ' Second line ' },
  ],
}

describe('lockScreenLine', () => {
  it('is null in the intro, so the artist shows', () => {
    expect(lockScreenLine(sheet, 1)).toBeNull()
  })

  it('is the line being sung, trimmed', () => {
    expect(lockScreenLine(sheet, 3)).toBe('First line')
    expect(lockScreenLine(sheet, 9)).toBe('Second line')
  })

  it('gives the artist back over a blank line', () => {
    expect(lockScreenLine(sheet, 6)).toBeNull()
  })

  it('shows nothing for a sheet without timings, or no sheet', () => {
    expect(lockScreenLine({ ...sheet, synced: false }, 9)).toBeNull()
    expect(lockScreenLine(null, 9)).toBeNull()
  })
})

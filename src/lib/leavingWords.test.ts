import { describe, expect, it } from 'vitest'
import { wordsToDraw, type ShownWords } from './leavingWords'

// The words round the record while it is changed (James, 2026-09-15: "When the
// last track moves out on disc change, the lyrics should fade out slowly
// instead of just disappearing").

const OLD: ShownWords = { trackId: 'old', lines: [], sec: 181 }
const NEW: ShownWords = { trackId: 'new', lines: [], sec: 0.4 }

describe('wordsToDraw', () => {
  it('draws the current song when no record is changing', () => {
    expect(wordsToDraw({ leaving: false, reduced: false, live: NEW, last: OLD, trackId: 'new' }))
      .toEqual({ words: NEW, going: false })
  })

  it('keeps the last song’s words, on their way out, while its record leaves', () => {
    expect(wordsToDraw({ leaving: true, reduced: false, live: null, last: OLD, trackId: 'new' }))
      .toEqual({ words: OLD, going: true })
  })

  it('still does once the new song’s words have loaded — they are not for this record', () => {
    expect(wordsToDraw({ leaving: true, reduced: false, live: NEW, last: OLD, trackId: 'new' }))
      .toEqual({ words: OLD, going: true })
  })

  it('never puts the new song’s words on the record that is leaving', () => {
    // Opened part way through a change, or the old song had no synced words:
    // there is nothing of the old record's to fade, and the new song's words
    // belong on the new record.
    expect(wordsToDraw({ leaving: true, reduced: false, live: NEW, last: null, trackId: 'new' }).words).toBeNull()
    expect(wordsToDraw({ leaving: true, reduced: false, live: NEW, last: NEW, trackId: 'new' }).words).toBeNull()
  })

  it('with reduced motion, takes the old words off at once rather than fading them', () => {
    expect(wordsToDraw({ leaving: true, reduced: true, live: null, last: OLD, trackId: 'new' }))
      .toEqual({ words: null, going: false })
  })
})

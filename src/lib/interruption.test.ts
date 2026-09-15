import { describe, expect, it } from 'vitest'
import { shouldComeBack, TAKEN_GRACE_MS, wasOurs, type ComingBack } from './interruption'

// The two judgements behind "Hey Siri stops the music and it never comes back"
// (James, 2026-09-15). Tested here rather than on the phone because both have a
// failure that is worse than doing nothing — resuming over something else's
// audio, or not resuming at all — and neither shows up as an error anywhere.

describe('was the music ours when it was taken', () => {
  it('yes while it is playing', () => {
    expect(wasOurs(true, 0)).toBe(true)
    expect(wasOurs(true, 999_999)).toBe(true)
  })

  // ⚠️ The race this whole grace window exists for: WebKit pauses the element
  // because iOS interrupted the audio, and iOS tells us it interrupted the
  // audio, and the two arrive in either order. Asking "is it playing" when the
  // pause won answers no — which would mean never coming back, which is the
  // bug.
  it('yes when something outside paused it a moment ago', () => {
    expect(wasOurs(false, 0)).toBe(true)
    expect(wasOurs(false, TAKEN_GRACE_MS - 1)).toBe(true)
  })

  it('no when it has been stopped for a while — that is a person, not Siri', () => {
    expect(wasOurs(false, TAKEN_GRACE_MS)).toBe(false)
    expect(wasOurs(false, 60_000)).toBe(false)
  })
})

function taken(over: Partial<ComingBack> = {}): ComingBack {
  return { ours: true, shouldResume: true, paused: true, loaded: true, ...over }
}

describe('should the music come back', () => {
  it('yes: it was ours, iOS says so, and it is sitting paused with a record on', () => {
    expect(shouldComeBack(taken())).toBe(true)
  })

  it('no when it was never ours — nothing was taken', () => {
    expect(shouldComeBack(taken({ ours: false }))).toBe(false)
  })

  // Ask Siri to play a podcast: our music ended on purpose and the podcast is
  // the music now. Starting ours under it is two things playing at once.
  it('no when iOS says the audio belongs to something else now', () => {
    expect(shouldComeBack(taken({ shouldResume: false }))).toBe(false)
  })

  // ⚠️ The distinction that does the work: a MISSING option is iOS saying
  // nothing, not iOS saying no — and "either way come back on later" is the
  // answer to nothing.
  it('yes when iOS said nothing at all', () => {
    expect(shouldComeBack(taken({ shouldResume: null }))).toBe(true)
    expect(shouldComeBack(taken({ shouldResume: undefined }))).toBe(true)
  })

  it('no when it is already playing — an interruption that stopped nothing', () => {
    expect(shouldComeBack(taken({ paused: false }))).toBe(false)
  })

  it('no when there is no record on to come back to', () => {
    expect(shouldComeBack(taken({ loaded: false }))).toBe(false)
  })

  it('every reason to stand down beats every reason to play', () => {
    for (const off of [{ ours: false }, { shouldResume: false }, { paused: false }, { loaded: false }]) {
      expect(shouldComeBack(taken(off))).toBe(false)
    }
  })
})

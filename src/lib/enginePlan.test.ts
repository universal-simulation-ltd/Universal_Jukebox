import { describe, expect, it } from 'vitest'
import {
  crossfadeTiming,
  introHoldFor,
  outroLeadFor,
  transitionFor,
  upcomingCursors,
  type ChangeoverTimes,
  type LeadLimits,
} from './enginePlan'
import { INTRO_HOLD_MAX, INTRO_MIN } from './intro'
import { OUTRO_LEAD_MAX, OUTRO_MIN } from './outro'
import { planHandover } from './transition'

// ⚠️ `JukeboxEngine.swift` (`EngineMaths`) mirrors `crossfadeTiming` and the two
// thresholds. The table in the third block is quoted in its comment; change
// one side, change both.

const TIMES: ChangeoverTimes = {
  SEC: 1.8,
  MANUAL_SEC: 1.2,
  RECORD_SEC: 4.5,
  RECORD_MANUAL_SEC: 1.5,
  SHAPE: 'staggered',
  LIFT_MS: 420,
  FADE_OUT_SEC: 0.32,
  FADE_IN_SEC: 0.55,
  NEEDLE_RETURN_MS: 380,
}

const LIMITS: LeadLimits = {
  introMin: INTRO_MIN,
  introHoldMax: INTRO_HOLD_MAX,
  introMax: 6,
  outroMin: OUTRO_MIN,
  outroLeadMax: OUTRO_LEAD_MAX,
  outroMax: 8,
}

describe('the change-overs the engine is handed', () => {
  it('a blend within an album: the pickup returns, the cue once it is back, a lead-out blend for a skip', () => {
    const plan = planHandover({ mode: 'always', reducedMotion: false, change: 'track', recordCrossfade: true })
    const auto = transitionFor(plan, TIMES, 'auto')
    expect(auto).toMatchObject({ kind: 'crossfade', blendSec: 1.8, manualSec: 1.2, curve: 'staggered', cue: true })
    expect(auto.cueDelaySec).toBeCloseTo(0.38)
    // If the song has already ended there is nothing to blend with: a needle change.
    expect(auto.gapSec).toBeCloseTo(0.42)
    expect(auto.duckSec).toBe(0)
    const skip = transitionFor(plan, TIMES, 'skip')
    expect(skip).toMatchObject({ kind: 'crossfade', blendSec: 1.2, curve: 'lead-out' })
  })

  it('a blend across records starts the cue with the blend, and uses the record lengths', () => {
    const plan = planHandover({ mode: 'always', reducedMotion: false, change: 'album', recordCrossfade: true })
    expect(transitionFor(plan, TIMES, 'auto')).toMatchObject({ kind: 'crossfade', blendSec: 4.5, manualSec: 1.5, cueDelaySec: 0 })
    expect(transitionFor(plan, TIMES, 'skip')).toMatchObject({ blendSec: 1.5, manualSec: 1.5 })
  })

  it('a record change without the record crossfade: gap, cue at landing, and a duck only for a skip', () => {
    const plan = planHandover({ mode: 'always', reducedMotion: false, change: 'album', recordCrossfade: false })
    const auto = transitionFor(plan, TIMES, 'auto')
    expect(auto).toMatchObject({ kind: 'change', fadeInSec: 0.55, duckSec: 0, cue: true, cueDelaySec: 0 })
    expect(auto.gapSec).toBeCloseTo(0.42)
    expect(transitionFor(plan, TIMES, 'skip').duckSec).toBeCloseTo(0.32)
  })

  it('animation off: still blends within an album, but a record change is a plain cut with the user’s own fade-in', () => {
    const blend = planHandover({ mode: 'off', reducedMotion: false, change: 'track', recordCrossfade: false })
    expect(transitionFor(blend, TIMES, 'auto')).toMatchObject({ kind: 'crossfade', gapSec: 0, cue: false })
    const cut = planHandover({ mode: 'off', reducedMotion: false, change: 'album', recordCrossfade: false })
    expect(transitionFor(cut, TIMES, 'auto')).toMatchObject({ kind: 'cut', gapSec: 0, fadeInSec: null, cue: false })
  })
})

describe('when the end-of-song crossfade starts (mirrored in JukeboxEngine.swift)', () => {
  const t = { blendSec: 1.8, manualSec: 1.2 }

  it('a breath of quiet is not an intro, and unmeasured songs hold nothing', () => {
    expect(introHoldFor(null, LIMITS)).toBe(0)
    expect(introHoldFor(0.8, LIMITS)).toBe(0)
    expect(introHoldFor(3, LIMITS)).toBe(3)
    expect(introHoldFor(20, LIMITS)).toBe(6)
    expect(introHoldFor(5, { ...LIMITS, introMax: 2 })).toBe(2)
    expect(outroLeadFor(null, LIMITS)).toBe(0)
    expect(outroLeadFor(1, LIMITS)).toBe(0)
    expect(outroLeadFor(4, LIMITS)).toBe(4)
    expect(outroLeadFor(30, LIMITS)).toBe(8)
  })

  // remaining, intro, outro → lead, blend, hold. This table is quoted in the Swift.
  it.each([
    [10, null, null, 1.8, 1.8, 0],
    [10, 3, null, 4.8, 4.8, 3],
    [10, 3, 4, 8.8, 4.8, 3],
    [2, 3, null, 4.8, 2, 0.8],
    [0.3, null, null, 1.8, 0.6, 0],
  ])('remaining %s, intro %s, outro %s', (remaining, intro, outro, lead, blend, hold) => {
    const out = crossfadeTiming(t, intro, outro, remaining, LIMITS)
    expect(out.lead).toBeCloseTo(lead)
    expect(out.blendSec).toBeCloseTo(blend)
    expect(out.holdSec).toBeCloseTo(hold)
  })
})

describe('the queue the engine runs on', () => {
  it('stops at the end with repeat off', () => {
    expect(upcomingCursors(5, 1, 'off', 50)).toEqual([2, 3, 4])
    expect(upcomingCursors(5, 4, 'off', 50)).toEqual([])
  })

  it('sends one turn of a repeating queue, ending on the song before this one', () => {
    expect(upcomingCursors(5, 3, 'all', 50)).toEqual([4, 0, 1, 2])
    expect(upcomingCursors(5, 3, 'one', 50)).toEqual([4, 0, 1, 2])
    expect(upcomingCursors(1, 0, 'all', 50)).toEqual([])
  })

  it('never more than asked, and nothing for an empty or unplaced queue', () => {
    expect(upcomingCursors(200, 0, 'off', 50)).toHaveLength(50)
    expect(upcomingCursors(0, 0, 'all', 50)).toEqual([])
    expect(upcomingCursors(4, -1, 'all', 50)).toEqual([])
  })
})

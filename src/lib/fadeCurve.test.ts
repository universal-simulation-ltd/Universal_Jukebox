import { describe, expect, it } from 'vitest'
import { fadeLevel, LEAD_OUT } from './fadeCurve'

describe('fadeLevel', () => {
  it('starts and ends where it is told, both ways', () => {
    for (const curve of ['linear', 'equal-power'] as const) {
      expect(fadeLevel(0, 1, 0, curve)).toBeCloseTo(0)
      expect(fadeLevel(0, 1, 1, curve)).toBeCloseTo(1)
      expect(fadeLevel(1, 0, 0, curve)).toBeCloseTo(1)
      expect(fadeLevel(1, 0, 1, curve)).toBeCloseTo(0)
    }
  })

  it('a crossfade holds the loudness of one track all the way across', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const rising = fadeLevel(0, 1, t, 'equal-power')
      const falling = fadeLevel(1, 0, t, 'equal-power')
      expect(rising ** 2 + falling ** 2).toBeCloseTo(1, 6)
    }
  })

  it('keeps the old track up early on — it no longer falls away before the next arrives', () => {
    // It used to be 1 − √0.25 = 0.5 a quarter of the way through.
    expect(fadeLevel(1, 0, 0.25, 'equal-power')).toBeGreaterThan(0.9)
    expect(fadeLevel(1, 0, 0.5, 'equal-power')).toBeCloseTo(Math.SQRT1_2, 6)
  })

  it('only ever moves one way, and clamps t', () => {
    let last = 1
    for (let t = 0; t <= 1; t += 0.1) {
      const v = fadeLevel(1, 0, t, 'equal-power')
      expect(v).toBeLessThanOrEqual(last + 1e-12)
      last = v
    }
    expect(fadeLevel(0, 1, 2, 'equal-power')).toBeCloseTo(1)
    expect(fadeLevel(0, 1, -1, 'equal-power')).toBeCloseTo(0)
  })
})

// The crossfade's own pair since 2026-09-13 (James: "first track goes more
// quiet until the second track kicks in so it's less harsh").
describe('staggered', () => {
  it('starts and ends where it is told, both ways', () => {
    expect(fadeLevel(0, 1, 0, 'staggered')).toBeCloseTo(0)
    expect(fadeLevel(0, 1, 1, 'staggered')).toBeCloseTo(1)
    expect(fadeLevel(1, 0, 0, 'staggered')).toBeCloseTo(1)
    expect(fadeLevel(1, 0, 1, 'staggered')).toBeCloseTo(0)
  })

  it('the next song is not heard until a quarter of the way in', () => {
    expect(fadeLevel(0, 1, 0.2, 'staggered')).toBe(0)
    expect(fadeLevel(0, 1, 0.3, 'staggered')).toBeGreaterThan(0)
  })

  it('the song ending is gone by three quarters of the way', () => {
    expect(fadeLevel(1, 0, 0.75, 'staggered')).toBeCloseTo(0, 6)
    expect(fadeLevel(1, 0, 0.9, 'staggered')).toBeCloseTo(0, 6)
  })

  it('half-way, each is at half — quieter together than equal power’s 71%', () => {
    expect(fadeLevel(1, 0, 0.5, 'staggered')).toBeCloseTo(0.5, 6)
    expect(fadeLevel(0, 1, 0.5, 'staggered')).toBeCloseTo(0.5, 6)
    expect(fadeLevel(1, 0, 0.5, 'staggered')).toBeLessThan(fadeLevel(1, 0, 0.5, 'equal-power'))
  })

  it('never leaves a hole: one of the two is always well up', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(Math.max(fadeLevel(0, 1, t, 'staggered'), fadeLevel(1, 0, t, 'staggered'))).toBeGreaterThanOrEqual(0.5 - 1e-9)
    }
  })
})

// The SKIP's own pair since 2026-09-15 (James: "if I have a queue and then skip
// to the next track it's choppy … track one should be quieter at X when track
// two gets louder at Y. Then after the crossover track one should continue to
// get quieter until 0 whilst track two continues to get louder to its correct
// volume").
describe('lead-out', () => {
  const rising = (t: number) => fadeLevel(0, 1, t, 'lead-out')
  const falling = (t: number) => fadeLevel(1, 0, t, 'lead-out')

  it('starts and ends where it is told, both ways', () => {
    expect(rising(0)).toBeCloseTo(0)
    expect(rising(1)).toBeCloseTo(1)
    expect(falling(0)).toBeCloseTo(1)
    expect(falling(1)).toBeCloseTo(0)
  })

  it('the next song is heard from the very first tick — a skip is not made to wait', () => {
    // The whole reason a skip cannot use `staggered`, which is silent here.
    expect(rising(0.05)).toBeGreaterThan(0)
    expect(fadeLevel(0, 1, 0.05, 'staggered')).toBe(0)
  })

  it('the song leaving is DOWN before the one arriving is up', () => {
    // Track one quieter at X while track two is still climbing to Y.
    expect(falling(0.25)).toBeLessThan(fadeLevel(1, 0, 0.25, 'equal-power'))
    expect(falling(0.5)).toBeLessThan(rising(0.5))
  })

  it('they cross early, and both carry on past it to their ends', () => {
    // A crossover in the first half…
    const crossed = Array.from({ length: 21 }, (_, i) => i / 20).find((t) => rising(t) >= falling(t))
    expect(crossed).toBeDefined()
    expect(crossed!).toBeLessThan(0.5)
    // …after which one keeps falling to 0 and the other keeps rising to full.
    expect(falling(0.6)).toBeLessThan(falling(crossed!))
    expect(rising(0.6)).toBeGreaterThan(rising(crossed!))
    expect(falling(1)).toBeCloseTo(0, 6)
    expect(rising(1)).toBeCloseTo(1, 6)
  })

  it('the song leaving is silent before the blend ends, not cut off at it', () => {
    expect(falling(1 - LEAD_OUT)).toBeCloseTo(0, 6)
    expect(falling(0.9)).toBeCloseTo(0, 6)
  })

  it('never leaves a hole: one of the two is always well up', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(Math.max(rising(t), falling(t))).toBeGreaterThanOrEqual(0.5 - 1e-9)
    }
  })

  it('only ever moves one way, and clamps t', () => {
    let last = 1
    for (let t = 0; t <= 1; t += 0.05) {
      expect(falling(t)).toBeLessThanOrEqual(last + 1e-12)
      last = falling(t)
    }
    expect(fadeLevel(0, 1, 2, 'lead-out')).toBeCloseTo(1)
    expect(fadeLevel(1, 0, -1, 'lead-out')).toBeCloseTo(1)
  })
})

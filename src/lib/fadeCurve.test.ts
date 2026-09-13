import { describe, expect, it } from 'vitest'
import { fadeLevel } from './fadeCurve'

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
